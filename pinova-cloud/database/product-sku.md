# 商品 SKU 表设计

`pinova.product_sku` 保存可定价、可销售的最小商品单元。SPU 表示用户认知中的商品，SKU 表示具体可购买组合。当前 Demo 没有颜色、尺寸等规格，每个 SPU 先创建一个默认 SKU；规格模板和 SKU 规格关系后续按真实业务需要增加。

## 核心规则

- `sale_price_fen` 使用 `bigint` 保存人民币分，不使用浮点数。价格允许为 `0`，免费商品仍需经过明确的购买流程。
- `sku_code` 在同一 SPU 内唯一且删除后不复用。
- 上架 SPU 至少存在一个启用、未删除的 SKU；该跨表规则由 Service 在上架时校验。
- SKU 停用不会删除历史订单快照，但不能继续加入购物车或创建订单。
- `main_image_key` 为空时回退使用 SPU 主图；完整的 SKU 图集由 [`product_media`](product-media.md) 保存。
- 条码存在时全平台唯一，避免仓库扫描出现歧义。

## 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigint` | 应用生成的 SKU 主键 |
| `spu_id` | `bigint` | 所属 SPU 主键 |
| `sku_code` | `varchar(64)` | SPU 内稳定业务编码 |
| `spec_summary` | `varchar(255)` | 规格摘要；默认 SKU 可为空 |
| `sale_price_fen` | `bigint` | 基础销售价，单位为分 |
| `inventory_mode` | `smallint` | 可售库存的判断模式 |
| `main_image_key` | `varchar(512)` | SKU 主图对象 Key |
| `barcode` | `varchar(64)` | 可选商品条码 |
| `status` | `smallint` | `0` 停用、`1` 启用 |
| `sort_order` | `integer` | SPU 内展示顺序 |
| `version` | `integer` | 乐观锁版本号 |
| 软删除与审计字段 | - | 遵循数据库固定字段规范 |

## 库存模式

| 值 | 名称 | 使用场景 |
| --- | --- | --- |
| `1` | 跟踪库存 | 实物商品，从 `inventory_stock` 计算可售量 |
| `2` | 无限库存 | 无数量限制的虚拟商品 |
| `3` | 预约容量 | 到店体验等服务商品，由后续预约容量域判断可售性 |

库存模式只决定可售性来源，不在 SKU 表保存库存数量。

## 前台价格

商品列表的 `priceFen` 取启用 SKU 的最低 `sale_price_fen`。当前不设计划线价；促销、会员价和优惠后的成交价属于后续定价域，不能直接覆盖 SKU 基础销售价。

## 初始化

建表脚本位于 [`database/init/010-create-product-sku.sql`](init/010-create-product-sku.sql)：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/010-create-product-sku.sql
```

Demo 默认 SKU、价格、仓库和初始库存位于 [`database/init/015-seed-product-sku-inventory.sql`](init/015-seed-product-sku-inventory.sql)。脚本按业务编码幂等写入：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/015-seed-product-sku-inventory.sql
```

商品媒体和 SKU 专属图集设计见 [`database/product-media.md`](product-media.md)。
