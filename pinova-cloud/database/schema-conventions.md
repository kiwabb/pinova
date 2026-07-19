# PostgreSQL 表设计规范

Pinova 使用 PostgreSQL。数据库对象采用小写蛇形命名，默认放在 `pinova` schema 中。

## 基础字段

所有业务表必须包含以下字段：

| 字段 | PostgreSQL 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 主键，非空 | 由应用生成，不使用数据库自增 |
| `created_at` | `timestamptz(3)` | 非空，默认当前时间 | 创建时间 |
| `created_by` | `bigint` | 非空，默认 `0` | 创建人，`0` 表示系统 |
| `updated_at` | `timestamptz(3)` | 非空，默认当前时间 | 最后更新时间 |
| `updated_by` | `bigint` | 非空，默认 `0` | 最后更新人，`0` 表示系统 |

标准定义：

```sql
id          bigint         NOT NULL,
created_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
created_by  bigint         NOT NULL DEFAULT 0,
updated_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by  bigint         NOT NULL DEFAULT 0,
CONSTRAINT pk_example PRIMARY KEY (id)
```

`updated_at` 由应用在更新数据时写入。PostgreSQL 不使用全局更新时间触发器，避免业务更新行为被数据库隐式修改。

## 软删除字段组

允许恢复或需要保留审计记录的可变业务表增加：

| 字段 | PostgreSQL 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `deleted` | `boolean` | 非空，默认 `false` | 逻辑删除标记 |
| `deleted_at` | `timestamptz(3)` | 可空 | 删除时间 |
| `deleted_by` | `bigint` | 可空 | 删除人 |

```sql
deleted     boolean        NOT NULL DEFAULT false,
deleted_at  timestamptz(3),
deleted_by  bigint,
CONSTRAINT ck_example_deleted
    CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
```

订单流水、支付流水、库存流水、审计日志等不可变记录不使用软删除。

软删除表的唯一约束使用部分唯一索引，只约束有效数据：

```sql
CREATE UNIQUE INDEX uk_example_code_active
    ON pinova.example (code)
    WHERE deleted = false;
```

## 乐观锁字段组

存在并发修改风险的聚合根增加：

```sql
version integer NOT NULL DEFAULT 0,
CONSTRAINT ck_example_version CHECK (version >= 0)
```

更新时必须在条件中携带旧版本并递增版本号：

```sql
UPDATE pinova.example
SET name = :name,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = :operator_id
WHERE id = :id
  AND version = :version;
```

## 命名与类型

- 表、字段、索引和约束统一使用小写蛇形命名。
- 表名使用业务域前缀，例如 `member_account`、`product_spu`、`trade_order`。
- 主键约束命名为 `pk_<table>`。
- 唯一索引命名为 `uk_<table>_<columns>`。
- 普通索引命名为 `idx_<table>_<columns>`。
- 外键约束命名为 `fk_<table>_<referenced_table>`。
- 时间点使用 `timestamptz(3)`，不使用无时区的 `timestamp`。
- 金额不使用 `real` 或 `double precision`。
- 状态值使用 `smallint` 或 `varchar`，不使用 PostgreSQL enum，避免状态扩展需要修改类型。
- 审计人字段不创建数据库外键，避免系统任务和用户数据生命周期造成耦合。
- 不为每个字段默认创建索引，索引必须对应明确的查询条件或排序需求。

## 建表示例

```sql
CREATE SCHEMA IF NOT EXISTS pinova;

CREATE TABLE pinova.example (
    id          bigint         NOT NULL,
    code        varchar(64)    NOT NULL,
    name        varchar(128)   NOT NULL,
    version     integer        NOT NULL DEFAULT 0,
    deleted     boolean        NOT NULL DEFAULT false,
    deleted_at  timestamptz(3),
    deleted_by  bigint,
    created_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  bigint         NOT NULL DEFAULT 0,
    updated_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_example PRIMARY KEY (id),
    CONSTRAINT ck_example_version CHECK (version >= 0),
    CONSTRAINT ck_example_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.example IS '建表规范示例';
COMMENT ON COLUMN pinova.example.id IS '主键';
COMMENT ON COLUMN pinova.example.code IS '业务编码';

CREATE UNIQUE INDEX uk_example_code_active
    ON pinova.example (code)
    WHERE deleted = false;
```
