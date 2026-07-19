# 交易订单表设计

交易订单由 `trade_order`、`trade_order_item` 和 `trade_order_shipping_address` 三张表组成。主表保存订单聚合状态与金额，商品行保存成交快照，地址表保存实物配送快照。

## 设计边界

- 一张订单只属于一个会员、一个店铺和一种履约类型。同一次购物车提交通过 `checkout_no` 关联拆分后的订单。
- 首版结算只允许实物商品，创建 `fulfillment_type = 1` 的订单；数字交付和到店服务保留类型值但不开放创建。
- `member_id`、`shop_id`、`source_cart_id`、`spu_id`、`sku_id` 和 `source_address_id` 是跨领域逻辑引用，不建立数据库外键。
- `trade_order_item` 和 `trade_order_shipping_address` 属于交易订单聚合内部，使用外键关联 `trade_order`。
- 订单及成交快照是交易事实，不使用软删除。未支付订单关闭通过状态和原因表达，不能删除历史记录。
- 商品行和地址快照创建后不可改写。商品改名、调价、下架或会员修改地址都不能改变历史订单。

## 订单主表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_no` | `varchar(64)` | 面向用户和运营的全局唯一订单号 |
| `checkout_no` | `varchar(64)` | 同一次结算提交编号和幂等键 |
| `request_hash` | `varchar(64)` | 规范化提交载荷的 SHA-256 十六进制哈希 |
| `member_id` | `bigint` | 下单会员逻辑 ID |
| `shop_id` | `bigint` | 成交店铺逻辑 ID |
| `source_cart_id` | `bigint` | 来源购物车逻辑 ID |
| `fulfillment_type` | `smallint` | `1` 实物配送、`2` 数字交付、`3` 到店服务 |
| `currency_code` | `varchar(3)` | ISO 4217 币种，首期为 `CNY` |
| `goods_amount_fen` | `bigint` | 商品行原价合计，单位为分 |
| `discount_amount_fen` | `bigint` | 优惠合计，首期为 `0` |
| `shipping_amount_fen` | `bigint` | 运费，首期为 `0` |
| `payable_amount_fen` | `bigint` | 应付金额 |
| `paid_amount_fen` | `bigint` | 已支付金额，支付接入前为 `0` |
| `buyer_remark` | `varchar(500)` | 可选买家备注 |
| `status` | `smallint` | 订单生命周期状态 |
| 里程碑时间 | `timestamptz(3)` | 提交、支付、履约、完成与关闭时间 |
| `version` | `integer` | 状态并发更新使用的乐观锁 |
| 审计字段 | - | 遵循数据库固定字段规范 |

金额恒等式由数据库保证：

```text
payable_amount_fen = goods_amount_fen - discount_amount_fen + shipping_amount_fen
```

Service 创建订单时还必须校验：订单商品行的原价、优惠和应付合计分别等于主表金额。跨行合计不能只依赖前端提交值。

### 状态

| 值 | 名称 | 必需时间 | 说明 |
| --- | --- | --- | --- |
| `0` | 待支付 | `payment_expires_at` | 仅应付金额大于 0 的订单可进入 |
| `1` | 待履约 | `paid_at` | 已全额支付或已确认零元订单 |
| `2` | 履约中 | `paid_at`、`fulfillment_started_at` | 仓库、数字交付或服务履约已开始 |
| `3` | 已完成 | 再增加 `completed_at` | 履约完成 |
| `4` | 已关闭 | `payment_expires_at`、`closed_at`、`close_reason_code` | 未支付订单已终止，不再允许支付 |

### 状态迁移

```text
0 待支付 ──支付成功──> 1 待履约 ──开始履约──> 2 履约中 ──履约完成──> 3 已完成
    └──用户取消 / 支付超时 / 商家或系统关闭──> 4 已关闭
```

- 应付金额大于 `0` 的新订单进入 `0`；零元订单确认免支付后直接进入 `1`。
- 首版只允许 `0 → 1`、`0 → 4`、`1 → 2` 和 `2 → 3`，其他迁移全部拒绝。
- Service 更新时同时匹配 `id + expected_status + version`，成功后递增 `version`。关闭时保留原 `payment_expires_at`；同状态重试返回当前结果，不重复写入里程碑时间。
- 数据库约束只验证单行最终快照，不能代替 Service 的迁移白名单。
- 支付后取消、退款和售后不使用状态 `4`。接入相关能力时新增支付、退款和售后聚合，再按业务事实扩展订单状态机。

### 关闭原因

| 值 | 名称 | 使用场景 |
| --- | --- | --- |
| `1` | 用户取消 | 用户在支付前主动关闭订单 |
| `2` | 支付超时 | 超时任务关闭未支付订单 |
| `3` | 商家关闭 | 商家因明确业务原因关闭未支付订单 |
| `4` | 风控关闭 | 风控规则拒绝继续支付 |
| `5` | 系统异常 | 无法安全继续交易时由系统关闭 |

`close_reason_code` 是必填稳定代码，`close_reason` 只保存可选补充说明。用户界面根据代码映射稳定文案，不能直接展示内部异常详情。

## 商品行快照

`trade_order_item` 保存来源购物车项、商品与 SKU 逻辑 ID，以及商品类型、名称、SKU 编码、规格、主图、成交单价和数量快照。

```text
line_amount_fen = unit_price_fen * quantity
payable_amount_fen = line_amount_fen - discount_amount_fen
```

`source_cart_item_id` 全局唯一，数据库直接阻止重试或并发提交重复消费同一购物车项。订单创建事务必须重新读取并锁定购物车项，批量校验商品状态、实时价格与库存，再使用服务端计算的金额写入订单。

## 收货地址快照

`trade_order_shipping_address` 与实物订单一对一。它完整复制收货人、手机号、国家、省市区代码和名称、详细地址及邮编，并记录来源地址 ID 与版本。

来源地址只用于创建时校验和审计。订单查询、履约与售后必须读取地址快照，不能回查 `member_shipping_address`。收货信息属于个人信息，日志、监控、运营列表和导出必须按最小必要原则脱敏。

数据库不能通过普通外键强制 `fulfillment_type = 1` 的订单必须存在地址快照。订单 Service 必须在同一事务中插入主表、全部商品行、地址快照和库存预占，任一失败时整体回滚。

## 幂等、并发与库存

- `(checkout_no, shop_id, fulfillment_type)` 唯一，保证同一次提交重试不会重复创建同一店铺履约订单。
- HTTP `Idempotency-Key` 由订单 API 校验后原样映射为 `checkout_no`。服务端按稳定字段顺序规范化提交载荷并计算 SHA-256，保存到 `request_hash`；同一个键只有在哈希相同时才能返回原结果，哈希不同时返回幂等冲突。
- `order_no` 全局唯一，只由服务端生成；前端不能生成或伪造成功订单号。
- 订单状态更新携带旧 `version` 并递增版本，防止支付回调、取消任务和后台操作互相覆盖。
- 跟踪库存 SKU 使用 `inventory_reservation.order_id/order_item_id` 关联本订单。创建订单、预占库存、写库存流水和关闭购物车必须处于同一本地事务。
- 多店铺提交任一店铺失败时，首版整体回滚，不留下部分成功订单。

多店铺提交的 API 成功响应应返回 `checkoutNo` 和 `orders[]`，数组中包含每张拆分订单的 ID、订单号和状态。单个 `orderNo` 无法表达购物车现有的跨店铺结算能力。

## 查询索引

- `order_no`：用户、客服和支付回调按订单号定位。
- `(checkout_no, shop_id, fulfillment_type)`：提交幂等和结算拆单查询。
- `(member_id, created_at DESC, id DESC)`：会员订单列表。
- `(shop_id, status, created_at DESC, id DESC)`：商家订单管理。
- 待支付部分索引：超时关闭任务。
- `trade_order_item.source_cart_item_id`：防止购物车项重复下单。
- `(sku_id, created_at DESC, id DESC)`：商品成交记录和评价资格校验。

## 暂不包含

- 支付与退款流水
- 促销、优惠券和发票
- 物流包裹、运单和轨迹
- 售后单与退款状态
- 数字商品交付凭证与到店预约
- 订单状态变更流水

这些能力使用独立表扩展，不能把外部流水号和大量可空字段持续堆入 `trade_order`。

## 初始化与验证

建表脚本位于 [`database/init/023-create-trade-order.sql`](init/023-create-trade-order.sql)。已有本地数据库执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/023-create-trade-order.sql
```

Docker 官方 PostgreSQL 镜像只会在数据目录首次初始化时自动执行 `database/init` 下的脚本。
