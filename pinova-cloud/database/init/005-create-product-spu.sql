CREATE TABLE pinova.product_spu (
    id                  bigint         NOT NULL,
    shop_id             bigint         NOT NULL,
    category_id         bigint         NOT NULL,
    spu_code            varchar(64)    NOT NULL,
    name                varchar(200)   NOT NULL,
    summary             varchar(512),
    product_type        smallint       NOT NULL DEFAULT 1,
    main_image_key      varchar(512),
    status              smallint       NOT NULL DEFAULT 0,
    sort_order          integer        NOT NULL DEFAULT 0,
    published_at        timestamptz(3),
    off_shelf_at        timestamptz(3),
    version             integer        NOT NULL DEFAULT 0,
    deleted             boolean        NOT NULL DEFAULT false,
    deleted_at          timestamptz(3),
    deleted_by          bigint,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_spu PRIMARY KEY (id),
    CONSTRAINT fk_product_spu_category
        FOREIGN KEY (category_id) REFERENCES pinova.product_category (id),
    CONSTRAINT ck_product_spu_code_not_blank CHECK (btrim(spu_code) <> ''),
    CONSTRAINT ck_product_spu_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_product_spu_summary_not_blank CHECK (
        summary IS NULL OR btrim(summary) <> ''
    ),
    CONSTRAINT ck_product_spu_main_image_key_not_blank CHECK (
        main_image_key IS NULL OR btrim(main_image_key) <> ''
    ),
    CONSTRAINT ck_product_spu_type CHECK (product_type IN (1, 2, 3)),
    CONSTRAINT ck_product_spu_status CHECK (status IN (0, 1, 2, 3, 4, 5)),
    CONSTRAINT ck_product_spu_sort_order CHECK (sort_order >= 0),
    CONSTRAINT ck_product_spu_published CHECK (
        status <> 2 OR published_at IS NOT NULL
    ),
    CONSTRAINT ck_product_spu_off_shelf_time CHECK (
        off_shelf_at IS NULL OR published_at IS NOT NULL
    ),
    CONSTRAINT ck_product_spu_version CHECK (version >= 0),
    CONSTRAINT ck_product_spu_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.product_spu IS '商品 SPU';
COMMENT ON COLUMN pinova.product_spu.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_spu.shop_id IS '所属店铺主键，业务归属字段，不是租户字段';
COMMENT ON COLUMN pinova.product_spu.category_id IS '平台叶子类目主键';
COMMENT ON COLUMN pinova.product_spu.spu_code IS '店铺内稳定且不可复用的商品编码';
COMMENT ON COLUMN pinova.product_spu.name IS '商品名称';
COMMENT ON COLUMN pinova.product_spu.summary IS '商品简短描述，不保存富文本详情';
COMMENT ON COLUMN pinova.product_spu.product_type IS '商品类型：1-实物，2-虚拟，3-服务';
COMMENT ON COLUMN pinova.product_spu.main_image_key IS '商品主图对象存储 Key';
COMMENT ON COLUMN pinova.product_spu.status IS '状态：0-草稿，1-待审核，2-上架，3-下架，4-审核拒绝，5-平台禁用';
COMMENT ON COLUMN pinova.product_spu.sort_order IS '店铺内运营排序值，值越小越靠前';
COMMENT ON COLUMN pinova.product_spu.published_at IS '首次上架时间';
COMMENT ON COLUMN pinova.product_spu.off_shelf_at IS '最近一次下架时间';
COMMENT ON COLUMN pinova.product_spu.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_spu.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.product_spu.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.product_spu.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.product_spu.created_at IS '创建时间';
COMMENT ON COLUMN pinova.product_spu.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.product_spu.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_spu.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_product_spu_shop_code
    ON pinova.product_spu (shop_id, lower(spu_code));

CREATE INDEX idx_product_spu_category_status_published_active
    ON pinova.product_spu (category_id, status, published_at DESC, id DESC)
    WHERE deleted = false;

CREATE INDEX idx_product_spu_shop_status_updated_active
    ON pinova.product_spu (shop_id, status, updated_at DESC, id DESC)
    WHERE deleted = false;

CREATE INDEX idx_product_spu_status_sort_active
    ON pinova.product_spu (status, sort_order, id)
    WHERE deleted = false;
