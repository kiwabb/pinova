# 商品评价表设计

商品评价由 `pinova.product_review` 和 `pinova.product_review_media` 组成。评价主表保存订单项评价事实，媒体表保存用户上传的图片和视频。一个已成交订单项最多产生一条评价。

## 领域边界

- 评价必须来源于已完成且允许评价的订单项，创建时由 Service 调用交易域校验 `member_id`、`order_id`、`order_item_id` 和 `sku_id` 的归属关系。
- `order_id`、`order_item_id`、`member_id` 和 `shop_id` 是跨域逻辑引用，不建立数据库外键。
- `sku_id` 与评价同属商品域，建立到 `product_sku` 的数据库外键。SPU 通过 SKU 关系获得，不在评价表重复保存 `spu_id`。
- 商品名称和规格保存下单快照，商品或 SKU 后续改名不会改变历史评价语境。
- 用户删除评价使用逻辑删除，但 `order_item_id` 永久唯一，删除后也不能重新评价同一订单项。

## 评价主表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigint` | 应用生成的评价主键 |
| `shop_id` | `bigint` | 成交店铺主键，跨域逻辑引用 |
| `member_id` | `bigint` | 评价会员主键，跨域逻辑引用 |
| `order_id` | `bigint` | 交易订单主键，跨域逻辑引用 |
| `order_item_id` | `bigint` | 交易订单项主键，全表唯一且不可复用 |
| `sku_id` | `bigint` | 被评价 SKU 主键 |
| `product_name_snapshot` | `varchar(200)` | 下单时商品名称快照 |
| `sku_spec_snapshot` | `varchar(255)` | 下单时规格快照，可为空 |
| `rating` | `smallint` | 综合评分，范围 `1..5` |
| `content` | `text` | 评价正文，最多 2000 字，可只评分不写正文 |
| `anonymous` | `boolean` | 是否匿名展示 |
| `status` | `smallint` | 评价审核和展示状态 |
| `moderation_reason` | `varchar(512)` | 隐藏或拒绝原因，仅内部使用 |
| `moderated_at`、`moderated_by` | - | 最近审核时间和审核人 |
| `published_at` | `timestamptz(3)` | 首次发布时间 |
| `version` | `integer` | 并发审核和编辑使用的乐观锁版本 |
| 软删除与审计字段 | - | 遵循数据库固定字段规范 |

### 评价状态

| 值 | 名称 | 说明 |
| --- | --- | --- |
| `0` | 待审核 | 用户已提交，尚未对外展示 |
| `1` | 已发布 | 审核通过，可以对外展示 |
| `2` | 已隐藏 | 曾经发布，之后因风控或运营原因隐藏 |
| `3` | 已拒绝 | 审核未通过，从未发布 |

审核通过可以由系统执行，此时 `moderated_by = 0`。隐藏和拒绝必须填写内部原因；公开接口不能返回审核原因、审核人或内部审计字段。

## 评价媒体表

`product_review_media` 一对多关联评价，支持图片和视频。对象存储只保存 Object Key，访问 URL 由接口层根据环境配置生成。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `review_id` | `bigint` | 所属评价主键 |
| `media_type` | `smallint` | `1` 图片、`2` 视频 |
| `object_key` | `varchar(512)` | MinIO/S3 对象 Key |
| `cover_object_key` | `varchar(512)` | 视频封面 Key，图片必须为空 |
| `mime_type` | `varchar(100)` | 必须与媒体类型匹配 |
| `file_size_bytes` | `bigint` | 文件大小，单位字节 |
| `width`、`height` | `integer` | 媒体像素尺寸 |
| `duration_ms` | `integer` | 视频时长，图片必须为空 |
| `alt_text` | `varchar(255)` | 媒体内容说明 |
| `sort_order` | `integer` | 评价内展示顺序 |
| `status` | `smallint` | `0` 待审核、`1` 可展示、`2` 已拒绝 |
| 审核、乐观锁、软删除与审计字段 | - | 媒体可以独立审核和隐藏 |

应用层限制每条评价最多上传 9 个媒体，图片和视频还需限制 MIME、文件大小、像素尺寸和视频时长。删除数据库引用后，对象存储文件由异步清理任务确认无引用再删除。

## 查询与统计

- 商品详情页先取得 SPU 下的 SKU ID，再按 `sku_id + status + published_at` 游标分页查询已发布评价。
- 用户评价列表按 `member_id + created_at` 查询。
- 商家审核后台按 `shop_id + status + created_at` 查询。
- 平均分、评分分布和评价数属于可重建的查询模型，不能在评价主表维护可并发覆盖的计数字段。
- 商家回复使用后续的一对一 `product_review_reply` 表；追评使用 `product_review_follow_up`；“有帮助”使用带会员唯一约束的投票表。

匿名只影响公开展示名称，不影响 `member_id` 的真实归属。公开接口必须使用统一脱敏规则，不能把会员实体直接返回前端。

## 初始化

建表脚本位于 [`database/init/019-create-product-review.sql`](init/019-create-product-review.sql)：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/019-create-product-review.sql
```
