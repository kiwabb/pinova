CREATE TABLE pinova.inventory_ledger (
    id                  bigint         NOT NULL,
    transaction_no      varchar(64)    NOT NULL,
    stock_id            bigint         NOT NULL,
    reservation_id      bigint,
    change_type         smallint       NOT NULL,
    on_hand_delta       bigint         NOT NULL DEFAULT 0,
    reserved_delta      bigint         NOT NULL DEFAULT 0,
    on_hand_after       bigint         NOT NULL,
    reserved_after      bigint         NOT NULL,
    reference_type      varchar(32),
    reference_id        bigint,
    remark              varchar(255),
    occurred_at         timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_inventory_ledger PRIMARY KEY (id),
    CONSTRAINT fk_inventory_ledger_stock
        FOREIGN KEY (stock_id) REFERENCES pinova.inventory_stock (id),
    CONSTRAINT fk_inventory_ledger_reservation
        FOREIGN KEY (reservation_id) REFERENCES pinova.inventory_reservation (id),
    CONSTRAINT uk_inventory_ledger_transaction_no UNIQUE (transaction_no),
    CONSTRAINT ck_inventory_ledger_transaction_no_not_blank CHECK (
        btrim(transaction_no) <> ''
    ),
    CONSTRAINT ck_inventory_ledger_change_type CHECK (change_type IN (1, 2, 3, 4, 5, 6)),
    CONSTRAINT ck_inventory_ledger_delta CHECK (
        on_hand_delta <> 0 OR reserved_delta <> 0
    ),
    CONSTRAINT ck_inventory_ledger_on_hand_after CHECK (on_hand_after >= 0),
    CONSTRAINT ck_inventory_ledger_reserved_after CHECK (reserved_after >= 0),
    CONSTRAINT ck_inventory_ledger_balance_after CHECK (reserved_after <= on_hand_after),
    CONSTRAINT ck_inventory_ledger_reference CHECK (
        (reference_type IS NULL AND reference_id IS NULL)
        OR
        (reference_type IS NOT NULL AND btrim(reference_type) <> '' AND reference_id IS NOT NULL)
    ),
    CONSTRAINT ck_inventory_ledger_remark_not_blank CHECK (
        remark IS NULL OR btrim(remark) <> ''
    )
);

COMMENT ON TABLE pinova.inventory_ledger IS '不可变库存变更流水';
COMMENT ON COLUMN pinova.inventory_ledger.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.inventory_ledger.transaction_no IS '全局唯一流水编号和幂等键';
COMMENT ON COLUMN pinova.inventory_ledger.stock_id IS '变更的库存余额主键';
COMMENT ON COLUMN pinova.inventory_ledger.reservation_id IS '关联库存预占主键';
COMMENT ON COLUMN pinova.inventory_ledger.change_type IS '类型：1-入库，2-出库，3-预占，4-释放，5-盘盈，6-盘亏';
COMMENT ON COLUMN pinova.inventory_ledger.on_hand_delta IS '现存数量变化，可正可负';
COMMENT ON COLUMN pinova.inventory_ledger.reserved_delta IS '锁定数量变化，可正可负';
COMMENT ON COLUMN pinova.inventory_ledger.on_hand_after IS '变更后的现存数量';
COMMENT ON COLUMN pinova.inventory_ledger.reserved_after IS '变更后的锁定数量';
COMMENT ON COLUMN pinova.inventory_ledger.reference_type IS '来源业务类型，例如 ORDER 或 PURCHASE';
COMMENT ON COLUMN pinova.inventory_ledger.reference_id IS '来源业务主键';
COMMENT ON COLUMN pinova.inventory_ledger.remark IS '变更备注';
COMMENT ON COLUMN pinova.inventory_ledger.occurred_at IS '库存变更发生时间';
COMMENT ON COLUMN pinova.inventory_ledger.created_at IS '创建时间';
COMMENT ON COLUMN pinova.inventory_ledger.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.inventory_ledger.updated_at IS '最后更新时间；不可变流水创建后不得更新';
COMMENT ON COLUMN pinova.inventory_ledger.updated_by IS '最后更新人；不可变流水固定为创建人';

CREATE INDEX idx_inventory_ledger_stock_occurred
    ON pinova.inventory_ledger (stock_id, occurred_at DESC, id DESC);

CREATE INDEX idx_inventory_ledger_reservation
    ON pinova.inventory_ledger (reservation_id, id)
    WHERE reservation_id IS NOT NULL;

CREATE INDEX idx_inventory_ledger_reference
    ON pinova.inventory_ledger (reference_type, reference_id, id)
    WHERE reference_type IS NOT NULL;
