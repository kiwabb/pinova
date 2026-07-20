# 搭建 Pinova Cloud 后台管理

## Goal

按照 `pinova-cloud/docs/frontend-architecture.md` 已确定的架构，新建独立的 `pinova-admin` 运营后台，为会员、平台商品类目和后续商品运营提供稳定入口，不与公开商城或拼豆工作台混用一个 SPA。

## What I Already Know

* 技术栈已确定为 React、TypeScript、Vite、Ant Design。
* 服务端状态使用 TanStack Query，表单使用 React Hook Form + Zod；后续通过 Springdoc OpenAPI + Orval 生成契约。
* 开发环境由 Vite 代理 Spring Boot；认证使用 Spring Security 和 HttpOnly Cookie，不把令牌写入 `localStorage`。
* 第一阶段的产品范围是会员列表、会员详情和商品类目管理。
* `MemberAccountController` 当前没有 HTTP 方法；商品类目后端目前只有一级列表和直接子级查询，没有管理 CRUD、移动与排序接口。
* 后端尚未接入 Spring Security，完整运营闭环需要前后端共同建设。
* 当前 `pinova-cloud` 工作区已有与购物车相关的用户修改，本任务不得覆盖或提交这些修改。

## Assumptions

* “按照正确确定的方案”指以 `docs/frontend-architecture.md` 为权威方案，不另选后台模板或替换技术栈。
* 后台采用桌面优先但可在窄屏完成关键操作的数据密集布局。
* 工程骨架为后续真实 API 与权限接入保留清晰边界，但本次不提前实现这些能力。

## Open Questions

* 无。

## Requirements (Evolving)

* 新建独立 `pinova-admin` 应用。
* 使用明确的应用壳、侧边导航、面包屑、页面标题和用户操作区。
* 业务按 feature 划分；请求层、领域类型、页面组件和交互状态保持边界。
* 建立概览、会员列表、会员详情和类目管理路由骨架；路由可直接访问和刷新。
* 路由页面只提供稳定标题与无数据空状态，不显示假表格、假指标、假用户或不可用操作按钮。
* 本次不建立请求层、接口模型或业务状态；这些在真实接口接入时按 feature 增量添加。

## Acceptance Criteria (Evolving)

* [x] `pinova-admin` 可独立安装、启动和构建。
* [x] 应用导航与路由可直接访问，刷新不会丢失位置。
* [x] 桌面端侧边栏与窄屏抽屉导航均可使用，当前路由状态清晰。
* [x] 页面在 375px、768px、1024px 和 1440px 无横向页面溢出。
* [x] 键盘焦点、图标按钮名称、弹层 Escape 关闭和 44px 交互目标符合规范。
* [x] 后台不使用伪造会员、类目、商品或运营指标。

## Definition of Done

* Tests added or updated for implemented behavior.
* Lint and TypeScript checks pass.
* Navigation and direct-route UI flows are verified in a browser.
* Responsive layout is visually checked at required viewports.
* Documentation is updated where startup or contracts change.
* Rollback remains possible through focused commits.

## Technical Approach

* 使用 Vite 创建独立 React + TypeScript 应用，包管理器采用 pnpm。
* 使用 Ant Design 作为组件和 Token 基础，使用 React Router 管理后台路由。
* 采用 feature-first 目录：应用壳位于 `src/app`，业务入口位于 `src/features`，共享视觉组件仅在出现稳定复用时进入 `src/components`。
* 布局使用固定桌面侧栏、顶部栏和内容区；窄屏切换为可关闭、可恢复焦点的导航抽屉。
* 不建立无数据来源的运营仪表盘；概览页只呈现真实的导航入口和工程空状态。

## Decision (ADR-lite)

**Context**: 完整第一阶段需要认证和多个后端管理接口，目前这些契约尚不存在。

**Decision**: 本次只搭建工程骨架、应用壳和空路由，不接 API，不实现认证或业务操作。

**Consequences**: 交付范围小、基础结构可先稳定；会员和类目页面在后续任务中接入真实接口后才具备业务价值。

## Out of Scope

* 订单、支付和内容运营页面，后端领域尚未形成可用契约。
* 用静态图表或假 KPI 制作演示仪表盘。
* 与商城共享页面组件。
* Spring Security、登录页、Cookie 会话和权限控制。
* 会员、类目和商品 API 联调。
* 表格查询、详情数据、CRUD、移动、排序和状态变更。

## Technical Notes

* 权威架构：`pinova-cloud/docs/frontend-architecture.md`。
* 前端工程规范：`pinova-cloud/docs/frontend-component-conventions.md`。
* UI 研究：`research/admin-ui-system.md`。
* 现有 API：`GET /product-categories/main`、`GET /product-categories/{parentCategoryId}/children`、`GET /products`。
