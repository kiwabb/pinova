# 开发 Pinova 后台订单管理

## Goal

在独立 `pinova-admin` 中建设真实、可审计的订单管理能力，让授权运营人员查询订单列表和订单详情，并为后续履约状态操作保留安全边界。

## What I Already Know

* `trade_order`、`trade_order_item`、`trade_order_shipping_address` 已定义订单聚合、成交商品快照和地址快照。
* 订单状态为待支付、待履约、履约中、已完成、已关闭；数据库文档规定了严格的状态迁移白名单和乐观锁版本。
* 当前 `TradeOrderController`、`TradeOrderItemController`、`TradeOrderShippingAddressController` 与对应 Service 都没有真实业务方法。
* 项目尚无后台账号、后台会话或 RBAC；会员登录身份不能充当运营后台身份。
* 订单和地址包含敏感交易与个人信息，不能通过未鉴权管理接口直接暴露。
* 订单创建和商城结算正由另一个未提交任务开发，本任务不能覆盖或重写其文件。
* `pinova-admin` 已采用 React、TypeScript、Vite、Ant Design 和 React Router，但尚未接入请求层。

## Assumptions

* 订单管理优先支持真实只读查询；状态变更应在查询契约稳定后独立实现。
* 地址和手机号在运营列表中按最小必要原则脱敏，详情页也只向具备对应权限的后台身份展示。
* 前端不使用静态假订单或伪造 KPI。
* 首期权限动作仅包含订单读取，不提前加入订单状态变更权限。

## Open Questions

* 无。

## Requirements (Evolving)

* 后台侧栏新增“订单管理”，提供可直接访问的列表与详情路由。
* 列表支持订单号、状态、提交时间和分页查询；显示订单号、状态、金额、履约类型、提交时间等真实字段。
* 详情按订单聚合展示金额、状态里程碑、商品成交快照和脱敏收货快照。
* 所有 Java `Long` 标识在 API 和前端中以字符串表示。
* 查询必须从专用管理 API 返回 Response 模型，不能把实体直接暴露给前端。
* 页面提供加载、错误、空数据和重试状态；筛选状态进入 URL。
* 新建独立后台身份、会话与 RBAC 边界，禁止复用会员登录身份。
* 未登录访问后台页面跳转登录；已登录但缺少订单读取权限时返回明确的 403 状态。
* 首期只读，不提供关闭、履约或完成订单操作。
* 首个后台身份通过专用非 Web 引导命令创建；正常服务不开放管理员注册或初始化接口。
* 引导命令仅在后台账号表为空时创建临时超级管理员，缺少必要输入时失败关闭，不记录明文密码。
* 临时超级管理员首次登录后必须修改密码，完成前不能访问订单数据。
* 建立后台账号、后台会话、角色、权限、账号角色关联和角色权限关联表。
* 内置超级管理员角色与订单读取权限；订单管理 API 必须在 Service/API 边界校验后台身份和权限。
* 本次不提供后台账号、角色或权限管理 UI。
* `ORDER_READ` 只能读取脱敏收货人姓名、手机号和详细地址；本次不实现 `ORDER_PII_READ`。
* 后端 Response 在组装边界完成脱敏，原始隐私字段不进入前端响应体。

## Acceptance Criteria (Evolving)

* [x] 未授权用户不能访问订单管理 API 或后台页面。
* [x] 订单列表支持真实分页、状态筛选、订单号查询和提交时间范围。
* [x] 订单详情展示主订单、商品行和地址快照，不回查可变商品或会员地址。
* [x] 手机号和详细地址按权限与页面场景执行最小必要展示。
* [x] 订单列表与详情在 375px、768px、1024px、1440px 可用且无页面级横向溢出。
* [x] API、前端和浏览器验证覆盖成功、空数据、无权限、未找到和上游失败。
* [x] 引导命令在空账号库创建临时超级管理员，在已有账号或输入不完整时失败关闭且不改数据。
* [x] 临时管理员首次登录只允许读取当前身份、修改密码和退出，不能读取订单。

## Definition of Done

* Tests added or updated at service, API and frontend boundaries where implemented.
* Lint, TypeScript, focused Java tests and production build pass.
* Running backend and frontend are verified end to end.
* Security and privacy boundaries are documented and tested.
* Existing checkout work is preserved.

## Technical Approach

### Storage

* 新增 `admin_account`、`admin_login_session`、`admin_role`、`admin_permission`、`admin_account_role`、`admin_role_permission`。
* 密码使用 BCrypt 摘要；随机会话令牌仅保存 SHA-256 哈希；后台会话 Cookie 与会员 Cookie 分离。
* 迁移内置稳定的 `SUPER_ADMIN` 角色和 `ORDER_READ` 权限，不写入默认管理员或默认密码。

### Bootstrap And Authentication

* 提供非 Web bootstrap 运行模式，仅允许后台账号表为空时创建临时超级管理员。
* 登录接口为 `POST /admin/auth/login`；当前身份、改密和退出分别使用 `/admin/auth/me`、`/admin/auth/password`、`/admin/auth/logout`。
* 使用 HttpOnly、Secure（HTTPS）、SameSite Cookie；后台请求经过独立身份解析和权限校验。
* 临时账号成功修改密码后才允许使用 `ORDER_READ`。

### Order Query API

* `GET /admin/orders`：支持 `orderNo`、`status`、`submittedFrom`、`submittedTo`、`page`、`pageSize`。
* `GET /admin/orders/{orderNo}`：按面向运营的订单号读取聚合详情，不在路由暴露数据库 ID。
* API 返回专用分页、摘要和详情 Response；Service 使用 Query/Result，Mapper 只接收显式持久化参数。
* 详情读取成交商品和地址快照；不回查当前商品名称或会员地址。

### Admin UI

* 新增 `/login`、`/change-password`、`/orders`、`/orders/:orderNo` 路由和订单侧栏入口。
* 筛选条件保存在 URL；列表使用 Ant Design Table，窄屏隐藏次要列并通过详情路由承载完整信息。
* 详情使用分区描述列表展示状态、金额、时间、成交商品快照和脱敏地址，不制作无来源 KPI 或图表。
* 请求层统一保留 Problem Details 的 `code`、`traceId` 和字段错误；401、403、404 与网络失败提供明确恢复路径。

## Decision (ADR-lite)

**Context**: 订单包含交易金额、会员关联和收货隐私数据，项目当前没有后台身份体系。

**Decision**: 先实现独立后台认证与 RBAC，再开放只读订单列表和详情；不创建临时未鉴权接口。

**Consequences**: 工作量覆盖数据库、后端和前端，但安全边界完整；订单状态操作推迟到后续独立任务。

### Initial Administrator Bootstrap

**Decision**: 使用专用一次性非 Web 引导命令，不使用默认密码、首次启动隐式写入或公开 setup 接口。

**Consequences**: 部署需要显式执行一次引导命令；正常运行时不保留远程初始化攻击面。

### RBAC Scope

**Decision**: 本次只实现可执行的 RBAC 基础设施和订单读取授权，不交付管理员与角色管理页面。

**Consequences**: 首期由引导创建的超级管理员使用订单查询；后续可以在既有表和权限校验上增加多管理员管理流程。

### Order Privacy

**Decision**: `ORDER_READ` 的订单列表与详情响应只包含脱敏收货隐私，后端不返回原始姓名、手机号或详细地址。

**Consequences**: 首期订单管理适合查询与核对，不适合直接执行仓库发货；完整隐私访问必须在后续通过独立 `ORDER_PII_READ` 权限和审计能力开放。

## Out of Scope

* 支付、退款、售后、物流轨迹和发票。
* 删除订单或修改成交商品/地址快照。
* 用会员 Cookie 代替后台运营身份。
* 假订单、假金额和假运营指标。
* 订单关闭、开始履约、完成订单等写操作。
* 后台账号、角色和权限管理页面与 CRUD API。
* 完整收货隐私展示与 `ORDER_PII_READ` 权限。

## Technical Notes

* 订单设计：`pinova-cloud/database/trade-order.md`。
* 当前订单 Controller：`pinova-cloud/pinova-api/src/main/java/com/pinova/api/controller/TradeOrderController.java`。
* 后台规范：`.trellis/spec/frontend/pinova-admin.md`。
* UI 研究：`research/order-management-ui.md`。
* 管理员引导安全调研：`research/admin-bootstrap-security.md`。
