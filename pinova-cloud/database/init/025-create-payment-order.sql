BEGIN;

CREATE TABLE pinova.payment_order (
    id                       bigint         NOT NULL,
    payment_no               varchar(64)    NOT NULL,
    checkout_no              varchar(64)    NOT NULL,
    member_id                bigint         NOT NULL,
    provider_code            varchar(32)    NOT NULL,
    provider_transaction_no  varchar(128),
    currency_code            varchar(3)     NOT NULL DEFAULT 'CNY',
    amount_fen               bigint         NOT NULL,
    status                   smallint       NOT NULL DEFAULT 0,
    attempt_count            integer        NOT NULL DEFAULT 1,
    expires_at               timestamptz(3) NOT NULL,
    last_queried_at          timestamptz(3),
    paid_at                  timestamptz(3),
    failed_at                timestamptz(3),
    closed_at                timestamptz(3),
    review_required_at       timestamptz(3),
    failure_code             varchar(64),
    failure_message          varchar(255),
    version                  integer        NOT NULL DEFAULT 0,
    created_at               timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               bigint         NOT NULL DEFAULT 0,
    updated_at               timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by               bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_payment_order PRIMARY KEY (id),
    CONSTRAINT ck_payment_order_payment_no_not_blank CHECK (btrim(payment_no) <> ''),
    CONSTRAINT ck_payment_order_checkout_no_not_blank CHECK (btrim(checkout_no) <> ''),
    CONSTRAINT ck_payment_order_member_id CHECK (member_id > 0),
    CONSTRAINT ck_payment_order_provider_code CHECK (provider_code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
    CONSTRAINT ck_payment_order_provider_transaction_no CHECK (
        provider_transaction_no IS NULL OR btrim(provider_transaction_no) <> ''
    ),
    CONSTRAINT ck_payment_order_currency_code CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_payment_order_amount CHECK (amount_fen > 0),
    CONSTRAINT ck_payment_order_status CHECK (status IN (0, 1, 2, 3, 4)),
    CONSTRAINT ck_payment_order_attempt_count CHECK (attempt_count > 0),
    CONSTRAINT ck_payment_order_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_payment_order_failure_code CHECK (
        failure_code IS NULL OR btrim(failure_code) <> ''
    ),
    CONSTRAINT ck_payment_order_failure_message CHECK (
        failure_message IS NULL OR btrim(failure_message) <> ''
    ),
    CONSTRAINT ck_payment_order_version CHECK (version >= 0),
    CONSTRAINT ck_payment_order_lifecycle CHECK (
        (
            status = 0
            AND paid_at IS NULL
            AND failed_at IS NULL
            AND closed_at IS NULL
            AND review_required_at IS NULL
            AND failure_code IS NULL
            AND failure_message IS NULL
        )
        OR
        (
            status = 1
            AND paid_at IS NOT NULL
            AND failed_at IS NULL
            AND closed_at IS NULL
            AND review_required_at IS NULL
            AND failure_code IS NULL
            AND failure_message IS NULL
        )
        OR
        (
            status = 2
            AND paid_at IS NULL
            AND failed_at IS NOT NULL
            AND closed_at IS NULL
            AND review_required_at IS NULL
            AND failure_code IS NOT NULL
        )
        OR
        (
            status = 3
            AND paid_at IS NULL
            AND failed_at IS NULL
            AND closed_at IS NOT NULL
            AND review_required_at IS NULL
            AND failure_code IS NULL
            AND failure_message IS NULL
        )
        OR
        (
            status = 4
            AND paid_at IS NOT NULL
            AND failed_at IS NULL
            AND closed_at IS NULL
            AND review_required_at IS NOT NULL
            AND failure_code IS NOT NULL
        )
    ),
    CONSTRAINT ck_payment_order_milestone_order CHECK (
        (last_queried_at IS NULL OR last_queried_at >= created_at)
        AND (paid_at IS NULL OR paid_at >= created_at)
        AND (failed_at IS NULL OR failed_at >= created_at)
        AND (closed_at IS NULL OR closed_at >= created_at)
        AND (review_required_at IS NULL OR review_required_at >= paid_at)
    )
);

COMMENT ON TABLE pinova.payment_order IS '按结算聚合的支付单，一次 checkout 只允许一张有效支付单';
COMMENT ON COLUMN pinova.payment_order.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.payment_order.payment_no IS '面向渠道和用户的全局唯一支付单号';
COMMENT ON COLUMN pinova.payment_order.checkout_no IS '来源结算编号和创建支付幂等键';
COMMENT ON COLUMN pinova.payment_order.member_id IS '付款会员主键，跨会员域逻辑引用';
COMMENT ON COLUMN pinova.payment_order.provider_code IS '支付渠道代码，首期为 MOCK';
COMMENT ON COLUMN pinova.payment_order.provider_transaction_no IS '支付渠道交易号，可在渠道创建成功后补充';
COMMENT ON COLUMN pinova.payment_order.currency_code IS 'ISO 4217 币种代码，首期固定为 CNY';
COMMENT ON COLUMN pinova.payment_order.amount_fen IS '本次结算全部订单应付金额之和，单位为分';
COMMENT ON COLUMN pinova.payment_order.status IS '状态：0-待支付，1-支付成功，2-支付失败，3-已关闭，4-需人工处理';
COMMENT ON COLUMN pinova.payment_order.attempt_count IS '支付尝试次数，失败后重新发起时递增';
COMMENT ON COLUMN pinova.payment_order.expires_at IS '支付单失效时间，不晚于关联订单支付过期时间';
COMMENT ON COLUMN pinova.payment_order.last_queried_at IS '最近一次主动查询渠道结果的时间';
COMMENT ON COLUMN pinova.payment_order.paid_at IS '渠道确认付款时间';
COMMENT ON COLUMN pinova.payment_order.failed_at IS '最近一次渠道确认失败时间';
COMMENT ON COLUMN pinova.payment_order.closed_at IS '支付单关闭时间';
COMMENT ON COLUMN pinova.payment_order.review_required_at IS '支付已确认但业务推进失败，进入人工处理的时间';
COMMENT ON COLUMN pinova.payment_order.failure_code IS '稳定失败或人工处理原因代码';
COMMENT ON COLUMN pinova.payment_order.failure_message IS '失败原因补充说明，不保存敏感渠道报文';
COMMENT ON COLUMN pinova.payment_order.version IS '支付状态并发更新使用的乐观锁版本';
COMMENT ON COLUMN pinova.payment_order.created_at IS '创建时间';
COMMENT ON COLUMN pinova.payment_order.created_by IS '创建会员主键';
COMMENT ON COLUMN pinova.payment_order.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.payment_order.updated_by IS '最后更新人，系统任务为 0';

CREATE UNIQUE INDEX uk_payment_order_payment_no
    ON pinova.payment_order (payment_no);

CREATE UNIQUE INDEX uk_payment_order_checkout_no
    ON pinova.payment_order (checkout_no);

CREATE UNIQUE INDEX uk_payment_order_provider_transaction
    ON pinova.payment_order (provider_code, provider_transaction_no)
    WHERE provider_transaction_no IS NOT NULL;

CREATE INDEX idx_payment_order_member_created
    ON pinova.payment_order (member_id, created_at DESC, id DESC);

CREATE INDEX idx_payment_order_pending_expiry
    ON pinova.payment_order (expires_at, id)
    WHERE status = 0;

CREATE TABLE pinova.payment_order_trade_order (
    id                bigint         NOT NULL,
    payment_order_id  bigint         NOT NULL,
    trade_order_id    bigint         NOT NULL,
    order_amount_fen  bigint         NOT NULL,
    created_at        timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        bigint         NOT NULL DEFAULT 0,
    updated_at        timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by        bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_payment_order_trade_order PRIMARY KEY (id),
    CONSTRAINT fk_payment_order_trade_order_payment
        FOREIGN KEY (payment_order_id) REFERENCES pinova.payment_order (id),
    CONSTRAINT ck_payment_order_trade_order_amount CHECK (order_amount_fen > 0)
);

COMMENT ON TABLE pinova.payment_order_trade_order IS '支付单与交易订单的关联快照';
COMMENT ON COLUMN pinova.payment_order_trade_order.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.payment_order_trade_order.payment_order_id IS '所属支付单主键';
COMMENT ON COLUMN pinova.payment_order_trade_order.trade_order_id IS '交易订单主键，跨交易域逻辑引用';
COMMENT ON COLUMN pinova.payment_order_trade_order.order_amount_fen IS '关联订单参与本次支付的金额快照，单位为分';
COMMENT ON COLUMN pinova.payment_order_trade_order.created_at IS '创建时间';
COMMENT ON COLUMN pinova.payment_order_trade_order.created_by IS '创建会员主键';
COMMENT ON COLUMN pinova.payment_order_trade_order.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.payment_order_trade_order.updated_by IS '最后更新人';

CREATE UNIQUE INDEX uk_payment_order_trade_order_order
    ON pinova.payment_order_trade_order (trade_order_id);

CREATE INDEX idx_payment_order_trade_order_payment
    ON pinova.payment_order_trade_order (payment_order_id, id);

COMMIT;
