CREATE TABLE pinova.product_category (
    id              bigint         NOT NULL,
    parent_id       bigint,
    category_code   varchar(64)    NOT NULL,
    name            varchar(64)    NOT NULL,
    level           smallint       NOT NULL,
    sort_order      integer        NOT NULL DEFAULT 0,
    icon_url        varchar(512),
    status          smallint       NOT NULL DEFAULT 1,
    version         integer        NOT NULL DEFAULT 0,
    deleted         boolean        NOT NULL DEFAULT false,
    deleted_at      timestamptz(3),
    deleted_by      bigint,
    created_at      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      bigint         NOT NULL DEFAULT 0,
    updated_at      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by      bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_category PRIMARY KEY (id),
    CONSTRAINT fk_product_category_parent
        FOREIGN KEY (parent_id) REFERENCES pinova.product_category (id),
    CONSTRAINT ck_product_category_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT ck_product_category_code_not_blank CHECK (btrim(category_code) <> ''),
    CONSTRAINT ck_product_category_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_product_category_level CHECK (level BETWEEN 1 AND 5),
    CONSTRAINT ck_product_category_root_level CHECK (
        (parent_id IS NULL AND level = 1)
        OR
        (parent_id IS NOT NULL AND level > 1)
    ),
    CONSTRAINT ck_product_category_sort_order CHECK (sort_order >= 0),
    CONSTRAINT ck_product_category_status CHECK (status IN (0, 1)),
    CONSTRAINT ck_product_category_version CHECK (version >= 0),
    CONSTRAINT ck_product_category_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.product_category IS '平台商品类目';
COMMENT ON COLUMN pinova.product_category.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_category.parent_id IS '父类目主键，根类目为空';
COMMENT ON COLUMN pinova.product_category.category_code IS '稳定业务编码，大小写不敏感且删除后不复用';
COMMENT ON COLUMN pinova.product_category.name IS '类目名称，同一父类目下大小写不敏感唯一';
COMMENT ON COLUMN pinova.product_category.level IS '类目层级，根类目为 1，最大为 5';
COMMENT ON COLUMN pinova.product_category.sort_order IS '同级排序值，值越小越靠前';
COMMENT ON COLUMN pinova.product_category.icon_url IS '类目图标资源地址';
COMMENT ON COLUMN pinova.product_category.status IS '类目状态：0-停用，1-启用';
COMMENT ON COLUMN pinova.product_category.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_category.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.product_category.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.product_category.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.product_category.created_at IS '创建时间';
COMMENT ON COLUMN pinova.product_category.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.product_category.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_category.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_product_category_code
    ON pinova.product_category (lower(category_code));

CREATE UNIQUE INDEX uk_product_category_parent_name_active
    ON pinova.product_category (parent_id, lower(name)) NULLS NOT DISTINCT
    WHERE deleted = false;

CREATE INDEX idx_product_category_parent_status_sort_active
    ON pinova.product_category (parent_id, status, sort_order, id)
    WHERE deleted = false;
