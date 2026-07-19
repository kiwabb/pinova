CREATE TABLE pinova.product_media (
    id                  bigint         NOT NULL,
    spu_id              bigint,
    sku_id              bigint,
    media_type          smallint       NOT NULL,
    media_role          smallint       NOT NULL,
    object_key          varchar(512)   NOT NULL,
    cover_object_key    varchar(512),
    mime_type           varchar(100)   NOT NULL,
    file_size_bytes     bigint         NOT NULL,
    width               integer        NOT NULL,
    height              integer        NOT NULL,
    duration_ms         integer,
    alt_text            varchar(255),
    sort_order          integer        NOT NULL DEFAULT 0,
    status              smallint       NOT NULL DEFAULT 1,
    version             integer        NOT NULL DEFAULT 0,
    deleted             boolean        NOT NULL DEFAULT false,
    deleted_at          timestamptz(3),
    deleted_by          bigint,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_media PRIMARY KEY (id),
    CONSTRAINT fk_product_media_spu
        FOREIGN KEY (spu_id) REFERENCES pinova.product_spu (id),
    CONSTRAINT fk_product_media_sku
        FOREIGN KEY (sku_id) REFERENCES pinova.product_sku (id),
    CONSTRAINT ck_product_media_owner
        CHECK (num_nonnulls(spu_id, sku_id) = 1),
    CONSTRAINT ck_product_media_type CHECK (media_type IN (1, 2)),
    CONSTRAINT ck_product_media_role CHECK (media_role IN (1, 2, 3, 4)),
    CONSTRAINT ck_product_media_spec_thumbnail_owner
        CHECK (media_role <> 4 OR sku_id IS NOT NULL),
    CONSTRAINT ck_product_media_object_key_not_blank
        CHECK (btrim(object_key) <> ''),
    CONSTRAINT ck_product_media_cover_key_not_blank
        CHECK (cover_object_key IS NULL OR btrim(cover_object_key) <> ''),
    CONSTRAINT ck_product_media_mime_type
        CHECK (
            (media_type = 1 AND lower(mime_type) LIKE 'image/%')
            OR (media_type = 2 AND lower(mime_type) LIKE 'video/%')
        ),
    CONSTRAINT ck_product_media_file_size CHECK (file_size_bytes > 0),
    CONSTRAINT ck_product_media_dimensions CHECK (width > 0 AND height > 0),
    CONSTRAINT ck_product_media_video_fields
        CHECK (
            (media_type = 1 AND cover_object_key IS NULL AND duration_ms IS NULL)
            OR (media_type = 2 AND duration_ms > 0)
        ),
    CONSTRAINT ck_product_media_alt_text_not_blank
        CHECK (alt_text IS NULL OR btrim(alt_text) <> ''),
    CONSTRAINT ck_product_media_sort_order CHECK (sort_order >= 0),
    CONSTRAINT ck_product_media_status CHECK (status IN (0, 1)),
    CONSTRAINT ck_product_media_version CHECK (version >= 0),
    CONSTRAINT ck_product_media_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.product_media IS '商品 SPU 公共媒体与 SKU 专属媒体';
COMMENT ON COLUMN pinova.product_media.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_media.spu_id IS 'SPU 公共媒体归属，与 sku_id 二选一';
COMMENT ON COLUMN pinova.product_media.sku_id IS 'SKU 专属媒体归属，与 spu_id 二选一';
COMMENT ON COLUMN pinova.product_media.media_type IS '媒体类型：1-图片，2-视频';
COMMENT ON COLUMN pinova.product_media.media_role IS '媒体角色：1-主图，2-图集，3-详情素材，4-规格缩略图';
COMMENT ON COLUMN pinova.product_media.object_key IS 'MinIO/S3 媒体对象 Key';
COMMENT ON COLUMN pinova.product_media.cover_object_key IS '视频封面对象 Key，图片必须为空';
COMMENT ON COLUMN pinova.product_media.mime_type IS '媒体 MIME 类型';
COMMENT ON COLUMN pinova.product_media.file_size_bytes IS '文件大小，单位字节';
COMMENT ON COLUMN pinova.product_media.width IS '媒体像素宽度';
COMMENT ON COLUMN pinova.product_media.height IS '媒体像素高度';
COMMENT ON COLUMN pinova.product_media.duration_ms IS '视频时长，单位毫秒，图片必须为空';
COMMENT ON COLUMN pinova.product_media.alt_text IS '图片替代文本或视频内容说明';
COMMENT ON COLUMN pinova.product_media.sort_order IS '同一归属和角色内的排序值';
COMMENT ON COLUMN pinova.product_media.status IS '状态：0-停用，1-启用';
COMMENT ON COLUMN pinova.product_media.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_media.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.product_media.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.product_media.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.product_media.created_at IS '创建时间';
COMMENT ON COLUMN pinova.product_media.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.product_media.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_media.updated_by IS '更新人，0 表示系统';

CREATE UNIQUE INDEX uk_product_media_spu_object_active
    ON pinova.product_media (spu_id, object_key)
    WHERE spu_id IS NOT NULL AND deleted = false;

CREATE UNIQUE INDEX uk_product_media_sku_object_active
    ON pinova.product_media (sku_id, object_key)
    WHERE sku_id IS NOT NULL AND deleted = false;

CREATE UNIQUE INDEX uk_product_media_spu_role_sort_active
    ON pinova.product_media (spu_id, media_role, sort_order)
    WHERE spu_id IS NOT NULL AND deleted = false;

CREATE UNIQUE INDEX uk_product_media_sku_role_sort_active
    ON pinova.product_media (sku_id, media_role, sort_order)
    WHERE sku_id IS NOT NULL AND deleted = false;

CREATE UNIQUE INDEX uk_product_media_spu_main_enabled
    ON pinova.product_media (spu_id)
    WHERE spu_id IS NOT NULL AND media_role = 1 AND status = 1 AND deleted = false;

CREATE UNIQUE INDEX uk_product_media_sku_main_enabled
    ON pinova.product_media (sku_id)
    WHERE sku_id IS NOT NULL AND media_role = 1 AND status = 1 AND deleted = false;

CREATE INDEX idx_product_media_spu_display_active
    ON pinova.product_media (spu_id, status, media_role, sort_order, id)
    WHERE spu_id IS NOT NULL AND deleted = false;

CREATE INDEX idx_product_media_sku_display_active
    ON pinova.product_media (sku_id, status, media_role, sort_order, id)
    WHERE sku_id IS NOT NULL AND deleted = false;
