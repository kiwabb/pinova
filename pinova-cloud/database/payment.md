# 支付表设计

支付域由 `payment_order` 和 `payment_order_trade_order` 组成。支付单按一次 `checkout_no` 聚合，可关联结算拆分出的多张店铺订单。

## 状态

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `0` | 待支付 | 渠道支付单已创建，等待结果 |
| `1` | 支付成功 | 渠道、订单和库存结果已在本地事务中确认 |
| `2` | 支付失败 | 本次尝试失败，可重启同一业务支付单 |
| `3` | 已关闭 | 支付超时，订单关闭且库存预占已释放 |
| `4` | 需人工处理 | 渠道确认成功，但本地订单或库存无法安全推进 |

`checkout_no` 全局唯一。失败后重新发起不新增 `payment_order`，而是递增 `attempt_count` 并更换渠道交易号。渠道交易号使用 `(provider_code, provider_transaction_no)` 部分唯一索引。

## 金额与关联

- `amount_fen` 是本次结算中所有正金额待支付订单的服务端应付合计。
- `payment_order_trade_order.order_amount_fen` 保存关联订单支付金额快照。
- 关联表对支付单使用外键；`trade_order_id` 是跨交易域逻辑引用，不建立外键。
- 首期币种固定为 `CNY`，金额单位为分且必须大于零。

## 并发与事务

创建支付、处理支付结果和超时关闭都先对 `checkout_no` 获取 PostgreSQL 事务级 advisory lock，再按支付单、订单、库存预占、库存余额的顺序锁行。

支付成功在同一本地事务中完成：

```text
payment_order 0/2 -> 1
trade_order 0 -> 1
inventory_reservation 0 -> 1
inventory_stock.on_hand_quantity -= quantity
inventory_stock.reserved_quantity -= quantity
insert inventory_ledger(change_type = 2)
```

任一步失败时全部回滚。渠道已经确认成功但本地无法推进时，使用独立事务把支付单标记为 `4`，禁止用户重复付款。

超时关闭在同一事务中关闭本次结算的待支付订单、释放预占并写 `change_type = 4` 的库存流水。

## 模拟渠道

`MOCK` 只用于本地和测试环境。必须显式设置 `PINOVA_PAYMENT_MOCK_ENABLED=true`，并且 Spring profile 不能是 `prod`。模拟成功和失败仍经过统一渠道查询与支付结果处理器，不能直接修改订单状态。

建表脚本位于 `database/init/025-create-payment-order.sql`。
