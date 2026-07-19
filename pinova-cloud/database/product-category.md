# 商品类目表设计

`pinova.product_category` 保存 Pinova 平台统一维护的商品类目树。平台类目用于商品标准化、搜索筛选和属性模板归属，不属于某个店铺，因此不包含 `tenant_id`。

店铺用于装修和运营展示的自定义分类不应复用本表，后续单独设计 `shop_category` 及店铺分类与商品的关联表。

## 字段

| 字段 | 类型 | 是否为空 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 否 | 应用生成的主键 |
| `parent_id` | `bigint` | 是 | 父类目主键，根类目为 `NULL` |
| `category_code` | `varchar(64)` | 否 | 稳定业务编码，大小写不敏感且永久唯一 |
| `name` | `varchar(64)` | 否 | 类目名称，同一父类目下大小写不敏感唯一 |
| `level` | `smallint` | 否 | 层级，根类目为 `1`，最大为 `5` |
| `sort_order` | `integer` | 否 | 同级排序值，越小越靠前 |
| `icon_url` | `varchar(512)` | 是 | 类目图标资源地址 |
| `status` | `smallint` | 否 | `0` 停用、`1` 启用 |
| `version` | `integer` | 否 | 乐观锁版本号 |
| `deleted`、`deleted_at`、`deleted_by` | - | - | 逻辑删除字段组 |
| `created_at`、`created_by` | - | - | 创建审计字段组 |
| `updated_at`、`updated_by` | - | - | 更新审计字段组 |

## 树结构

本表使用邻接表模型，通过 `parent_id` 建立自关联：

```text
数码家电 level=1
├── 手机通讯 level=2
│   ├── 智能手机 level=3
│   └── 老人手机 level=3
└── 电脑办公 level=2
```

不保存以下冗余字段：

- `is_leaf`：是否叶子节点由有效子类目是否存在决定；
- `product_count`：商品数量由商品数据统计或缓存维护；
- `tree_path`：当前层级较浅，使用 PostgreSQL 递归 CTE 查询子树。

如果后续出现大量跨层级祖先、后代查询，再增加独立的类目闭包表，不能把逗号分隔的 ID 路径作为关联依据。

## 业务约束

- `category_code` 是外部集成和规则配置使用的稳定标识，逻辑删除后也不能复用。
- 根类目的 `parent_id` 必须为 `NULL` 且 `level` 必须为 `1`。
- 子类目的 `level` 必须等于父类目 `level + 1`，该跨行规则由 Service 在事务中校验。
- 移动类目时必须同时更新自身及全部后代的 `level`，并使用事务保证原子性。
- 存在未删除子类目时不能删除父类目；存在有效商品关联时不能删除对应类目。
- 停用类目不会删除历史商品关系，但禁止新商品选择该类目。
- 只有叶子类目可以直接关联商品，该规则由商品发布流程校验。
- 同级展示顺序按 `sort_order ASC, id ASC`，保证排序值相同时结果稳定。

## 前台读取接口

- `GET /product-categories/main` 只返回启用的一级分类摘要。
- `GET /product-categories/{parentCategoryId}/children` 只返回指定父分类的启用直接子分类。
- 每个摘要包含 `level` 和 `hasChildren`。前端根据 `hasChildren` 显示展开入口，并在用户展开时请求下一层。
- 分类商品页沿分类编码 URL 逐层读取当前分支；不得为了生成面包屑或侧边树一次查询完整递归树。

## 初始化与执行

建表脚本位于 [`database/init/003-create-product-category.sql`](init/003-create-product-category.sql)。已有本地数据库不会自动执行新增初始化脚本。

需要创建表时手动执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/003-create-product-category.sql
```

前端 Demo 对应的三级分类种子数据位于 [`database/init/004-seed-product-category.sql`](init/004-seed-product-category.sql)。脚本按 `category_code` 幂等写入，可重复执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/004-seed-product-category.sql
```
