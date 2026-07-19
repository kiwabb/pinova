# Pinova 商城主页 Demo

Pinova C 端商城的可交互首页 Demo，使用 Next.js App Router、React、TypeScript 与 Tailwind CSS 构建。

## 已实现

- 响应式商城首页、商品分类、本周热卖、工作台入口、武汉门店和商城服务信息。
- 商品分类通过 Pinova API 懒加载真实层级数据，父分类商品按分类路径聚合。
- 桌面端三级分类 Mega Menu、分类页面包屑/侧边树与移动端分类抽屉。
- 商品/分类搜索建议、搜索结果与空状态。
- 分类筛选、商品快览和收藏；价格未接入时购买按钮保持禁用。
- 购物车与收藏使用 `localStorage` 保存，刷新后继续保留。
- 桌面端购物车抽屉与移动端四项底部导航。
- 键盘焦点、跳过导航、`aria-live` 操作反馈和减少动态效果偏好。

## 本地运行

先启动 PostgreSQL 和 Pinova API。API 默认使用 `8080`，也可以像下面这样改用 `18080`：

```bash
cd ..
docker compose up -d postgres
set -a && source .env && set +a
mvn -pl pinova-api -am package -DskipTests
java -jar pinova-api/target/pinova-api-1.0.0-SNAPSHOT.jar --server.port=18080
```

再启动商城：

```bash
cd pinova-web
npm install
cp .env.example .env.local
# 当 API 使用 18080 时，将 PINOVA_API_BASE_URL 改为 http://127.0.0.1:18080
npm run dev
```

默认地址为 `http://localhost:3000`。

验证命令：

```bash
npm run lint
npm run build
```

## 数据边界

商品分类和商品 SPU 来自以下真实接口，契约已通过 Apifox 项目 `pinova-cloud`（项目 ID `8583384`）核对：

- `GET /product-categories/main`
- `GET /product-categories/{parentCategoryId}/children`
- `GET /products?page=1&pageSize=100&categoryCode={categoryCode}`

主分类接口只返回一级节点；用户展开 Mega Menu 或侧边分类树时，前端再按父分类 ID 请求直接子节点。分类页服务端沿 URL 中的分类编码逐层读取当前分支，不下载完整分类树。

分类接口的 `int64` ID 超出 JavaScript 安全整数范围，服务端 API 客户端使用 bigint JSON 解析器将其保留为字符串，再请求直接子分类。

商品名称、摘要、类型、主图 Key、叶子分类和分类路径来自真实 `product_spu` 数据。分类页把当前分类编码传给商品接口，后端负责聚合该分类及其全部后代分类。

价格、划线价、库存和销量尚无对应 SKU、库存域或查询模型，接口返回 `null`，页面对应位置留空并禁用购买按钮。收藏仍保存在前端 `localStorage`；购物车交互代码保留，待真实售价和库存接入后启用。

Demo 中的商品 ID 使用字符串，保持与 Java `Long`/PostgreSQL `bigint` API 契约一致。

## 组件架构

商城使用 `src/features/storefront` 的 feature-first 结构。路由只负责服务端数据获取，`storefront.tsx` 负责跨组件编排，展示组件、业务 hooks、纯函数和公共类型分别放在各自目录。详细约束见 [`docs/frontend-component-conventions.md`](../docs/frontend-component-conventions.md)。

## 视觉素材

页面只使用工作区内已经生成的通用 AI 拼豆素材。项目副本已转换成质量 85 的 WebP 并保存在 `src/assets/storefront/`，原始来源为：

- `output/imagegen/illustrations/01-photo-to-pattern.png`
- `output/imagegen/illustrations/02-parent-child.png`
- `output/imagegen/illustrations/03-couple.png`
- `output/imagegen/simple-v5/ui/06-wuhan-illustration-v5.png`
- `output/imagegen/simple-v5/ui/08-couple-illustration-v5.png`

这些图片适合内部 Demo 和视觉评审，不代表真实顾客、真实商品或真实门店。正式上线前仍需完成素材权利与生成瑕疵审查，并替换为经过授权的商品实拍。
