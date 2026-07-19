# Pinova Admin

Pinova 独立运营后台工程，使用 React、TypeScript、Vite 与 Ant Design。

## 已实现

- 独立后台账号、会话、首次改密和 `ORDER_READ` 权限边界。
- 真实订单列表、URL 筛选、分页和订单详情。
- 成交商品与地址快照查询，收货姓名、手机号和详细地址在 API 边界脱敏。
- 未登录、无权限、订单不存在、服务异常、空数据和重试状态。

## 本地运行

先在仓库根目录启动 PostgreSQL、应用管理员身份迁移，并按 [`database/admin-identity.md`](../database/admin-identity.md) 引导首个临时管理员。然后启动 API：

```bash
cd ..
docker compose up -d postgres minio
set -a
source .env
set +a
mvn -pl pinova-api -am -DskipTests package
java -jar pinova-api/target/pinova-api-1.0.0-SNAPSHOT.jar --server.port=18080
```

另开终端启动后台前端：

```bash
cd pinova-admin
pnpm install
pnpm dev --host 127.0.0.1
```

后台地址为 `http://127.0.0.1:3100`，Vite 将 `/api` 代理到 `http://127.0.0.1:18080`。

## 验证

```bash
pnpm lint
pnpm test
pnpm build
```
