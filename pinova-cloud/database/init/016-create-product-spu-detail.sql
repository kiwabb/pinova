CREATE TABLE pinova.product_spu_detail (
    id                      bigint         NOT NULL,
    spu_id                  bigint         NOT NULL,
    content_schema_version  integer        NOT NULL DEFAULT 1,
    detail_document         jsonb          NOT NULL DEFAULT '{"blocks": []}'::jsonb,
    packing_list            text,
    usage_instructions      text,
    after_sales_note        text,
    version                 integer        NOT NULL DEFAULT 0,
    created_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              bigint         NOT NULL DEFAULT 0,
    updated_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by              bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_spu_detail PRIMARY KEY (id),
    CONSTRAINT fk_product_spu_detail_spu
        FOREIGN KEY (spu_id) REFERENCES pinova.product_spu (id),
    CONSTRAINT ck_product_spu_detail_schema_version
        CHECK (content_schema_version > 0),
    CONSTRAINT ck_product_spu_detail_document_object
        CHECK (jsonb_typeof(detail_document) = 'object'),
    CONSTRAINT ck_product_spu_detail_document_blocks
        CHECK (
            detail_document ? 'blocks'
            AND jsonb_typeof(detail_document -> 'blocks') = 'array'
        ),
    CONSTRAINT ck_product_spu_detail_packing_list_not_blank
        CHECK (packing_list IS NULL OR btrim(packing_list) <> ''),
    CONSTRAINT ck_product_spu_detail_usage_instructions_not_blank
        CHECK (usage_instructions IS NULL OR btrim(usage_instructions) <> ''),
    CONSTRAINT ck_product_spu_detail_after_sales_note_not_blank
        CHECK (after_sales_note IS NULL OR btrim(after_sales_note) <> ''),
    CONSTRAINT ck_product_spu_detail_version CHECK (version >= 0)
);

COMMENT ON TABLE pinova.product_spu_detail IS '商品 SPU 详情，一对一保存前台详情内容';
COMMENT ON COLUMN pinova.product_spu_detail.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.product_spu_detail.spu_id IS '商品 SPU 主键，每个 SPU 最多一条详情';
COMMENT ON COLUMN pinova.product_spu_detail.content_schema_version IS '详情文档结构版本';
COMMENT ON COLUMN pinova.product_spu_detail.detail_document IS '结构化详情文档，根对象必须包含 blocks 数组';
COMMENT ON COLUMN pinova.product_spu_detail.packing_list IS '包装清单或服务包含内容';
COMMENT ON COLUMN pinova.product_spu_detail.usage_instructions IS '使用、制作或履约说明';
COMMENT ON COLUMN pinova.product_spu_detail.after_sales_note IS '该商品特有的售后补充说明';
COMMENT ON COLUMN pinova.product_spu_detail.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.product_spu_detail.created_at IS '创建时间';
COMMENT ON COLUMN pinova.product_spu_detail.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.product_spu_detail.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.product_spu_detail.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_product_spu_detail_spu
    ON pinova.product_spu_detail (spu_id);
