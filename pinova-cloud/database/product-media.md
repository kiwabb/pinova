# 商品媒体表设计

`pinova.product_media` 保存 SPU 公共媒体和 SKU 专属媒体。商品详情页可以在用户切换 SKU 时切换对应图集，同时保留没有 SKU 差异的公共图片和视频。

## 归属模型

每条媒体只能有一个归属：

- `spu_id` 非空、`sku_id` 为空：SPU 公共媒体。
- `sku_id` 非空、`spu_id` 为空：SKU 专属媒体。

数据库通过 `num_nonnulls(spu_id, sku_id) = 1` 保证二选一，并分别建立真实外键。SKU 已经通过 `product_sku.spu_id` 归属 SPU，因此 SKU 媒体不重复保存 `spu_id`，从结构上杜绝错误的 SKU/SPU 组合。

## 字段

| 字段 | 类型 | 是否为空 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 否 | 应用生成的媒体主键 |
| `spu_id` | `bigint` | 是 | SPU 公共媒体归属 |
| `sku_id` | `bigint` | 是 | SKU 专属媒体归属 |
| `media_type` | `smallint` | 否 | `1` 图片、`2` 视频 |
| `media_role` | `smallint` | 否 | 媒体使用场景 |
| `object_key` | `varchar(512)` | 否 | MinIO/S3 对象 Key，不保存访问 URL |
| `cover_object_key` | `varchar(512)` | 是 | 视频封面对象 Key，图片必须为空 |
| `mime_type` | `varchar(100)` | 否 | 必须与媒体类型匹配 |
| `file_size_bytes` | `bigint` | 否 | 文件大小，单位字节 |
| `width`、`height` | `integer` | 否 | 媒体像素尺寸，用于避免页面布局跳动 |
| `duration_ms` | `integer` | 是 | 视频时长；图片必须为空 |
| `alt_text` | `varchar(255)` | 是 | 无障碍替代文本或内容说明 |
| `sort_order` | `integer` | 否 | 同一归属和角色内的排序值 |
| `status` | `smallint` | 否 | `0` 停用、`1` 启用 |
| `version` | `integer` | 否 | 乐观锁版本号 |
| 软删除与审计字段 | - | - | 遵循数据库固定字段规范 |

## 媒体角色

| 值 | 名称 | 用途 |
| --- | --- | --- |
| `1` | 主图 | 详情页首图，每个 SPU 或 SKU 最多一张启用主图 |
| `2` | 图集 | 商品轮播图，可保存多张图片或视频 |
| `3` | 详情素材 | 被 `product_spu_detail.detail_document` 引用的图片或视频 |
| `4` | 规格缩略图 | 颜色、款式等 SKU 选择器使用，只允许归属 SKU |

主图唯一性由部分唯一索引保证。`product_spu.main_image_key` 和 `product_sku.main_image_key` 继续作为列表接口的高频缓存字段，详情页以媒体表为准；媒体主图变更时由 Service 在同一事务内同步缓存字段。

## 前端展示规则

商品详情页先确定默认 SKU，再按以下顺序解析媒体：

1. 查询所选 SKU 启用且未删除的主图和图集。
2. SKU 有主图或图集时，使用完整的 SKU 专属集合。
3. SKU 没有专属集合时，回退使用 SPU 公共主图和图集。
4. SKU 选择器优先展示该 SKU 的规格缩略图，没有时回退 SKU 主图，再回退 SPU 主图。
5. 切换 SKU 时同步更新图片、价格、库存和购买按钮，并把选中 SKU 写入页面 URL 或页面状态。

媒体按 `media_role`、`sort_order`、`id` 稳定排序。接口返回由对象存储配置生成的可访问 URL，数据库和 API 写入模型只接受对象 Key。

## 数据一致性

- 同一归属不能重复关联同一个 `object_key`。
- 同一归属、角色和排序值不能重复。
- 图片必须使用 `image/*` MIME 类型，且不能填写封面或视频时长。
- 视频必须使用 `video/*` MIME 类型，并保存正数时长；封面可为空。
- 规格缩略图只能归属 SKU。
- 删除媒体记录时只逻辑删除引用关系；对象存储文件由异步清理任务确认无引用后删除。

## 初始化

建表脚本位于 [`database/init/017-create-product-media.sql`](init/017-create-product-media.sql)：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/017-create-product-media.sql
```

前端 Demo 的 SPU 公共媒体和 SKU 专属媒体由 [`database/init/018-seed-product-detail-media.sql`](init/018-seed-product-detail-media.sql) 幂等写入。
