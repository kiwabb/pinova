# Pinova 前端技术选型

## 目标与边界

Pinova 的前端按使用场景拆分，不用一个 SPA 同时承担公开商城、运营后台和高交互创作工具：

| 应用 | 推荐技术栈 | 主要职责 |
| --- | --- | --- |
| `pinova-storefront` | Next.js App Router、React、TypeScript | 首页、类目、搜索、商品详情、购物车、结算、订单和会员中心 |
| `pinova-admin` | React、TypeScript、Vite、Ant Design | 会员、平台类目、商品、订单、内容和运营配置 |
| 微信小程序 | Taro、React、TypeScript | 微信登录、移动端购买、门店与轻量创作流程 |
| 拼豆工作台 | React、TypeScript、Vite | Canvas、Web Worker、Three.js 等纯客户端高交互能力 |

公开商城需要可索引的类目和商品页面、分享元数据、服务端渲染及缓存，因此选择 Next.js。运营后台没有 SEO 需求，使用 Vite 可以保持部署简单。现有拼豆工作台继续作为客户端应用，不迁移到服务端渲染层。

## 商城基础栈

- 样式与组件：Tailwind CSS、shadcn/ui、Radix UI、Lucide Icons。
- 服务端状态：TanStack Query；请求和缓存状态不放入全局状态容器。
- 客户端状态：Zustand，仅用于购物车草稿、筛选偏好和编辑器状态。
- 表单与校验：React Hook Form、Zod。
- API 契约：Springdoc OpenAPI 输出规范，Orval 生成 TypeScript 类型、请求函数和 Query hooks。
- 测试：Vitest、React Testing Library、MSW、Playwright。
- 包管理：pnpm。商城与后台都启动后再采用 pnpm workspace，共享 API 类型和设计 Token，不强行共享页面组件。

## API 约束

1. 浏览器认证由 Spring Security 负责，使用 `HttpOnly`、`Secure`、`SameSite` Cookie；禁止把访问令牌保存到 `localStorage`。
2. API 使用 `/api/v1` 前缀。生产环境通过反向代理保持同源；开发环境由 Next.js 或 Vite 代理到 Spring Boot。
3. 成功响应继续使用 `{ code, message, data }`，失败响应使用 RFC 9457 Problem Details。前端错误对象必须保留 `code`、`traceId` 和字段级 `errors`。
4. Java `Long`/PostgreSQL `bigint` 主键在 API DTO 中序列化为字符串，禁止作为 JavaScript `number` 传输。
5. 数据库实体不能直接作为响应体。会员 DTO 不得包含 `passwordHash`、登录 IP、逻辑删除字段和内部审计信息。
6. 列表接口统一使用分页 DTO；类目导航使用按父节点懒加载的稳定摘要 DTO，不一次返回完整递归树。

## 商品类目展示约定

- `ProductCategory` 是商品归类的唯一标准树，前端路由和选择状态使用稳定的 `categoryCode`，不依赖数据库 `id`。
- 商城首页只展示精选一级入口；运营入口引用 `categoryCode`，不复制或硬编码另一棵商品类目树。
- 桌面端“全部分类”使用 Mega Menu，展示一级、二级和常用三级分类。第四、第五级只在用户进入对应分类页后展开。
- 分类商品页由面包屑、桌面侧边分类树和商品列表组成；移动端将侧边树收进“分类筛选”抽屉。
- 商品绑定叶子类目。访问父类目时，商品查询必须聚合当前类目及其全部后代类目。
- 分类 URL 使用完整编码路径，例如 `/category/starter-kits/starter-level/first-project`，保证分享、刷新和浏览器后退行为一致。
- 当前 Demo 已通过 `GET /product-categories/main` 和 `GET /product-categories/{parentCategoryId}/children` 接入数据库分类数据。节点通过 `hasChildren` 表示是否可继续展开，Mega Menu 和分类树仅在交互时加载直接子节点；分类页服务端沿 URL 路径逐层加载当前分支。接口地址由服务端环境变量 `PINOVA_API_BASE_URL` 配置，服务端缓存 60 秒并使用 `product-categories` 标签支持后续按需刷新。
- 商品列表通过 `GET /products` 接入真实上架 SPU，支持分页和 `categoryCode` 筛选；后端负责聚合父分类的全部后代商品，并返回叶子分类及完整分类编码路径。价格、库存和销量没有真实数据时返回 `null`，前端留空且不开放购买动作。
- 当前 Apifox 契约将分类 ID 定义为 `int64`，现有后端也返回 JSON 数字。因为种子 ID 超出 JavaScript 安全整数范围，Next.js 服务端使用 bigint JSON 解析器将 ID 保留为字符串；后端 DTO 和 Apifox 契约后续应统一改为字符串。
- `store-experience` 当前为验证预约商品流程而临时放入 Demo 分类树；正式商品 taxonomy 应将“到店体验”拆为运营或预约入口。

## 开发阶段

### 第一阶段：运营闭环

- 实现认证、会员查询/状态管理、商品类目树 CRUD、移动与排序接口。
- 开发 `pinova-admin` 的会员列表、会员详情和类目管理页面。
- 前后端通过 OpenAPI 生成契约联调。

### 第二阶段：公开商城

- 后端补齐商品 SPU/SKU、库存、媒体资源、搜索、购物车、地址、结算、订单和支付领域。
- 开发 Next.js 商城：首页、类目、搜索、商品详情、购物车、结算、订单和会员中心。
- 商品图和头像使用 S3 兼容对象存储与 CDN；前端声明固定尺寸并输出 WebP/AVIF，避免布局偏移。

### 第三阶段：多端复用

- 小程序复用 OpenAPI 类型、业务规则和纯 TypeScript 工具，不直接复用 Web UI 组件。
- 拼豆工作台按需接入云项目、作品、素材、订单和会员 API，图片转换继续优先在本地执行。

## 当前阻塞项

- `MemberAccountController` 尚无真实 HTTP 方法；`ProductCategoryController` 已提供主分类列表和按父分类 ID 查询直接子分类接口。
- 尚未接入 Spring Security、OpenAPI 自动生成、对象存储和生产反向代理。
- 后端已有会员账户、平台商品类目和商品 SPU 列表，但尚无 SKU 价格、库存、购物车、订单及支付领域，不能形成真实交易闭环。

商城主页 Demo 已完成分类与商品 SPU 的后端联调；交易字段和交易流程仍是后续范围。
