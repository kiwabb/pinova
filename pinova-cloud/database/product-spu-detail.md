# 商品 SPU 详情表设计

`pinova.product_spu_detail` 与 `product_spu` 一对一，用于保存商品详情页需要的低频大字段。拆表后，商品列表只读取 SPU、SKU 和库存摘要，不加载详情正文。

## 数据边界

- 一个 SPU 最多一条详情记录，由 `spu_id` 唯一索引保证。
- 详情是 SPU 聚合内的从属数据，没有独立状态和删除生命周期，因此不增加软删除字段。SPU 逻辑删除后，详情保留并随 SPU 一起对外不可见。
- 商品名称、摘要、类型和主图仍属于 `product_spu`。
- 价格和可售单元属于 `product_sku`，库存数量属于库存域。
- 商品图集、视频及其排序由 [`product_media`](product-media.md) 保存；详情文档只引用对象存储 Key，不保存二进制或完整访问 URL。
- 平台统一售后政策不复制到每个商品，`after_sales_note` 只保存商品特有的补充说明。

## 字段

| 字段 | 类型 | 是否为空 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 否 | 应用生成的主键 |
| `spu_id` | `bigint` | 否 | SPU 主键，一对一唯一 |
| `content_schema_version` | `integer` | 否 | 详情文档结构版本，从 `1` 开始 |
| `detail_document` | `jsonb` | 否 | 结构化详情正文，根对象必须包含 `blocks` 数组 |
| `packing_list` | `text` | 是 | 实物包装清单或服务包含内容 |
| `usage_instructions` | `text` | 是 | 使用、制作或服务履约说明 |
| `after_sales_note` | `text` | 是 | 该商品特有的售后补充说明 |
| `version` | `integer` | 否 | 并发编辑使用的乐观锁版本号 |
| 审计字段 | - | 否 | 遵循数据库固定字段规范 |

`text` 字段为空时统一保存 `NULL`，不保存空字符串。

## 详情文档

详情正文使用结构化 JSON，而不是直接保存未经约束的 HTML。数据库只校验文档根节点和 `blocks` 数组，具体区块结构由应用层按 `content_schema_version` 校验。

```json
{
  "blocks": [
    {
      "type": "heading",
      "data": { "text": "套装内容", "level": 2 }
    },
    {
      "type": "paragraph",
      "data": { "text": "包含拼豆、拼板、镊子和熨烫纸。" }
    },
    {
      "type": "image",
      "data": {
        "objectKey": "product/detail/demo-kit-content.webp",
        "alt": "套装内容展示"
      }
    }
  ]
}
```

首期支持 `heading`、`paragraph`、`image` 和 `gallery` 区块。应用层必须限制区块数量、文本长度和允许的对象 Key；渲染时按区块白名单输出，不能把用户提交内容作为 HTML 直接注入页面。

## 查询与更新

- 商品详情接口先校验 SPU 已上架且未删除，再按 `spu_id` 查询详情。
- `spu_id` 唯一索引同时满足一对一约束和详情查询，不为 `jsonb` 建 GIN 索引。
- 商家编辑时使用 `version` 条件更新并递增版本，避免多个编辑页面互相覆盖。
- 没有详情记录时，前台返回空区块和空的可选说明，不将数据库实体直接暴露给接口层。

## 初始化

建表脚本位于 [`database/init/016-create-product-spu-detail.sql`](init/016-create-product-spu-detail.sql)：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/016-create-product-spu-detail.sql
```

前端 Demo 的详情内容由 [`database/init/018-seed-product-detail-media.sql`](init/018-seed-product-detail-media.sql) 幂等写入。
