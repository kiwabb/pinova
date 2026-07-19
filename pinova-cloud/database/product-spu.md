# 商品 SPU 表设计

`pinova.product_spu` 保存商品的稳定主体信息，是商品聚合根。一个 SPU 表示用户认知中的一种商品，例如“武汉城市拼豆材料套装”；颜色、尺寸、套餐等可销售规格由后续的 SKU 表保存。

## 归属边界

- 每个商品必须归属一个 `shop_id`。它表示业务所有权，不是 `tenant_id`。
- `shop_id` 不建立数据库外键。店铺属于商家域，商品属于商品域；未来拆分微服务后通过接口和事件维护跨域一致性。
- `category_id` 引用 `product_category`。平台类目与商品同属商品目录边界，因此保留数据库外键。
- 商品只能绑定启用且未删除的叶子类目，该跨行规则由 Service 在创建、修改类目和上架时校验。

## 字段

| 字段 | 类型 | 是否为空 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 否 | 应用生成的 SPU 主键 |
| `shop_id` | `bigint` | 否 | 所属店铺主键 |
| `category_id` | `bigint` | 否 | 平台叶子类目主键 |
| `spu_code` | `varchar(64)` | 否 | 店铺内稳定且不可复用的商品编码 |
| `name` | `varchar(200)` | 否 | 商品名称 |
| `summary` | `varchar(512)` | 是 | 列表和摘要场景使用的简短描述 |
| `product_type` | `smallint` | 否 | `1` 实物、`2` 虚拟、`3` 服务 |
| `main_image_key` | `varchar(512)` | 是 | 商品主图对象存储 Key |
| `status` | `smallint` | 否 | 商品生命周期状态 |
| `sort_order` | `integer` | 否 | 店铺运营排序值，越小越靠前 |
| `published_at` | `timestamptz(3)` | 是 | 首次上架时间 |
| `off_shelf_at` | `timestamptz(3)` | 是 | 最近一次下架时间 |
| `version` | `integer` | 否 | 乐观锁版本号 |
| 软删除与审计字段 | - | - | 遵循数据库固定字段规范 |

## 状态

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `0` | 草稿 | 商家编辑中，不对用户展示 |
| `1` | 待审核 | 已提交平台审核 |
| `2` | 上架 | 审核通过且允许销售 |
| `3` | 下架 | 商家主动或运营下架 |
| `4` | 审核拒绝 | 审核未通过，可修改后重新提交 |
| `5` | 平台禁用 | 平台强制停止销售 |

状态流转由 Service 明确校验，不能提供任意状态值直接覆盖的通用更新接口。上架状态必须存在 `published_at`。审核记录、拒绝原因和操作历史后续进入独立的商品审核记录表，不能覆盖在 SPU 主表中。

## 不进入 SPU 主表的数据

- `price`：价格属于 SKU；SPU 的最低价属于可重建的查询数据。
- `stock`：库存属于 SKU 和库存域，不能用 SPU 的单个数字表示。
- `sold_count`：从订单事实统计或写入查询模型，不作为交易依据。
- 规格值：由规格模板、SKU 和 SKU 规格关系表保存。
- 商品图集和视频：由 [`product_media`](product-media.md) 保存，`main_image_key` 仅用于高频列表查询。
- 商品详情：由一对一的 [`product_spu_detail`](product-spu-detail.md) 保存，避免低频大字段拖慢商品列表查询。
- 搜索分词和热度：由搜索索引保存，PostgreSQL 主表只保存事实数据。

## 索引与查询

- `(shop_id, lower(spu_code))` 保证店铺内商品编码唯一，逻辑删除后也不允许复用。
- `(category_id, status, published_at DESC, id DESC)` 支持分类商品分页。
- `(shop_id, status, updated_at DESC, id DESC)` 支持商家后台商品列表。
- `(status, sort_order, id)` 支持平台运营位查询。

所有列表都使用稳定的 `id` 作为最后排序键。数据规模增大后，用户侧搜索和复杂筛选进入 Elasticsearch/OpenSearch，不在主库上堆叠大量组合索引。

## 前台列表接口

`GET /products` 分页返回上架且未删除的商品 SPU，支持以下查询参数：

- `categoryCode`：可选；传任意层级分类编码时，聚合该分类及其全部启用后代分类。
- `page`：页码，从 `1` 开始，默认 `1`。
- `pageSize`：每页数量，范围 `1..100`，默认 `20`。

商品摘要返回叶子分类和完整 `categoryPathCodes`。公开接口不返回内部 `spuCode`、`categoryId`，也不为未建设的促销和销量统计预留空字段。`priceFen` 取启用 SKU 的最低基础售价；`stock` 从 SKU 库存模式和库存余额聚合，预约容量尚未建设时返回 `null`，不能从 SPU 或前端 Mock 生成交易数据。

## 前台详情接口

`GET /products/{productId}` 只查询上架且未删除的商品，并一次返回：

- SPU 基础信息、叶子分类和完整分类路径；
- 结构化详情文档、包装清单、使用说明和商品售后补充；
- 全部启用 SKU 各自的售价和库存状态；
- SPU 公共媒体和各 SKU 专属媒体，媒体对象 Key 转换为当前环境可访问 URL。

商品不存在或未上架时返回 HTTP 404。前端切换 SKU 时使用同一响应内的数据更新价格、库存和媒体，不为每次切换重复请求详情接口。

## 初始化与执行

建表脚本位于 [`database/init/005-create-product-spu.sql`](init/005-create-product-spu.sql)。已有本地数据库不会自动执行新增初始化脚本，需要手动执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/005-create-product-spu.sql
```

已经使用旧版 `main_image_url` 字段的数据库先执行兼容迁移，再重新执行商品种子脚本：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/007-migrate-product-main-image-key.sql
```

已经存在 `subtitle` 字段的数据库执行以下精简迁移：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/009-drop-product-subtitle.sql
```

前端 Demo 对应的 SPU 种子数据位于 [`database/init/006-seed-product-spu.sql`](init/006-seed-product-spu.sql)。脚本按 `shop_id + spu_code` 幂等写入，可重复执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/006-seed-product-spu.sql
```

Demo 使用固定的官方店铺 ID `900000000000000001`。主图保存 `product/demo/*.webp` 对象 Key，访问地址由 MinIO/S3 配置生成。价格、库存和销量分别属于 SKU、库存及查询模型，不写入 SPU 主表。

商品详情设计见 [`database/product-spu-detail.md`](product-spu-detail.md)，商品媒体设计见 [`database/product-media.md`](product-media.md)，SKU 设计见 [`database/product-sku.md`](product-sku.md)，库存设计见 [`database/inventory.md`](inventory.md)。

用于验证前端确实读取数据库的第 9 条商品位于 [`database/init/008-seed-product-integration-sample.sql`](init/008-seed-product-integration-sample.sql)。它使用编码 `PINOVA-STARTER-001`，主图和交易字段为空，与 8 条演示商品有明确区别。脚本按 `shop_id + spu_code` 幂等写入，可重复执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/008-seed-product-integration-sample.sql
```
