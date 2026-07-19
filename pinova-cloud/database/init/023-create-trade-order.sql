BEGIN;

CREATE TABLE pinova.trade_order (
    id                      bigint         NOT NULL,
    order_no                varchar(64)    NOT NULL,
    checkout_no             varchar(64)    NOT NULL,
    request_hash            varchar(64)    NOT NULL,
    member_id               bigint         NOT NULL,
    shop_id                 bigint         NOT NULL,
    source_cart_id          bigint         NOT NULL,
    fulfillment_type        smallint       NOT NULL,
    currency_code           varchar(3)     NOT NULL DEFAULT 'CNY',
    goods_amount_fen        bigint         NOT NULL,
    discount_amount_fen     bigint         NOT NULL DEFAULT 0,
    shipping_amount_fen     bigint         NOT NULL DEFAULT 0,
    payable_amount_fen      bigint         NOT NULL,
    paid_amount_fen         bigint         NOT NULL DEFAULT 0,
    buyer_remark            varchar(500),
    status                  smallint       NOT NULL DEFAULT 0,
    submitted_at            timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_expires_at      timestamptz(3),
    paid_at                 timestamptz(3),
    fulfillment_started_at  timestamptz(3),
    completed_at            timestamptz(3),
    closed_at               timestamptz(3),
    close_reason_code       smallint,
    close_reason            varchar(255),
    version                 integer        NOT NULL DEFAULT 0,
    created_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              bigint         NOT NULL DEFAULT 0,
    updated_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by              bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_trade_order PRIMARY KEY (id),
    CONSTRAINT ck_trade_order_no_not_blank CHECK (btrim(order_no) <> ''),
    CONSTRAINT ck_trade_order_checkout_no_not_blank CHECK (btrim(checkout_no) <> ''),
    CONSTRAINT ck_trade_order_request_hash CHECK (
        request_hash ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT ck_trade_order_fulfillment_type CHECK (fulfillment_type IN (1, 2, 3)),
    CONSTRAINT ck_trade_order_currency_code CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_trade_order_amounts_non_negative CHECK (
        goods_amount_fen >= 0
        AND discount_amount_fen >= 0
        AND shipping_amount_fen >= 0
        AND payable_amount_fen >= 0
        AND paid_amount_fen >= 0
    ),
    CONSTRAINT ck_trade_order_discount_amount CHECK (
        discount_amount_fen <= goods_amount_fen
    ),
    CONSTRAINT ck_trade_order_payable_amount CHECK (
        payable_amount_fen = goods_amount_fen - discount_amount_fen + shipping_amount_fen
    ),
    CONSTRAINT ck_trade_order_paid_amount CHECK (
        paid_amount_fen <= payable_amount_fen
        AND (
            (status IN (0, 4) AND paid_amount_fen = 0)
            OR
            (status IN (1, 2, 3) AND paid_amount_fen = payable_amount_fen)
        )
    ),
    CONSTRAINT ck_trade_order_buyer_remark_not_blank CHECK (
        buyer_remark IS NULL OR btrim(buyer_remark) <> ''
    ),
    CONSTRAINT ck_trade_order_status CHECK (status IN (0, 1, 2, 3, 4)),
    CONSTRAINT ck_trade_order_close_reason_code CHECK (
        close_reason_code IS NULL OR close_reason_code IN (1, 2, 3, 4, 5)
    ),
    CONSTRAINT ck_trade_order_close_reason_not_blank CHECK (
        close_reason IS NULL OR btrim(close_reason) <> ''
    ),
    CONSTRAINT ck_trade_order_payment_expiry CHECK (
        (payment_expires_at IS NULL OR payment_expires_at > submitted_at)
        AND (
            status NOT IN (0, 4)
            OR (payable_amount_fen > 0 AND payment_expires_at IS NOT NULL)
        )
    ),
    CONSTRAINT ck_trade_order_lifecycle CHECK (
        (
            status = 0
            AND paid_at IS NULL
            AND fulfillment_started_at IS NULL
            AND completed_at IS NULL
            AND closed_at IS NULL
            AND close_reason_code IS NULL
            AND close_reason IS NULL
        )
        OR
        (
            status = 1
            AND paid_at IS NOT NULL
            AND fulfillment_started_at IS NULL
            AND completed_at IS NULL
            AND closed_at IS NULL
            AND close_reason_code IS NULL
            AND close_reason IS NULL
        )
        OR
        (
            status = 2
            AND paid_at IS NOT NULL
            AND fulfillment_started_at IS NOT NULL
            AND completed_at IS NULL
            AND closed_at IS NULL
            AND close_reason_code IS NULL
            AND close_reason IS NULL
        )
        OR
        (
            status = 3
            AND paid_at IS NOT NULL
            AND fulfillment_started_at IS NOT NULL
            AND completed_at IS NOT NULL
            AND closed_at IS NULL
            AND close_reason_code IS NULL
            AND close_reason IS NULL
        )
        OR
        (
            status = 4
            AND paid_at IS NULL
            AND fulfillment_started_at IS NULL
            AND completed_at IS NULL
            AND closed_at IS NOT NULL
            AND close_reason_code IS NOT NULL
        )
    ),
    CONSTRAINT ck_trade_order_milestone_order CHECK (
        submitted_at >= created_at
        AND (paid_at IS NULL OR paid_at >= submitted_at)
        AND (
            fulfillment_started_at IS NULL
            OR fulfillment_started_at >= paid_at
        )
        AND (
            completed_at IS NULL
            OR completed_at >= fulfillment_started_at
        )
        AND (closed_at IS NULL OR closed_at >= submitted_at)
    ),
    CONSTRAINT ck_trade_order_version CHECK (version >= 0)
);

COMMENT ON TABLE pinova.trade_order IS '交易订单聚合根，每行只属于一个店铺和一种履约类型';
COMMENT ON COLUMN pinova.trade_order.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.trade_order.order_no IS '面向用户和运营的全局唯一订单号';
COMMENT ON COLUMN pinova.trade_order.checkout_no IS '同一次结算提交的全局编号和幂等键';
COMMENT ON COLUMN pinova.trade_order.request_hash IS '规范化订单提交载荷的 SHA-256 十六进制哈希';
COMMENT ON COLUMN pinova.trade_order.member_id IS '下单会员主键，跨会员域逻辑引用';
COMMENT ON COLUMN pinova.trade_order.shop_id IS '成交店铺主键，跨商家域逻辑引用';
COMMENT ON COLUMN pinova.trade_order.source_cart_id IS '来源购物车主键，跨购物车聚合逻辑引用';
COMMENT ON COLUMN pinova.trade_order.fulfillment_type IS '履约类型：1-实物配送，2-数字交付，3-到店服务';
COMMENT ON COLUMN pinova.trade_order.currency_code IS 'ISO 4217 币种代码，首期固定为 CNY';
COMMENT ON COLUMN pinova.trade_order.goods_amount_fen IS '商品行原价合计，单位为分';
COMMENT ON COLUMN pinova.trade_order.discount_amount_fen IS '订单优惠合计，单位为分；首期固定为 0';
COMMENT ON COLUMN pinova.trade_order.shipping_amount_fen IS '运费，单位为分；首期固定为 0';
COMMENT ON COLUMN pinova.trade_order.payable_amount_fen IS '应付金额，单位为分';
COMMENT ON COLUMN pinova.trade_order.paid_amount_fen IS '已支付金额，单位为分；支付接入前为 0';
COMMENT ON COLUMN pinova.trade_order.buyer_remark IS '买家订单备注，最多 500 字符';
COMMENT ON COLUMN pinova.trade_order.status IS '状态：0-待支付，1-待履约，2-履约中，3-已完成，4-已关闭';
COMMENT ON COLUMN pinova.trade_order.submitted_at IS '订单提交时间';
COMMENT ON COLUMN pinova.trade_order.payment_expires_at IS '待支付订单自动关闭时间';
COMMENT ON COLUMN pinova.trade_order.paid_at IS '支付完成时间，零元订单为确认免支付时间';
COMMENT ON COLUMN pinova.trade_order.fulfillment_started_at IS '履约开始时间';
COMMENT ON COLUMN pinova.trade_order.completed_at IS '订单完成时间';
COMMENT ON COLUMN pinova.trade_order.closed_at IS '未支付订单关闭时间';
COMMENT ON COLUMN pinova.trade_order.close_reason_code IS '关闭原因：1-用户取消，2-支付超时，3-商家关闭，4-风控关闭，5-系统异常';
COMMENT ON COLUMN pinova.trade_order.close_reason IS '关闭原因补充说明，可为空';
COMMENT ON COLUMN pinova.trade_order.version IS '订单状态并发更新使用的乐观锁版本';
COMMENT ON COLUMN pinova.trade_order.created_at IS '创建时间';
COMMENT ON COLUMN pinova.trade_order.created_by IS '创建人，通常为下单会员主键';
COMMENT ON COLUMN pinova.trade_order.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.trade_order.updated_by IS '最后更新人，系统任务为 0';

CREATE UNIQUE INDEX uk_trade_order_order_no
    ON pinova.trade_order (order_no);

CREATE UNIQUE INDEX uk_trade_order_checkout_shop_fulfillment
    ON pinova.trade_order (checkout_no, shop_id, fulfillment_type);

CREATE INDEX idx_trade_order_member_created
    ON pinova.trade_order (member_id, created_at DESC, id DESC);

CREATE INDEX idx_trade_order_shop_status_created
    ON pinova.trade_order (shop_id, status, created_at DESC, id DESC);

CREATE INDEX idx_trade_order_pending_payment_expiry
    ON pinova.trade_order (payment_expires_at, id)
    WHERE status = 0;

CREATE TABLE pinova.trade_order_item (
    id                       bigint         NOT NULL,
    order_id                 bigint         NOT NULL,
    source_cart_item_id      bigint         NOT NULL,
    spu_id                   bigint         NOT NULL,
    sku_id                   bigint         NOT NULL,
    product_type_snapshot    smallint       NOT NULL,
    product_name_snapshot    varchar(200)   NOT NULL,
    sku_code_snapshot        varchar(64)    NOT NULL,
    sku_spec_snapshot        varchar(255),
    main_image_key_snapshot  varchar(512),
    unit_price_fen           bigint         NOT NULL,
    quantity                 bigint         NOT NULL,
    line_amount_fen          bigint         NOT NULL,
    discount_amount_fen      bigint         NOT NULL DEFAULT 0,
    payable_amount_fen       bigint         NOT NULL,
    created_at               timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               bigint         NOT NULL DEFAULT 0,
    updated_at               timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by               bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_trade_order_item PRIMARY KEY (id),
    CONSTRAINT fk_trade_order_item_trade_order
        FOREIGN KEY (order_id) REFERENCES pinova.trade_order (id),
    CONSTRAINT ck_trade_order_item_product_type CHECK (
        product_type_snapshot IN (1, 2, 3)
    ),
    CONSTRAINT ck_trade_order_item_product_name_not_blank CHECK (
        btrim(product_name_snapshot) <> ''
    ),
    CONSTRAINT ck_trade_order_item_sku_code_not_blank CHECK (
        btrim(sku_code_snapshot) <> ''
    ),
    CONSTRAINT ck_trade_order_item_sku_spec_not_blank CHECK (
        sku_spec_snapshot IS NULL OR btrim(sku_spec_snapshot) <> ''
    ),
    CONSTRAINT ck_trade_order_item_image_key_not_blank CHECK (
        main_image_key_snapshot IS NULL OR btrim(main_image_key_snapshot) <> ''
    ),
    CONSTRAINT ck_trade_order_item_unit_price CHECK (unit_price_fen >= 0),
    CONSTRAINT ck_trade_order_item_quantity CHECK (quantity > 0),
    CONSTRAINT ck_trade_order_item_line_amount CHECK (
        line_amount_fen = unit_price_fen * quantity
    ),
    CONSTRAINT ck_trade_order_item_discount_amount CHECK (
        discount_amount_fen >= 0
        AND discount_amount_fen <= line_amount_fen
    ),
    CONSTRAINT ck_trade_order_item_payable_amount CHECK (
        payable_amount_fen = line_amount_fen - discount_amount_fen
    )
);

COMMENT ON TABLE pinova.trade_order_item IS '订单成交商品行快照，创建后不可改写';
COMMENT ON COLUMN pinova.trade_order_item.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.trade_order_item.order_id IS '所属交易订单主键';
COMMENT ON COLUMN pinova.trade_order_item.source_cart_item_id IS '来源购物车项主键，全局唯一防止重复下单';
COMMENT ON COLUMN pinova.trade_order_item.spu_id IS '成交商品 SPU 主键，跨商品域逻辑引用';
COMMENT ON COLUMN pinova.trade_order_item.sku_id IS '成交商品 SKU 主键，跨商品域逻辑引用';
COMMENT ON COLUMN pinova.trade_order_item.product_type_snapshot IS '商品类型快照：1-实物，2-虚拟，3-服务';
COMMENT ON COLUMN pinova.trade_order_item.product_name_snapshot IS '下单时商品名称快照';
COMMENT ON COLUMN pinova.trade_order_item.sku_code_snapshot IS '下单时 SKU 业务编码快照';
COMMENT ON COLUMN pinova.trade_order_item.sku_spec_snapshot IS '下单时 SKU 规格摘要快照';
COMMENT ON COLUMN pinova.trade_order_item.main_image_key_snapshot IS '下单时商品主图对象 Key 快照';
COMMENT ON COLUMN pinova.trade_order_item.unit_price_fen IS '成交单价，单位为分';
COMMENT ON COLUMN pinova.trade_order_item.quantity IS '成交数量';
COMMENT ON COLUMN pinova.trade_order_item.line_amount_fen IS '优惠前行金额，单位为分';
COMMENT ON COLUMN pinova.trade_order_item.discount_amount_fen IS '商品行优惠金额，单位为分；首期固定为 0';
COMMENT ON COLUMN pinova.trade_order_item.payable_amount_fen IS '商品行应付金额，单位为分';
COMMENT ON COLUMN pinova.trade_order_item.created_at IS '创建时间，即成交快照形成时间';
COMMENT ON COLUMN pinova.trade_order_item.created_by IS '创建人，通常为下单会员主键';
COMMENT ON COLUMN pinova.trade_order_item.updated_at IS '最后更新时间；成交商品行创建后不得更新';
COMMENT ON COLUMN pinova.trade_order_item.updated_by IS '最后更新人；成交商品行固定为创建人';

CREATE UNIQUE INDEX uk_trade_order_item_source_cart_item
    ON pinova.trade_order_item (source_cart_item_id);

CREATE INDEX idx_trade_order_item_order
    ON pinova.trade_order_item (order_id, id);

CREATE INDEX idx_trade_order_item_sku_created
    ON pinova.trade_order_item (sku_id, created_at DESC, id DESC);

CREATE TABLE pinova.trade_order_shipping_address (
    id                      bigint         NOT NULL,
    order_id                bigint         NOT NULL,
    source_address_id       bigint         NOT NULL,
    source_address_version  integer        NOT NULL,
    receiver_name           varchar(64)    NOT NULL,
    receiver_mobile         varchar(32)    NOT NULL,
    country_code            varchar(2)     NOT NULL,
    province_code           varchar(32)    NOT NULL,
    province_name           varchar(64)    NOT NULL,
    city_code               varchar(32)    NOT NULL,
    city_name               varchar(64)    NOT NULL,
    district_code           varchar(32)    NOT NULL,
    district_name           varchar(64)    NOT NULL,
    detail_address          varchar(255)   NOT NULL,
    postal_code             varchar(16),
    created_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              bigint         NOT NULL DEFAULT 0,
    updated_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by              bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_trade_order_shipping_address PRIMARY KEY (id),
    CONSTRAINT fk_trade_order_shipping_address_trade_order
        FOREIGN KEY (order_id) REFERENCES pinova.trade_order (id),
    CONSTRAINT ck_trade_order_shipping_address_source_version CHECK (
        source_address_version >= 0
    ),
    CONSTRAINT ck_trade_order_shipping_address_receiver_name CHECK (
        btrim(receiver_name) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_receiver_mobile CHECK (
        btrim(receiver_mobile) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_country_code CHECK (
        country_code ~ '^[A-Z]{2}$'
    ),
    CONSTRAINT ck_trade_order_shipping_address_province_code CHECK (
        btrim(province_code) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_province_name CHECK (
        btrim(province_name) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_city_code CHECK (
        btrim(city_code) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_city_name CHECK (
        btrim(city_name) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_district_code CHECK (
        btrim(district_code) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_district_name CHECK (
        btrim(district_name) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_detail CHECK (
        btrim(detail_address) <> ''
    ),
    CONSTRAINT ck_trade_order_shipping_address_postal_code CHECK (
        postal_code IS NULL OR btrim(postal_code) <> ''
    )
);

COMMENT ON TABLE pinova.trade_order_shipping_address IS '实物订单一对一收货地址成交快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.trade_order_shipping_address.order_id IS '所属交易订单主键，每张订单最多一条地址快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.source_address_id IS '来源会员地址主键，仅用于审计，不建立外键';
COMMENT ON COLUMN pinova.trade_order_shipping_address.source_address_version IS '下单时会员地址乐观锁版本';
COMMENT ON COLUMN pinova.trade_order_shipping_address.receiver_name IS '收货人姓名快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.receiver_mobile IS '收货人手机号快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.country_code IS 'ISO 3166-1 alpha-2 国家代码快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.province_code IS '省级行政区稳定代码快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.province_name IS '省级行政区名称快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.city_code IS '市级行政区稳定代码快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.city_name IS '市级行政区名称快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.district_code IS '区县级行政区稳定代码快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.district_name IS '区县级行政区名称快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.detail_address IS '街道、门牌号等详细地址快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.postal_code IS '邮政编码快照';
COMMENT ON COLUMN pinova.trade_order_shipping_address.created_at IS '创建时间，即地址快照形成时间';
COMMENT ON COLUMN pinova.trade_order_shipping_address.created_by IS '创建人，通常为下单会员主键';
COMMENT ON COLUMN pinova.trade_order_shipping_address.updated_at IS '最后更新时间；地址快照创建后不得更新';
COMMENT ON COLUMN pinova.trade_order_shipping_address.updated_by IS '最后更新人；地址快照固定为创建人';

CREATE UNIQUE INDEX uk_trade_order_shipping_address_order
    ON pinova.trade_order_shipping_address (order_id);

COMMIT;
