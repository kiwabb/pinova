# 规划并实现前端下单流程

## Goal

在现有真实购物车、会员登录、商品价格与收货地址基础上，先建立可执行的交易订单数据库模型，再实现前端结算/下单流程，为后续订单 API 接入准备稳定的数据模型、页面状态和提交边界。

## What I already know

- 购物车接口已经返回 SKU、单价、数量、勾选状态和版本。
- 会员登录态与收货地址接口已经可用。
- 当前购物车页面只有“继续选材”，没有结算入口。
- 后端尚无订单表、订单服务、订单 API 和支付 API。
- 项目规范禁止伪造订单成功、价格、库存、配送承诺或支付结果。
- 购物车允许多店铺商品，结算时必须按 `shop_id` 拆成每店铺一张订单。
- 订单必须保存商品、成交金额和收货地址快照，不能依赖后续可变的商品、购物车或会员地址数据。

## Assumptions (temporary)

- 结算只处理购物车中 `selected=true` 且有真实价格的商品。
- 首版只支持实物收货地址选择，不展示没有后端字段支撑的运费、优惠、发票和配送时效。
- 前端提交模型将包含购物车 ID、购物车项 ID/SKU/数量/版本、地址 ID/版本和订单备注。

## Open Questions

- 无。

## Requirements (evolving)

- 购物车有可结算商品时提供结算入口。
- 新增 `/checkout` 页面，复核商品、数量、单价和商品总计。
- 加载登录态、购物车和收货地址；未登录、空购物车、未选商品、缺少价格或无地址时给出明确恢复入口。
- 支持选择默认/其他收货地址，并跳转到地址管理新增或编辑。
- 支持可选订单备注，限制长度并做客户端验证。
- 通过独立 checkout feature、类型和 API adapter 隔离未来后端契约。
- 不生成假订单号，不展示支付成功。
- 新增 `trade_order`、`trade_order_item` 和 `trade_order_shipping_address`，分别保存订单聚合根、成交商品行和一对一收货地址快照。
- 同一次结算使用 `checkout_no` 聚合拆分订单，并以 `(checkout_no, shop_id, fulfillment_type)` 保证每个店铺与履约类型组合创建幂等；首版只创建实物配送订单。
- 订单金额统一使用人民币分，数据库校验商品金额、优惠、运费和应付金额恒等式。
- 首版订单生命周期只覆盖待支付、待履约、履约中、已完成和已关闭；状态 `4` 仅表示未支付订单终止，并记录稳定关闭原因代码。支付、退款和物流使用后续独立表，不把外部流水字段堆入订单主表。
- 订单 Service 必须执行 `0 → 1`、`0 → 4`、`1 → 2`、`2 → 3` 状态迁移白名单，并通过旧状态和 `version` 条件更新防止并发越级。
- 运行既有 MyBatis-Plus 代码生成器，为三张订单表生成 Entity、Mapper 和 XML；删除不符合业务边界的通用 CRUD Service/Controller 产物。
- 实现 Java `POST /orders`，通过登录会员和购物车 Cookie 创建真实订单，并返回 `checkoutNo + orders[]`。
- “提交订单”调用 `/api/orders` 代理到 Java `/orders`；真实成功后展示所有拆分订单号，失败时保留结算上下文并允许重试。

## Acceptance Criteria (evolving)

- [x] 购物车可进入真实数据驱动的结算页。
- [x] 结算页正确处理登录、地址、商品和价格异常状态。
- [x] 提交 payload 可稳定映射到后续订单 API。
- [x] 订单建表脚本可在空库和事务回滚验证库中成功执行。
- [x] 数据库拒绝重复店铺订单、无效金额、无效状态快照和重复消费同一购物车项。
- [x] 页面在 375px 和 1440px 可用且无横向溢出。
- [x] ESLint、TypeScript 和相关浏览器流程通过。
- [x] 三张订单表已应用到本地 PostgreSQL，Entity/Mapper/XML 由既有生成器生成。
- [x] Java 订单 API 完成编译，并通过真实购物车、地址、库存与幂等验证。
- [x] 前端通过 `/api/orders` 完成真实下单，不再停留在接口预留状态。

## Future Evolution

- 后端订单接口接入后，提交成功跳订单详情并清理已购买购物车项。
- 后续可在真实 API 字段存在时加入运费试算、优惠、发票和支付方式。

## Failure And Edge Cases

- 地址或购物车版本过期时必须重新加载，不沿用陈旧快照。
- 商品缺价、下架或库存状态不可结算时必须阻止提交并给出返回购物车的路径。
- 重复点击提交必须被 pending 状态阻止；未来 API 需支持幂等键。

## Out of Scope

- 支付、退款、售后、发票、优惠券、物流单和订单状态流水。
- 伪造运费、优惠、库存、订单号和支付结果。

## Decision

- 选择真实接口预留策略（A）：实现完整 payload 和错误处理，不使用本地 Mock 成功，也不隐藏提交逻辑。

## Technical Notes

- 购物车：`pinova-web/src/features/shopping-cart/`
- 地址：`pinova-web/src/features/member-addresses/`
- 登录：`pinova-web/src/features/member-authentication/`
- 约束：`docs/frontend-component-conventions.md`、`design-system/pinova-mall/MASTER.md`
- 数据库约束：`pinova-cloud/database/schema-conventions.md`、`shopping-cart.md`、`inventory.md`、`member-shipping-address.md`
- HTTP `Idempotency-Key` 直接映射为 `checkout_no`；多店铺提交结果必须返回 `checkoutNo + orders[]`，不能用单个 `orderNo` 表示可能拆分的结算结果。

## Decision (ADR-lite)

**Context**: 购物车可跨店铺，会员地址和商品信息会变化，库存预占已经通过逻辑订单 ID 为交易域预留接口。

**Decision**: 每个 `shop_id + fulfillment_type` 创建一张 `trade_order`，用共享 `checkout_no` 关联同次提交；商品行和地址均保存不可变成交快照。订单表不使用软删除，跨会员、商品和购物车域只保存逻辑 ID，交易域内部使用外键。

**Consequences**: 首版实物订单可以直接落库且历史事实稳定；后续支付、退款、物流和虚拟履约需要独立扩展表，不改写现有成交快照。
