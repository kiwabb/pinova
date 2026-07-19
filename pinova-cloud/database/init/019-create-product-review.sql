BEGIN;

CREATE TABLE pinova.product_review (
    id                      bigint         NOT NULL,
    shop_id                 bigint         NOT NULL,
    member_id               bigint         NOT NULL,
    order_id                bigint         NOT NULL,
    order_item_id           bigint         NOT NULL,
    sku_id                  bigint         NOT NULL,
    product_name_snapshot   varchar(200)   NOT NULL,
    sku_spec_snapshot       varchar(255),
    rating                  smallint       NOT NULL,
    content                 text,
    anonymous               boolean        NOT NULL DEFAULT false,
    status                  smallint       NOT NULL DEFAULT 0,
    moderation_reason       varchar(512),
    moderated_at            timestamptz(3),
    moderated_by            bigint,
    published_at            timestamptz(3),
    version                 integer        NOT NULL DEFAULT 0,
    deleted                 boolean        NOT NULL DEFAULT false,
    deleted_at              timestamptz(3),
    deleted_by              bigint,
    created_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              bigint         NOT NULL DEFAULT 0,
    updated_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by              bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_review PRIMARY KEY (id),
    CONSTRAINT fk_product_review_sku
        FOREIGN KEY (sku_id) REFERENCES pinova.product_sku (id),
    CONSTRAINT ck_product_review_product_name_not_blank
        CHECK (btrim(product_name_snapshot) <> ''),
    CONSTRAINT ck_product_review_sku_spec_not_blank
        CHECK (sku_spec_snapshot IS NULL OR btrim(sku_spec_snapshot) <> ''),
    CONSTRAINT ck_product_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_product_review_content
        CHECK (
            content IS NULL
            OR (btrim(content) <> '' AND char_length(content) <= 2000)
        ),
    CONSTRAINT ck_product_review_status CHECK (status IN (0, 1, 2, 3)),
    CONSTRAINT ck_product_review_moderation_state CHECK (
        (
            status = 0
            AND moderation_reason IS NULL
            AND moderated_at IS NULL
            AND moderated_by IS NULL
            AND published_at IS NULL
        )
        OR
        (
            status = 1
            AND moderation_reason IS NULL
            AND moderated_at IS NOT NULL
            AND moderated_by IS NOT NULL
            AND published_at IS NOT NULL
        )
        OR
        (
            status = 2
            AND moderation_reason IS NOT NULL
            AND btrim(moderation_reason) <> ''
            AND moderated_at IS NOT NULL
            AND moderated_by IS NOT NULL
            AND published_at IS NOT NULL
        )
        OR
        (
            status = 3
            AND moderation_reason IS NOT NULL
            AND btrim(moderation_reason) <> ''
            AND moderated_at IS NOT NULL
            AND moderated_by IS NOT NULL
            AND published_at IS NULL
        )
    ),
    CONSTRAINT ck_product_review_version CHECK (version >= 0),
    CONSTRAINT ck_product_review_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.product_review IS '商品订单项评价';
COMMENT ON COLUMN pinova.product_review.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_review.shop_id IS '订单成交时所属店铺主键，跨商家域逻辑引用';
COMMENT ON COLUMN pinova.product_review.member_id IS '评价会员主键，跨会员域逻辑引用';
COMMENT ON COLUMN pinova.product_review.order_id IS '交易订单主键，跨交易域逻辑引用';
COMMENT ON COLUMN pinova.product_review.order_item_id IS '交易订单项主键，每个订单项只能评价一次';
COMMENT ON COLUMN pinova.product_review.sku_id IS '被评价商品 SKU 主键';
COMMENT ON COLUMN pinova.product_review.product_name_snapshot IS '下单时商品名称快照';
COMMENT ON COLUMN pinova.product_review.sku_spec_snapshot IS '下单时 SKU 规格快照';
COMMENT ON COLUMN pinova.product_review.rating IS '综合评分：1-5 星';
COMMENT ON COLUMN pinova.product_review.content IS '评价正文，最多 2000 字，可为空';
COMMENT ON COLUMN pinova.product_review.anonymous IS '是否匿名展示';
COMMENT ON COLUMN pinova.product_review.status IS '状态：0-待审核，1-已发布，2-已隐藏，3-已拒绝';
COMMENT ON COLUMN pinova.product_review.moderation_reason IS '隐藏或拒绝原因，公开接口不返回';
COMMENT ON COLUMN pinova.product_review.moderated_at IS '最近审核时间';
COMMENT ON COLUMN pinova.product_review.moderated_by IS '最近审核人，0 表示系统审核';
COMMENT ON COLUMN pinova.product_review.published_at IS '首次发布时间';
COMMENT ON COLUMN pinova.product_review.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_review.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.product_review.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.product_review.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.product_review.created_at IS '评价提交时间';
COMMENT ON COLUMN pinova.product_review.created_by IS '创建人，通常为评价会员主键';
COMMENT ON COLUMN pinova.product_review.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_review.updated_by IS '最后更新人';

CREATE UNIQUE INDEX uk_product_review_order_item
    ON pinova.product_review (order_item_id);

CREATE INDEX idx_product_review_sku_status_published_active
    ON pinova.product_review (sku_id, status, published_at DESC, id DESC)
    WHERE deleted = false;

CREATE INDEX idx_product_review_member_created_active
    ON pinova.product_review (member_id, created_at DESC, id DESC)
    WHERE deleted = false;

CREATE INDEX idx_product_review_shop_status_created_active
    ON pinova.product_review (shop_id, status, created_at DESC, id DESC)
    WHERE deleted = false;

CREATE INDEX idx_product_review_pending_created_active
    ON pinova.product_review (created_at, id)
    WHERE status = 0 AND deleted = false;

CREATE TABLE pinova.product_review_media (
    id                  bigint         NOT NULL,
    review_id           bigint         NOT NULL,
    media_type          smallint       NOT NULL,
    object_key          varchar(512)   NOT NULL,
    cover_object_key    varchar(512),
    mime_type           varchar(100)   NOT NULL,
    file_size_bytes     bigint         NOT NULL,
    width               integer        NOT NULL,
    height              integer        NOT NULL,
    duration_ms         integer,
    alt_text            varchar(255),
    sort_order          integer        NOT NULL DEFAULT 0,
    status              smallint       NOT NULL DEFAULT 0,
    moderation_reason   varchar(512),
    moderated_at        timestamptz(3),
    moderated_by        bigint,
    version             integer        NOT NULL DEFAULT 0,
    deleted             boolean        NOT NULL DEFAULT false,
    deleted_at          timestamptz(3),
    deleted_by          bigint,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_review_media PRIMARY KEY (id),
    CONSTRAINT fk_product_review_media_review
        FOREIGN KEY (review_id) REFERENCES pinova.product_review (id),
    CONSTRAINT ck_product_review_media_type CHECK (media_type IN (1, 2)),
    CONSTRAINT ck_product_review_media_object_key_not_blank
        CHECK (btrim(object_key) <> ''),
    CONSTRAINT ck_product_review_media_cover_key_not_blank
        CHECK (cover_object_key IS NULL OR btrim(cover_object_key) <> ''),
    CONSTRAINT ck_product_review_media_mime_type CHECK (
        (media_type = 1 AND lower(mime_type) LIKE 'image/%')
        OR (media_type = 2 AND lower(mime_type) LIKE 'video/%')
    ),
    CONSTRAINT ck_product_review_media_file_size CHECK (file_size_bytes > 0),
    CONSTRAINT ck_product_review_media_dimensions CHECK (width > 0 AND height > 0),
    CONSTRAINT ck_product_review_media_video_fields CHECK (
        (media_type = 1 AND cover_object_key IS NULL AND duration_ms IS NULL)
        OR (media_type = 2 AND duration_ms > 0)
    ),
    CONSTRAINT ck_product_review_media_alt_text_not_blank
        CHECK (alt_text IS NULL OR btrim(alt_text) <> ''),
    CONSTRAINT ck_product_review_media_sort_order CHECK (sort_order >= 0),
    CONSTRAINT ck_product_review_media_status CHECK (status IN (0, 1, 2)),
    CONSTRAINT ck_product_review_media_moderation_state CHECK (
        (
            status = 0
            AND moderation_reason IS NULL
            AND moderated_at IS NULL
            AND moderated_by IS NULL
        )
        OR
        (
            status = 1
            AND moderation_reason IS NULL
            AND moderated_at IS NOT NULL
            AND moderated_by IS NOT NULL
        )
        OR
        (
            status = 2
            AND moderation_reason IS NOT NULL
            AND btrim(moderation_reason) <> ''
            AND moderated_at IS NOT NULL
            AND moderated_by IS NOT NULL
        )
    ),
    CONSTRAINT ck_product_review_media_version CHECK (version >= 0),
    CONSTRAINT ck_product_review_media_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.product_review_media IS '商品评价图片与视频';
COMMENT ON COLUMN pinova.product_review_media.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_review_media.review_id IS '所属商品评价主键';
COMMENT ON COLUMN pinova.product_review_media.media_type IS '媒体类型：1-图片，2-视频';
COMMENT ON COLUMN pinova.product_review_media.object_key IS 'MinIO/S3 媒体对象 Key';
COMMENT ON COLUMN pinova.product_review_media.cover_object_key IS '视频封面对象 Key，图片必须为空';
COMMENT ON COLUMN pinova.product_review_media.mime_type IS '媒体 MIME 类型';
COMMENT ON COLUMN pinova.product_review_media.file_size_bytes IS '文件大小，单位字节';
COMMENT ON COLUMN pinova.product_review_media.width IS '媒体像素宽度';
COMMENT ON COLUMN pinova.product_review_media.height IS '媒体像素高度';
COMMENT ON COLUMN pinova.product_review_media.duration_ms IS '视频时长，单位毫秒，图片必须为空';
COMMENT ON COLUMN pinova.product_review_media.alt_text IS '媒体内容说明';
COMMENT ON COLUMN pinova.product_review_media.sort_order IS '评价内展示顺序';
COMMENT ON COLUMN pinova.product_review_media.status IS '审核状态：0-待审核，1-可展示，2-已拒绝';
COMMENT ON COLUMN pinova.product_review_media.moderation_reason IS '媒体拒绝原因，公开接口不返回';
COMMENT ON COLUMN pinova.product_review_media.moderated_at IS '媒体审核时间';
COMMENT ON COLUMN pinova.product_review_media.moderated_by IS '媒体审核人，0 表示系统审核';
COMMENT ON COLUMN pinova.product_review_media.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_review_media.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.product_review_media.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.product_review_media.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.product_review_media.created_at IS '创建时间';
COMMENT ON COLUMN pinova.product_review_media.created_by IS '创建人，通常为评价会员主键';
COMMENT ON COLUMN pinova.product_review_media.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_review_media.updated_by IS '最后更新人';

CREATE UNIQUE INDEX uk_product_review_media_review_object_active
    ON pinova.product_review_media (review_id, object_key)
    WHERE deleted = false;

CREATE UNIQUE INDEX uk_product_review_media_review_sort_active
    ON pinova.product_review_media (review_id, sort_order)
    WHERE deleted = false;

CREATE INDEX idx_product_review_media_review_status_active
    ON pinova.product_review_media (review_id, status, sort_order, id)
    WHERE deleted = false;

COMMIT;
