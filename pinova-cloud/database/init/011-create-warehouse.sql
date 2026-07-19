CREATE TABLE pinova.warehouse (
    id                  bigint         NOT NULL,
    shop_id             bigint         NOT NULL,
    warehouse_code      varchar(64)    NOT NULL,
    name                varchar(128)   NOT NULL,
    warehouse_type      smallint       NOT NULL DEFAULT 1,
    status              smallint       NOT NULL DEFAULT 1,
    version             integer        NOT NULL DEFAULT 0,
    deleted             boolean        NOT NULL DEFAULT false,
    deleted_at          timestamptz(3),
    deleted_by          bigint,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_warehouse PRIMARY KEY (id),
    CONSTRAINT ck_warehouse_code_not_blank CHECK (btrim(warehouse_code) <> ''),
    CONSTRAINT ck_warehouse_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_warehouse_type CHECK (warehouse_type IN (1, 2)),
    CONSTRAINT ck_warehouse_status CHECK (status IN (0, 1)),
    CONSTRAINT ck_warehouse_version CHECK (version >= 0),
    CONSTRAINT ck_warehouse_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.warehouse IS '库存仓库或门店节点';
COMMENT ON COLUMN pinova.warehouse.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.warehouse.shop_id IS '所属店铺主键，业务归属字段，不是租户字段';
COMMENT ON COLUMN pinova.warehouse.warehouse_code IS '店铺内稳定且不可复用的仓库编码';
COMMENT ON COLUMN pinova.warehouse.name IS '仓库或门店名称';
COMMENT ON COLUMN pinova.warehouse.warehouse_type IS '类型：1-仓库，2-门店';
COMMENT ON COLUMN pinova.warehouse.status IS '状态：0-停用，1-启用';
COMMENT ON COLUMN pinova.warehouse.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.warehouse.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.warehouse.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.warehouse.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.warehouse.created_at IS '创建时间';
COMMENT ON COLUMN pinova.warehouse.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.warehouse.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.warehouse.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_warehouse_shop_code
    ON pinova.warehouse (shop_id, lower(warehouse_code));

CREATE INDEX idx_warehouse_shop_status_active
    ON pinova.warehouse (shop_id, status, id)
    WHERE deleted = false;
