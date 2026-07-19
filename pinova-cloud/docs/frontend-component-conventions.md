# 前端组件工程规范

本规范适用于 Pinova 的 Next.js、React 和 TypeScript 前端。目标是让页面、业务状态、交互组件和数据访问保持明确边界，避免单文件持续膨胀。

## 目录组织

业务前端使用 feature-first 结构：

```text
src/
├── app/                       Next.js 路由、布局和服务端数据编排
├── data/                      跨 feature 的稳定领域类型与纯数据
├── features/
│   └── storefront/
│       ├── components/        Storefront 私有展示和交互组件
│       ├── hooks/             Storefront 客户端状态与副作用
│       ├── lib/               无 React 状态的纯函数和常量
│       ├── index.ts           feature 唯一公共出口
│       ├── storefront.tsx     feature 入口与跨组件编排
│       ├── home.module.css     首页领域布局与响应式
│       ├── catalog-workspace.module.css
│       ├── storefront-page.module.css
│       └── types.ts
└── lib/                       API 客户端和跨 feature 基础能力
```

- `app` 不能承载大段业务 UI，只获取数据、处理路由语义并渲染 feature 入口。
- feature 外部只能从 `index.ts` 导入，禁止引用 feature 的 `components`、`hooks` 或 `lib` 内部路径。
- 只被一个 feature 使用的代码必须留在该 feature 内；确认被两个以上 feature 稳定复用后再提升到 `src/components`、`src/data` 或 `src/lib`。
- 不建立笼统的 `utils.ts`、`helpers.ts` 或 `common.tsx`。文件名必须表达具体职责。

## Server 与 Client 边界

- `page.tsx`、`layout.tsx` 默认保持 Server Component。
- API 数据优先在 Server Component 获取，再以可序列化 props 传给 feature 入口。
- 只有使用状态、Effect、事件处理器或浏览器 API 的文件添加 `"use client"`。
- 不因某个叶子组件需要交互，就把整个路由文件改成 Client Component。
- 客户端组件不得直接读取服务端环境变量或调用仅供服务端使用的 API 客户端。

## 组件职责

- 一个文件只导出一个主要 React 组件；递归节点等只服务于该组件的局部实现可以留在同一文件。
- 页面 section、对话框、抽屉、导航、列表和具备独立交互状态的区域分别建组件。
- 组件只接收完成职责所需的最小 props，不传入整个页面状态对象。
- 使用语义明确的回调名，如 `onLoadCategory`、`onUpdateQuantity`，禁止使用 `handleAction`、`onChangeData` 等模糊命名。
- 展示组件不直接请求远端数据；数据请求和缓存放在 Server Component、API 客户端或 feature hook。
- 入口编排组件建议不超过 250 行，普通组件建议不超过 200 行。超过 300 行必须拆分，除非代码审查中记录了无法拆分的具体原因。
- 不为只有几行且没有独立语义的 JSX 创建组件，也不创建只转发全部 props 的无价值包装层。

## 状态归属

状态放在能够覆盖所有使用者的最低层级：

1. 单个组件使用的展开、排序或弹层状态留在该组件。
2. 多个同 feature 组件共享的业务状态进入 feature 入口或专用 hook。
3. URL 可表达的分类、筛选和详情位置优先使用路由，不复制到全局 store。
4. 服务端数据和请求缓存不放入 Zustand 或 React Context。
5. Context 仅用于跨越至少三层且有多个消费者的稳定依赖；普通父子通信使用 props。

自定义 hook 必须封装真实的状态生命周期或副作用，例如懒加载请求合并、`localStorage` 持久化和定时 Toast。单纯包装一个 `useState` 不构成 hook。

## Hooks 与副作用

- Effect 只用于与 React 外部系统同步，例如 DOM 事件、滚动锁、存储和网络生命周期。
- 可由 props/state 计算出的值直接计算或使用 `useMemo`，不能用 Effect 再写入一份派生状态。
- 所有事件监听器、定时器和滚动锁必须在清理函数中恢复。
- 异步交互必须提供加载、成功或错误反馈；同一资源的并发请求必须合并或取消。
- `useCallback` 只在稳定引用会影响 Effect、memoized 子组件或自定义 hook 依赖时使用。

## 类型和数据

- 组件 props 使用明确的 `XxxProps` 接口；跨多个组件共享的 feature 类型放入 `types.ts`。
- API 响应类型留在 API 客户端内，转换成稳定的前端领域类型后再进入组件。
- 后端 nullable 字段在前端保持 nullable，不能用 `0`、空图片或文案伪造真实数据。
- ID 始终使用字符串，避免 Java `Long` 超出 JavaScript 安全整数范围。
- 纯格式化、树遍历和排序函数放入 `lib`，不得依赖 React 或浏览器状态。

## 样式

- 样式使用 CSS Modules 或项目确定的设计系统，禁止在业务组件引入全局选择器。
- 可复用组件使用相邻的独立 CSS Module；由一个 feature 固定编排、共享响应式断点的页面可使用 feature 级 CSS Module。
- 类名表达组件语义和状态，例如 `categoryTreeRowActive`，不使用颜色或位置命名。
- 交互目标最小 44px，必须保留 `:focus-visible`、禁用态和加载态。
- 动画只使用 `transform`、`opacity` 等低开销属性，并遵守 `prefers-reduced-motion`。
- 固定比例图片、网格和抽屉必须预留尺寸，避免数据或加载态引起布局偏移。

## 可访问性

- 图标按钮必须提供可读的 `aria-label`，装饰图标使用 `aria-hidden="true"`。
- 菜单、树、抽屉和对话框必须支持键盘操作与 Escape 关闭，并在需要时恢复焦点。
- 深层分类页面保留面包屑；当前链接使用 `aria-current`。
- 加载和操作反馈使用 `aria-live`，但不能抢夺键盘焦点。
- 移动端不能只依赖 hover；主要动作必须可点击或聚焦。

## 测试和评审

- 纯函数和复杂 hook 使用单元测试；跨路由、弹层、键盘和响应式流程使用 Playwright。
- 组件拆分不得只验证编译，必须运行现有 E2E，确认用户行为没有改变。
- 涉及布局的改动至少检查 375px 和 1440px 视口，并验证无横向溢出。
- PR 或提交前运行 `npm run lint`、`npx tsc --noEmit` 和与改动范围匹配的测试。

## Storefront 当前边界

- `storefront.tsx`：跨组件状态和路由动作编排。
- `storefront-header.tsx`：页头、搜索入口和 Mega Menu 开关。
- `category-mega-menu.tsx`、`category-tree.tsx`、`category-catalog.tsx`：分类导航与懒加载展示。
- `product-grid.tsx`、`product-quick-view.tsx`：商品摘要展示。
- `cart-drawer.tsx`：购物车交互展示；持久化逻辑在 `use-persistent-cart.ts`。
- 首页各 section 独立组件，只由 `home-content.tsx` 排列顺序。
- `StorefrontHeader`：仅用于需要搜索、分类菜单和购物车抽屉的浏览路由。
- `CommercePageHeader`：商品详情、购物车、账户与会员管理页面的共享页头。
- `member-addresses`：收货地址列表、表单、默认切换和删除确认；API 请求留在该 feature 的 `lib`。

收货地址的省、市、区县使用本地行政区数据驱动的三级联动选择。前端领域值和提交请求必须同时保留 `provinceCode/provinceName`、`cityCode/cityName`、`districtCode/districtName`；行政区代码由选择项自动写入，不能作为文本框要求用户填写。切换上级行政区时必须清空下级代码与名称，避免提交跨地区组合。

地区下拉使用 feature 内的 `RegionSelect` 自定义 listbox。触发器保持 `combobox`、`aria-expanded`、`aria-activedescendant` 和错误描述关联；选项必须提供 `option`/`aria-selected`。鼠标之外还必须支持方向键高亮、Enter 或 Space 选择、Escape/Tab 关闭、外部点击关闭，并将校验焦点落到对应触发器。视觉调整不能退回只支持鼠标的弹层。

新增功能应延续这些边界，不能重新把商品详情、SKU 选择、结算或账户逻辑堆回 `storefront.tsx`。

结算逻辑放在独立的 `checkout` feature：只提交购物车、购物车项、SKU、地址的字符串 ID 及对应版本，价格仅用于页面复核，不能作为订单成交金额来源。同一次结算生成并复用一个 `Idempotency-Key`。成功响应按 `checkoutNo + orders[]` 处理，即使只有一个店铺也不能退化成单个 `orderNo` 契约；服务未上线或请求失败时必须保留当前结算内容并提供可恢复错误，禁止伪造成功、订单号或支付状态。

### 设计生成与检索顺序

前端设计或生成代码前，必须依次读取 `pinova-web/AGENTS.md`、本规范、
`pinova-web/design-system/pinova-mall/MASTER.md` 和对应的 `pages/<page>.md`。
外部 UI 技能只能补充可访问性、响应式和交互检查，不能重新生成或覆盖项目配色、字体、圆角、技术栈和页面结构。

所有可见业务文案都必须有真实字段或已实现能力支撑。没有订单 API 时不显示结算入口；没有政策字段时不显示
“正品保证”“快速发货”“售后保障”；框架错误、路由错误和数据库 ID 不直接展示给用户。
导航文案同样受此约束：没有热度或销量字段时使用“商品”等中性名称，不写“热卖”。

## Storefront 视觉与交互规范

Pinova 商城采用 **材料电商密度** 视觉系统（`pinova-web/design-system/pinova-mall/`）。目标是可逛、可看价、可加购的店铺，不是企业官网或编辑式作品集。表达重点：真实商品图、价格、分类入口、楼层货架和明确 CTA。品牌色与分类色点保留，但不以坐标尺、色板矩阵或散文叙事作为首页主语言。

权威细则：`pinova-web/design-system/pinova-mall/MASTER.md`，页面覆盖见同目录 `pages/`。

### 页面结构

- 首页是商城发现页：主推商品 Banner、分类快捷入口、按交付类型组织的密商品楼层、短到店条。
- 默认首页按 `productType` 区分实物、数字图纸和到店体验；搜索或筛选状态才使用通用结果网格。
- 分类页是选品列表：面包屑、标题、下级分类入口、排序工具带和密商品网格。
- 商品详情优先图库、价格、SKU 与购买区，说明内容在次要区域。
- Header、Footer、购物车、快览和筛选抽屉只能包含真实入口或真实交互。未实现入口直接移除，禁止用 Toast 假装可用。

### 视觉 Token

基础语义变量定义在全局样式，局部 CSS Module 只引用语义，不重复建立另一套品牌色：

```css
--catalog-paper: #f4f6f2;
--catalog-surface: #ffffff;
--catalog-surface-subtle: #fbfcfa;
--catalog-surface-muted: #edf1ee;
--catalog-ink: #111311;
--catalog-muted: #626761;
--catalog-rule: #cbd1cb;
--catalog-rule-strong: #929991;
--catalog-accent: #c72c59;
--catalog-accent-strong: #9f1744;
--catalog-accent-soft: #f7e5eb;
--catalog-emerald: #0c715f;
--catalog-emerald-strong: #075347;
--catalog-marigold: #efbc35;
--catalog-blue: #2f63b7;
--catalog-violet: #7a59a5;
--catalog-coral: #df654a;
--catalog-warning: #985f00;
--catalog-danger: #b42318;
--catalog-focus: #126fbd;
--catalog-content-max: 1344px;
```

- 桌面内容最大宽度为 `1344px`；商品网格移动 2 列、平板 3 列、桌面 4–5 列。
- 商品卡允许白底与轻阴影；控件圆角不超过 6px，表面圆角不超过 8px。
- 中文正文使用系统中文无衬线栈；价格和数量使用 tabular figures；价格使用品牌洋红。
- 分类强调色用于入口图标底与状态点，禁止整页只铺一组粉色变化。

### 禁止模式

- 禁止企业官网式全屏品牌 Manifesto、经纬度装饰尺、无商品锚点的色板矩阵主区块。
- 禁止 AI 紫粉渐变、Glassmorphism 大面积铺陈、装饰性持续动画。
- 禁止移动端固定商城 Tab Bar；禁止依赖 hover 才能完成的加购/收藏。
- 禁止依赖数组下标或固定六项 `nth-child` 制造布局；接口顺序和数量变化不能破坏网格。
- 禁止在页面上显示开发说明，例如“数据来自真实接口”“字段暂未接入”“功能正在完善”。
- 禁止伪造价格、库存、销量、评分、SKU、图片、门店地址、营业时间或售后政策。后端 nullable 字段不显示占位业务值。
- 禁止用数组下标或数据库 ID 生成规格名。单 SKU 不显示选择器；多 SKU 缺少 `specSummary` 时只能用真实价格与库存状态降级展示，并推动接口补齐名称。

### 交互与动效

- 所有交互目标至少 44×44px，键盘焦点清晰，菜单、树、抽屉和对话框支持 Escape、焦点陷阱与焦点恢复。
- Hover 只提供增强信息，移动端的购买、收藏、导航和分类操作必须直接可见或可点击。
- 动效只表达状态变化：箭头、工具显隐、图片最多约 `1.015` 缩放、抽屉进出。空间位移与缩放只使用 `transform` 和 `opacity`；状态过渡保持 140-240ms。
- `prefers-reduced-motion: reduce` 下取消位移、缩放和持续动画，过渡压缩至 `0.01ms`。
- 布局改动至少实测 `375×812`、`768×1024`、`1024×768`、`812×375` 和 `1440×1000`，并检查横向溢出、文字遮挡、图片加载和控制目标尺寸。
