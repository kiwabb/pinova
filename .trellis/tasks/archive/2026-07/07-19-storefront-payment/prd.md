# 对接商城支付功能

## Goal

为 Pinova 商城的待支付订单建立可替换真实渠道的支付能力，让登录会员能够从订单页面发起支付，并由服务端确认的渠道结果推进订单状态，而不是由前端自行标记已支付。

## What I already know

- 商城已经支持登录会员提交订单和查看 `/account/orders`。
- 订单状态已有待支付、待履约、履约中、已完成、已关闭五个阶段。
- 订单表已经保存应付金额、已付金额、支付过期时间和支付完成时间。
- 当前没有支付渠道、支付单、异步通知或退款实现。
- 一次结算可以按店铺拆分为多个订单，并使用同一个 `checkout_no` 关联。
- 当前下单只生成库存预占；支付成功后还需要把预占转为实际扣减并写库存流水。

## Assumptions (temporary)

- 首期只处理人民币订单。
- 支付成功后，订单从待支付进入待履约。
- 本地模拟支付只在开发或测试环境启用，不作为生产支付方式。
- 退款范围需要确认后才能锁定方案。

## Open Questions

- 无（首期范围已确认，退款和对账明确延期）。

## Requirements (evolving)

- 支付金额以服务端订单应付金额为准。
- 只有当前订单所属会员可以发起支付。
- 支付成功状态必须由支付渠道服务端通知或服务端主动查询确认。
- 重复发起、重复回调和网络重试必须幂等。
- 浏览器同步返回页面只展示结果，不作为支付成功依据。
- 支付渠道凭证必须由运行环境注入，不能提交到仓库。
- 首期建立统一支付渠道接口，并实现开发/测试环境专用的模拟支付渠道。
- 模拟支付必须走和真实渠道一致的支付结果处理服务，不能直接由前端修改订单状态。
- 每个 `checkout_no` 只创建一笔支付单，支付单关联本次结算下的全部 `trade_order`。
- 支付金额等于该结算下所有待支付订单应付金额之和；支付成功时批量推进全部订单。
- 支付单、订单和库存扣减必须在同一数据库事务中保持一致，不能出现部分订单已支付的结果。
- 重复发起支付返回已有支付单，不能产生重复支付单。
- 重复或乱序的支付结果通知必须幂等，不能重复扣库存或重复推进订单。
- 支付超过有效期后关闭支付单并释放库存预占；已确认成功的支付不能被超时任务覆盖。
- 提供服务端主动查单补偿入口，处理通知丢失或回调失败。
- 支付成功时若库存状态不满足扣减条件，整个事务回滚并将支付结果标记为需要人工处理，不伪造订单成功。

## Acceptance Criteria

- [x] 待支付订单可以从结算成功态和订单页发起完整模拟支付流程。
- [x] 前端不能提交或覆盖订单成交金额。
- [x] 有效渠道结果只推进对应待支付订单一次。
- [x] 金额或币种不符、订单不属于当前会员时不改变订单成功状态。
- [x] 支付成功后订单页面刷新为待履约。
- [x] 模拟支付能力在生产 profile 下不可用，且必须显式配置开关。
- [x] 同一 `checkout_no` 重复发起支付返回同一支付单，不重复创建支付记录。
- [x] 支付成功后该 `checkout_no` 下的全部正金额待支付订单一起进入待履约。
- [x] 重复支付结果不会重复扣减库存或追加库存流水。
- [x] 过期订单关闭后库存预占被释放，并写入释放流水。
- [x] 主动查单通过同一幂等结果处理器恢复支付结果。
- [x] 模拟支付失败后可以重启同一支付单并递增尝试次数。

## Definition of Done (team quality bar)

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Rollout/rollback considered if risky

## Out of Scope (explicit)

- 支付宝、微信等真实渠道适配器、异步通知验签及公网回调部署。
- 退款、部分支付、组合支付、优惠券、分账、财务对账和支付后售后。

## Technical Notes

- Existing order schema: `pinova-cloud/database/init/023-create-trade-order.sql`
- Existing order service: `pinova-cloud/pinova-service/src/main/java/com/pinova/service/impl/TradeOrderServiceImpl.java`
- Existing order API: `pinova-cloud/pinova-api/src/main/java/com/pinova/api/controller/TradeOrderController.java`
- Existing order UI: `pinova-cloud/pinova-web/src/features/member-orders/`

## Research References

- [`research/payment-provider-options.md`](research/payment-provider-options.md) — 推荐支付宝电脑网站支付沙箱作为首条可验证链路，并保留微信 Native 扩展能力。

## Feasible Approaches

### 方案 A：支付宝电脑网站支付沙箱（推荐）

- 使用 `alipay.trade.page.pay` 跳转官方沙箱收银台。
- 由异步通知或服务端主动查单确认到账，支持本地开发阶段真实联调。
- 需要沙箱应用 ID、应用私钥、支付宝公钥及公网可访问的通知地址。

### 方案 B：微信 Native 支付

- 服务端获取 `code_url`，前端展示二维码供用户扫码。
- 需要真实微信支付商户号、平台证书/API v3 Key 和公网 HTTPS 回调。
- 当前没有商户资质时无法完成完整联调。

### 方案 C：统一支付抽象加本地模拟渠道

- 先完成支付单、状态机、回调幂等、订单和库存事务，再接真实渠道。
- 自动化测试最稳定，但模拟渠道不能替代第三方网关联调。

## Decision (ADR-lite)

**Context**: 当前尚未提供支付宝或微信商户凭证及公网通知地址，但订单、库存和前端仍需要先形成可恢复、可测试的支付闭环。

**Decision**: 首期采用统一支付渠道抽象，并实现仅限开发/测试环境启用的本地模拟支付渠道；以 `checkout_no` 为支付聚合边界，并纳入支付可靠性处理。

**Consequences**: 可以先验证支付单、订单状态、库存扣减、重复通知、超时和失败恢复；生产上线前仍必须新增真实支付渠道并完成官方沙箱或商户环境联调。退款、部分支付、分账和财务对账不属于首期。

## Technical Approach

- 新增支付单及支付单-订单关联表，支付单按 `checkout_no` 唯一。
- 定义 `PaymentProvider`、支付应用服务和统一支付结果处理器；首期实现 `LocalMockPaymentProvider`。
- 增加创建支付、模拟成功/失败、支付状态查询及主动刷新接口；模拟接口按开发/测试环境开关保护。
- 支付结果处理器校验会员、金额、币种、支付单状态和关联订单状态，再用事务更新支付单、订单、库存预占和库存流水。
- 增加结算成功态和订单页支付入口、支付状态展示、失败重试和结果刷新；前端只消费服务端返回的支付状态。
- 增加定时超时关闭和主动查单服务，统一使用 `checkout_no` 事务锁。

## Implementation Plan

1. 数据库迁移、支付领域模型、状态枚举和 Mapper。
2. 支付渠道抽象、模拟渠道、创建/查询/通知/关闭应用服务及幂等事务。
3. 订单与库存联动、超时和主动查单补偿、单元测试与集成测试。
4. 前端订单支付入口、模拟支付交互、状态轮询/刷新和错误提示。
5. 运行质量检查，补充接口和本地模拟支付使用说明。

## Implementation Results

- `025-create-payment-order.sql` 已在本地 PostgreSQL 使用 `ON_ERROR_STOP=1` 成功执行。
- 实体、Mapper、XML 和基础层文件由项目 MyBatis-Plus 代码生成器生成，再按业务边界收紧。
- 浏览器端已验证：结算提交、立即支付、订单页去支付、模拟失败、重试、成功和订单状态刷新。
- 数据库已验证：支付成功后订单 `0 -> 1`、支付单 `0/2 -> 1`、库存预占 `0 -> 1`、现存与锁定库存同时扣减，并只生成一条扣减流水。
- 超时任务已验证会关闭旧待支付订单；本次端到端测试数据已全部删除并恢复库存。
- 后端 Maven 测试、前端 ESLint、TypeScript 和 Next.js 生产构建全部通过。
