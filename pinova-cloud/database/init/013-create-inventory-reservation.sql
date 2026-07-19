CREATE TABLE pinova.inventory_reservation (
    id                  bigint         NOT NULL,
    reservation_no      varchar(64)    NOT NULL,
    stock_id            bigint         NOT NULL,
    order_id            bigint         NOT NULL,
    order_item_id       bigint         NOT NULL,
    quantity            bigint         NOT NULL,
    status              smallint       NOT NULL DEFAULT 0,
    expires_at          timestamptz(3) NOT NULL,
    closed_at           timestamptz(3),
    version             integer        NOT NULL DEFAULT 0,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_inventory_reservation PRIMARY KEY (id),
    CONSTRAINT fk_inventory_reservation_stock
        FOREIGN KEY (stock_id) REFERENCES pinova.inventory_stock (id),
    CONSTRAINT uk_inventory_reservation_no UNIQUE (reservation_no),
    CONSTRAINT ck_inventory_reservation_no_not_blank CHECK (btrim(reservation_no) <> ''),
    CONSTRAINT ck_inventory_reservation_quantity CHECK (quantity > 0),
    CONSTRAINT ck_inventory_reservation_status CHECK (status IN (0, 1, 2, 3)),
    CONSTRAINT ck_inventory_reservation_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_inventory_reservation_closed CHECK (
        (status = 0 AND closed_at IS NULL)
        OR
        (status IN (1, 2, 3) AND closed_at IS NOT NULL)
    ),
    CONSTRAINT ck_inventory_reservation_version CHECK (version >= 0)
);

COMMENT ON TABLE pinova.inventory_reservation IS '订单库存预占记录';
COMMENT ON COLUMN pinova.inventory_reservation.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.inventory_reservation.reservation_no IS '全局唯一预占编号和幂等键';
COMMENT ON COLUMN pinova.inventory_reservation.stock_id IS '被锁定的库存余额主键';
COMMENT ON COLUMN pinova.inventory_reservation.order_id IS '交易订单主键，跨交易域逻辑引用';
COMMENT ON COLUMN pinova.inventory_reservation.order_item_id IS '交易订单项主键，跨交易域逻辑引用';
COMMENT ON COLUMN pinova.inventory_reservation.quantity IS '预占数量';
COMMENT ON COLUMN pinova.inventory_reservation.status IS '状态：0-已预占，1-已扣减，2-已释放，3-已过期';
COMMENT ON COLUMN pinova.inventory_reservation.expires_at IS '预占自动过期时间';
COMMENT ON COLUMN pinova.inventory_reservation.closed_at IS '扣减、释放或过期完成时间';
COMMENT ON COLUMN pinova.inventory_reservation.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.inventory_reservation.created_at IS '创建时间';
COMMENT ON COLUMN pinova.inventory_reservation.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.inventory_reservation.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.inventory_reservation.updated_by IS '最后更新人，0 表示系统';

CREATE INDEX idx_inventory_reservation_active_expiry
    ON pinova.inventory_reservation (expires_at, id)
    WHERE status = 0;

CREATE INDEX idx_inventory_reservation_order
    ON pinova.inventory_reservation (order_id, order_item_id, id);

CREATE INDEX idx_inventory_reservation_stock_status
    ON pinova.inventory_reservation (stock_id, status, id);
