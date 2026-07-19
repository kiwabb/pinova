# Pinova

Pinova 商城后端工程。当前 `monolith` 分支采用模块化单体架构。

## 技术基线

- Java 21
- Maven 3.9+
- Spring Boot 3.5.16
- PostgreSQL
- MyBatis-Plus 3.5.17

## 模块

```text
pinova-parent
├── pinova-common       公共基础模块
├── pinova-pojo         实体与数据传输对象模块，依赖 common
├── pinova-mapper       数据访问模块，依赖 pojo
├── pinova-service      业务服务模块，依赖 mapper
└── pinova-api          接口层模块，依赖 service
```

## 本地环境

构建前请确保 `JAVA_HOME` 指向 JDK 21：

```bash
java -version
mvn -version
```

## 数据库

数据库表的固定字段、命名和类型规范见 [database/schema-conventions.md](database/schema-conventions.md)。业务表设计见 [会员账户](database/member-account.md)、[会员登录验证](database/member-authentication.md)、[会员收货地址](database/member-shipping-address.md)、[后台身份与权限](database/admin-identity.md)、[商品类目](database/product-category.md)、[商品 SPU](database/product-spu.md)、[商品详情](database/product-spu-detail.md)、[商品媒体](database/product-media.md)、[商品 SKU](database/product-sku.md)、[商品评价](database/product-review.md)、[购物车](database/shopping-cart.md)、[交易订单](database/trade-order.md) 和 [库存模型](database/inventory.md)。

本地 PostgreSQL 使用 Docker Compose，连接参数保存在不提交 Git 的 `.env` 中：

```bash
docker compose up -d postgres
set -a
source .env
set +a
```

默认连接地址为 `127.0.0.1:15432/pinova`，默认 schema 为 `pinova`。启动 Java 应用前，需要在当前终端导出 `.env` 中的变量。

## 技术文档

- [API 响应协议](docs/api-response-contract.md)
- [前端技术选型](docs/frontend-architecture.md)
- [前端组件工程规范](docs/frontend-component-conventions.md)
- [日志规范](docs/logging.md)
- [Spring Boot 自动配置原理](docs/spring-boot-auto-configuration.md)
- [MyBatis-Plus 代码生成器](docs/mybatis-plus-code-generator.md)
- [Spring 事务传播行为](docs/spring-transaction-propagation.md)

## 商城主页 Demo

可交互的 Next.js 商城主页位于 [`pinova-web`](pinova-web/README.md)：

```bash
cd pinova-web
npm install
npm run dev
```

## 运营后台

独立后台位于 [`pinova-admin`](pinova-admin/README.md)，默认使用 `3100` 端口，并代理到本地 `18080` API。
