CREATE TABLE pinova.product_sku (
    id                  bigint         NOT NULL,
    spu_id              bigint         NOT NULL,
    sku_code            varchar(64)    NOT NULL,
    spec_summary        varchar(255),
    sale_price_fen      bigint         NOT NULL,
    inventory_mode      smallint       NOT NULL DEFAULT 1,
    main_image_key      varchar(512),
    barcode             varchar(64),
    status              smallint       NOT NULL DEFAULT 1,
    sort_order          integer        NOT NULL DEFAULT 0,
    version             integer        NOT NULL DEFAULT 0,
    deleted             boolean        NOT NULL DEFAULT false,
    deleted_at          timestamptz(3),
    deleted_by          bigint,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_sku PRIMARY KEY (id),
    CONSTRAINT fk_product_sku_spu
        FOREIGN KEY (spu_id) REFERENCES pinova.product_spu (id),
    CONSTRAINT ck_product_sku_code_not_blank CHECK (btrim(sku_code) <> ''),
    CONSTRAINT ck_product_sku_spec_summary_not_blank CHECK (
        spec_summary IS NULL OR btrim(spec_summary) <> ''
    ),
    CONSTRAINT ck_product_sku_sale_price CHECK (sale_price_fen >= 0),
    CONSTRAINT ck_product_sku_inventory_mode CHECK (inventory_mode IN (1, 2, 3)),
    CONSTRAINT ck_product_sku_main_image_key_not_blank CHECK (
        main_image_key IS NULL OR btrim(main_image_key) <> ''
    ),
    CONSTRAINT ck_product_sku_barcode_not_blank CHECK (
        barcode IS NULL OR btrim(barcode) <> ''
    ),
    CONSTRAINT ck_product_sku_status CHECK (status IN (0, 1)),
    CONSTRAINT ck_product_sku_sort_order CHECK (sort_order >= 0),
    CONSTRAINT ck_product_sku_version CHECK (version >= 0),
    CONSTRAINT ck_product_sku_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.product_sku IS '商品销售单元 SKU';
COMMENT ON COLUMN pinova.product_sku.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_sku.spu_id IS '所属商品 SPU 主键';
COMMENT ON COLUMN pinova.product_sku.sku_code IS 'SPU 内稳定且不可复用的 SKU 编码';
COMMENT ON COLUMN pinova.product_sku.spec_summary IS '规格摘要，例如颜色和尺寸组合';
COMMENT ON COLUMN pinova.product_sku.sale_price_fen IS '销售价，单位为分';
COMMENT ON COLUMN pinova.product_sku.inventory_mode IS '库存模式：1-跟踪库存，2-无限库存，3-预约容量';
COMMENT ON COLUMN pinova.product_sku.main_image_key IS 'SKU 主图对象存储 Key';
COMMENT ON COLUMN pinova.product_sku.barcode IS '商品条码';
COMMENT ON COLUMN pinova.product_sku.status IS '状态：0-停用，1-启用';
COMMENT ON COLUMN pinova.product_sku.sort_order IS 'SPU 内排序值，值越小越靠前';
COMMENT ON COLUMN pinova.product_sku.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_sku.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.product_sku.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.product_sku.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.product_sku.created_at IS '创建时间';
COMMENT ON COLUMN pinova.product_sku.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.product_sku.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_sku.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_product_sku_spu_code
    ON pinova.product_sku (spu_id, lower(sku_code));

CREATE UNIQUE INDEX uk_product_sku_barcode
    ON pinova.product_sku (barcode)
    WHERE barcode IS NOT NULL;

CREATE INDEX idx_product_sku_spu_status_price_active
    ON pinova.product_sku (spu_id, status, sale_price_fen, id)
    WHERE deleted = false;
