CREATE TABLE pinova.member_shipping_address (
    id              bigint         NOT NULL,
    member_id       bigint         NOT NULL,
    receiver_name   varchar(64)    NOT NULL,
    receiver_mobile varchar(32)    NOT NULL,
    country_code    varchar(2)     NOT NULL DEFAULT 'CN',
    province_code   varchar(32)    NOT NULL,
    province_name   varchar(64)    NOT NULL,
    city_code       varchar(32)    NOT NULL,
    city_name       varchar(64)    NOT NULL,
    district_code   varchar(32)    NOT NULL,
    district_name   varchar(64)    NOT NULL,
    detail_address  varchar(255)   NOT NULL,
    postal_code     varchar(16),
    label           varchar(32),
    is_default      boolean        NOT NULL DEFAULT false,
    version         integer        NOT NULL DEFAULT 0,
    deleted         boolean        NOT NULL DEFAULT false,
    deleted_at      timestamptz(3),
    deleted_by      bigint,
    created_at      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      bigint         NOT NULL DEFAULT 0,
    updated_at      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by      bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_member_shipping_address PRIMARY KEY (id),
    CONSTRAINT fk_member_shipping_address_member_account
        FOREIGN KEY (member_id) REFERENCES pinova.member_account (id),
    CONSTRAINT ck_member_shipping_address_receiver_name_not_blank
        CHECK (btrim(receiver_name) <> ''),
    CONSTRAINT ck_member_shipping_address_receiver_mobile_not_blank
        CHECK (btrim(receiver_mobile) <> ''),
    CONSTRAINT ck_member_shipping_address_country_code
        CHECK (country_code ~ '^[A-Z]{2}$'),
    CONSTRAINT ck_member_shipping_address_province_code_not_blank
        CHECK (btrim(province_code) <> ''),
    CONSTRAINT ck_member_shipping_address_province_name_not_blank
        CHECK (btrim(province_name) <> ''),
    CONSTRAINT ck_member_shipping_address_city_code_not_blank
        CHECK (btrim(city_code) <> ''),
    CONSTRAINT ck_member_shipping_address_city_name_not_blank
        CHECK (btrim(city_name) <> ''),
    CONSTRAINT ck_member_shipping_address_district_code_not_blank
        CHECK (btrim(district_code) <> ''),
    CONSTRAINT ck_member_shipping_address_district_name_not_blank
        CHECK (btrim(district_name) <> ''),
    CONSTRAINT ck_member_shipping_address_detail_not_blank
        CHECK (btrim(detail_address) <> ''),
    CONSTRAINT ck_member_shipping_address_postal_code_not_blank
        CHECK (postal_code IS NULL OR btrim(postal_code) <> ''),
    CONSTRAINT ck_member_shipping_address_label_not_blank
        CHECK (label IS NULL OR btrim(label) <> ''),
    CONSTRAINT ck_member_shipping_address_version CHECK (version >= 0),
    CONSTRAINT ck_member_shipping_address_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.member_shipping_address IS '会员收货地址';
COMMENT ON COLUMN pinova.member_shipping_address.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.member_shipping_address.member_id IS '所属会员主键';
COMMENT ON COLUMN pinova.member_shipping_address.receiver_name IS '收货人姓名';
COMMENT ON COLUMN pinova.member_shipping_address.receiver_mobile IS '收货人手机号，应用层统一为国际格式';
COMMENT ON COLUMN pinova.member_shipping_address.country_code IS 'ISO 3166-1 alpha-2 国家代码，首期默认 CN';
COMMENT ON COLUMN pinova.member_shipping_address.province_code IS '省级行政区稳定代码';
COMMENT ON COLUMN pinova.member_shipping_address.province_name IS '省级行政区展示名称';
COMMENT ON COLUMN pinova.member_shipping_address.city_code IS '市级行政区稳定代码';
COMMENT ON COLUMN pinova.member_shipping_address.city_name IS '市级行政区展示名称';
COMMENT ON COLUMN pinova.member_shipping_address.district_code IS '区县级行政区稳定代码';
COMMENT ON COLUMN pinova.member_shipping_address.district_name IS '区县级行政区展示名称';
COMMENT ON COLUMN pinova.member_shipping_address.detail_address IS '街道、门牌号等详细地址';
COMMENT ON COLUMN pinova.member_shipping_address.postal_code IS '邮政编码，可为空';
COMMENT ON COLUMN pinova.member_shipping_address.label IS '地址标签，例如家或公司，可为空';
COMMENT ON COLUMN pinova.member_shipping_address.is_default IS '是否为会员当前默认收货地址';
COMMENT ON COLUMN pinova.member_shipping_address.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.member_shipping_address.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.member_shipping_address.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.member_shipping_address.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.member_shipping_address.created_at IS '创建时间';
COMMENT ON COLUMN pinova.member_shipping_address.created_by IS '创建人，通常为所属会员主键';
COMMENT ON COLUMN pinova.member_shipping_address.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.member_shipping_address.updated_by IS '最后更新人';

CREATE UNIQUE INDEX uk_member_shipping_address_default_active
    ON pinova.member_shipping_address (member_id)
    WHERE is_default = true AND deleted = false;

CREATE INDEX idx_member_shipping_address_member_updated_active
    ON pinova.member_shipping_address (member_id, updated_at DESC, id DESC)
    WHERE deleted = false;
