CREATE TABLE pinova.inventory_stock (
    id                  bigint         NOT NULL,
    warehouse_id        bigint         NOT NULL,
    sku_id              bigint         NOT NULL,
    on_hand_quantity    bigint         NOT NULL DEFAULT 0,
    reserved_quantity   bigint         NOT NULL DEFAULT 0,
    version             integer        NOT NULL DEFAULT 0,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_inventory_stock PRIMARY KEY (id),
    CONSTRAINT fk_inventory_stock_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES pinova.warehouse (id),
    CONSTRAINT ck_inventory_stock_on_hand CHECK (on_hand_quantity >= 0),
    CONSTRAINT ck_inventory_stock_reserved CHECK (reserved_quantity >= 0),
    CONSTRAINT ck_inventory_stock_balance CHECK (reserved_quantity <= on_hand_quantity),
    CONSTRAINT ck_inventory_stock_version CHECK (version >= 0),
    CONSTRAINT uk_inventory_stock_warehouse_sku UNIQUE (warehouse_id, sku_id)
);

COMMENT ON TABLE pinova.inventory_stock IS 'SKU 库存余额';
COMMENT ON COLUMN pinova.inventory_stock.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.inventory_stock.warehouse_id IS '库存所在仓库或门店主键';
COMMENT ON COLUMN pinova.inventory_stock.sku_id IS '商品 SKU 主键，跨商品域逻辑引用';
COMMENT ON COLUMN pinova.inventory_stock.on_hand_quantity IS '现存数量';
COMMENT ON COLUMN pinova.inventory_stock.reserved_quantity IS '订单等业务已锁定数量';
COMMENT ON COLUMN pinova.inventory_stock.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.inventory_stock.created_at IS '创建时间';
COMMENT ON COLUMN pinova.inventory_stock.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.inventory_stock.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.inventory_stock.updated_by IS '最后更新人，0 表示系统';

CREATE INDEX idx_inventory_stock_sku
    ON pinova.inventory_stock (sku_id, warehouse_id);
