BEGIN;

CREATE TABLE pinova.shopping_cart (
    id                      bigint         NOT NULL,
    member_id               bigint,
    guest_token_hash        varchar(64),
    status                  smallint       NOT NULL DEFAULT 0,
    merged_into_cart_id     bigint,
    expires_at              timestamptz(3),
    last_activity_at        timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at               timestamptz(3),
    version                 integer        NOT NULL DEFAULT 0,
    created_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              bigint         NOT NULL DEFAULT 0,
    updated_at              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by              bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_shopping_cart PRIMARY KEY (id),
    CONSTRAINT fk_shopping_cart_merged_into
        FOREIGN KEY (merged_into_cart_id) REFERENCES pinova.shopping_cart (id),
    CONSTRAINT ck_shopping_cart_owner CHECK (
        num_nonnulls(member_id, guest_token_hash) = 1
    ),
    CONSTRAINT ck_shopping_cart_guest_token_hash CHECK (
        guest_token_hash IS NULL
        OR guest_token_hash ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT ck_shopping_cart_guest_expiration CHECK (
        guest_token_hash IS NULL OR expires_at IS NOT NULL
    ),
    CONSTRAINT ck_shopping_cart_status CHECK (status IN (0, 1, 2, 3)),
    CONSTRAINT ck_shopping_cart_state CHECK (
        (
            status = 0
            AND merged_into_cart_id IS NULL
            AND closed_at IS NULL
        )
        OR
        (
            status = 1
            AND merged_into_cart_id IS NOT NULL
            AND merged_into_cart_id <> id
            AND closed_at IS NOT NULL
        )
        OR
        (
            status IN (2, 3)
            AND merged_into_cart_id IS NULL
            AND closed_at IS NOT NULL
        )
    ),
    CONSTRAINT ck_shopping_cart_activity_time CHECK (
        last_activity_at >= created_at
    ),
    CONSTRAINT ck_shopping_cart_version CHECK (version >= 0)
);

COMMENT ON TABLE pinova.shopping_cart IS '会员或游客购物车';
COMMENT ON COLUMN pinova.shopping_cart.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.shopping_cart.member_id IS '会员主键，与游客令牌哈希二选一，跨会员域逻辑引用';
COMMENT ON COLUMN pinova.shopping_cart.guest_token_hash IS '游客随机令牌 SHA-256 十六进制哈希，不保存原始令牌';
COMMENT ON COLUMN pinova.shopping_cart.status IS '状态：0-活跃，1-已合并，2-已结算，3-已过期';
COMMENT ON COLUMN pinova.shopping_cart.merged_into_cart_id IS '游客购物车登录后合并到的目标购物车主键';
COMMENT ON COLUMN pinova.shopping_cart.expires_at IS '计划过期时间，游客购物车必须填写';
COMMENT ON COLUMN pinova.shopping_cart.last_activity_at IS '最近一次有效操作时间';
COMMENT ON COLUMN pinova.shopping_cart.closed_at IS '合并、结算或过期关闭时间';
COMMENT ON COLUMN pinova.shopping_cart.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.shopping_cart.created_at IS '创建时间';
COMMENT ON COLUMN pinova.shopping_cart.created_by IS '创建人，游客或系统为 0';
COMMENT ON COLUMN pinova.shopping_cart.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.shopping_cart.updated_by IS '最后更新人，游客或系统为 0';

CREATE UNIQUE INDEX uk_shopping_cart_member_active
    ON pinova.shopping_cart (member_id)
    WHERE member_id IS NOT NULL AND status = 0;

CREATE UNIQUE INDEX uk_shopping_cart_guest_active
    ON pinova.shopping_cart (guest_token_hash)
    WHERE guest_token_hash IS NOT NULL AND status = 0;

CREATE INDEX idx_shopping_cart_active_expiration
    ON pinova.shopping_cart (expires_at, id)
    WHERE status = 0 AND expires_at IS NOT NULL;

CREATE INDEX idx_shopping_cart_merge_target
    ON pinova.shopping_cart (merged_into_cart_id, id)
    WHERE merged_into_cart_id IS NOT NULL;

CREATE TABLE pinova.shopping_cart_item (
    id          bigint         NOT NULL,
    cart_id     bigint         NOT NULL,
    shop_id     bigint         NOT NULL,
    spu_id      bigint         NOT NULL,
    sku_id      bigint         NOT NULL,
    quantity    bigint         NOT NULL,
    selected    boolean        NOT NULL DEFAULT true,
    version     integer        NOT NULL DEFAULT 0,
    created_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  bigint         NOT NULL DEFAULT 0,
    updated_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_shopping_cart_item PRIMARY KEY (id),
    CONSTRAINT fk_shopping_cart_item_cart
        FOREIGN KEY (cart_id) REFERENCES pinova.shopping_cart (id),
    CONSTRAINT ck_shopping_cart_item_quantity CHECK (quantity > 0),
    CONSTRAINT ck_shopping_cart_item_version CHECK (version >= 0)
);

COMMENT ON TABLE pinova.shopping_cart_item IS '购物车 SKU 项';
COMMENT ON COLUMN pinova.shopping_cart_item.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.shopping_cart_item.cart_id IS '所属购物车主键';
COMMENT ON COLUMN pinova.shopping_cart_item.shop_id IS '商品所属店铺主键，跨商家域逻辑引用';
COMMENT ON COLUMN pinova.shopping_cart_item.spu_id IS '商品 SPU 主键，跨商品域逻辑引用';
COMMENT ON COLUMN pinova.shopping_cart_item.sku_id IS '商品 SKU 主键，跨商品域逻辑引用';
COMMENT ON COLUMN pinova.shopping_cart_item.quantity IS '用户期望购买数量，不代表库存预占';
COMMENT ON COLUMN pinova.shopping_cart_item.selected IS '是否参与当前结算';
COMMENT ON COLUMN pinova.shopping_cart_item.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.shopping_cart_item.created_at IS '加入购物车时间';
COMMENT ON COLUMN pinova.shopping_cart_item.created_by IS '创建人，游客或系统为 0';
COMMENT ON COLUMN pinova.shopping_cart_item.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.shopping_cart_item.updated_by IS '最后更新人，游客或系统为 0';

CREATE UNIQUE INDEX uk_shopping_cart_item_cart_sku
    ON pinova.shopping_cart_item (cart_id, sku_id);

CREATE INDEX idx_shopping_cart_item_cart_shop
    ON pinova.shopping_cart_item (cart_id, shop_id, id);

CREATE INDEX idx_shopping_cart_item_sku_updated
    ON pinova.shopping_cart_item (sku_id, updated_at DESC, id);

COMMIT;
