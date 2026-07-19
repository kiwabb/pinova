# 库存模型设计

库存域由 `warehouse`、`inventory_stock`、`inventory_reservation` 和 `inventory_ledger` 四张表组成。

| 表 | 核心字段 | 职责 |
| --- | --- | --- |
| `warehouse` | `shop_id`、`warehouse_code`、`warehouse_type` | 定义仓库或门店库存节点 |
| `inventory_stock` | `warehouse_id`、`sku_id`、两个数量字段 | 保存当前库存余额 |
| `inventory_reservation` | `stock_id`、订单逻辑 ID、数量、状态、过期时间 | 保存订单库存锁定状态 |
| `inventory_ledger` | 两个数量差值、变更后余额、来源业务 | 保存不可变库存事实流水 |

## 边界

- `warehouse`、库存余额、预占和流水同属库存域，边界内部使用数据库外键。
- `inventory_stock.sku_id` 是商品域 SKU 的逻辑引用，不建立跨域数据库外键。
- 预占记录中的订单 ID 是交易域逻辑引用，不建立跨域数据库外键。
- `shop_id` 表示仓库的业务归属，不是 `tenant_id`。

## 库存余额

每个仓库和 SKU 只有一条 `inventory_stock`：

```text
available_quantity = on_hand_quantity - reserved_quantity
```

数据库不保存 `available_quantity`，避免三个库存数字发生不一致。所有余额更新必须携带 `version` 并在同一事务中写入库存流水。

预占库存使用条件更新，不能先查询再无条件扣减：

```sql
UPDATE pinova.inventory_stock
SET reserved_quantity = reserved_quantity + :quantity,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = :operator_id
WHERE id = :stock_id
  AND version = :version
  AND on_hand_quantity - reserved_quantity >= :quantity;
```

受影响行数为 `0` 表示库存不足或并发版本冲突。

## 预占状态

| 值 | 名称 | 余额变化 |
| --- | --- | --- |
| `0` | 已预占 | `reserved_quantity + quantity` |
| `1` | 已扣减 | `on_hand_quantity - quantity` 且 `reserved_quantity - quantity` |
| `2` | 已释放 | `reserved_quantity - quantity` |
| `3` | 已过期 | `reserved_quantity - quantity` |

创建预占、更新余额和写入流水必须在同一本地事务中完成。`reservation_no` 是幂等键；支付回调、取消订单和过期任务重复执行时不能重复扣减或释放。

## 库存流水

`inventory_ledger` 是不可变事实记录，不使用软删除。每次余额变化保存两个差值和变更后余额：

- 入库、盘盈：`on_hand_delta > 0`；
- 出库、盘亏：`on_hand_delta < 0`；
- 预占：`reserved_delta > 0`；
- 释放：`reserved_delta < 0`；
- 预占转实际扣减：两个差值都为负数。

`transaction_no` 是流水幂等键。流水创建后禁止更新或删除；纠错使用新的反向流水。

## 查询状态

跟踪库存 SKU 的前台 `stock` 由所有启用仓库的可售量汇总：

```text
总可售量 <= 0       -> sold_out
总可售量 <= 预警阈值 -> low_stock
其他                 -> in_stock
```

预警阈值属于店铺或 SKU 库存策略，不写死在余额表。

## 初始化

按顺序执行：

```bash
for script in \
  database/init/011-create-warehouse.sql \
  database/init/012-create-inventory-stock.sql \
  database/init/013-create-inventory-reservation.sql \
  database/init/014-create-inventory-ledger.sql
do
  docker compose exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U pinova -d pinova < "$script"
done
```

表结构建立后执行 [`database/init/015-seed-product-sku-inventory.sql`](init/015-seed-product-sku-inventory.sql)，可创建本地 Demo 默认仓库、库存余额及对应入库流水。
