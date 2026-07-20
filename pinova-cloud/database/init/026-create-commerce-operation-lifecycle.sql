BEGIN;

ALTER TABLE pinova.trade_order
    ADD COLUMN carrier_code varchar(32),
    ADD COLUMN carrier_name varchar(64),
    ADD COLUMN tracking_no varchar(128),
    ADD COLUMN shipped_at timestamptz(3),
    ADD COLUMN auto_complete_at timestamptz(3),
    ADD COLUMN completion_source smallint,
    ADD COLUMN completion_reason varchar(255),
    ADD COLUMN after_sale_deadline_at timestamptz(3),
    ADD COLUMN refunded_at timestamptz(3);

ALTER TABLE pinova.trade_order
    DROP CONSTRAINT ck_trade_order_status,
    DROP CONSTRAINT ck_trade_order_paid_amount,
    DROP CONSTRAINT ck_trade_order_lifecycle,
    DROP CONSTRAINT ck_trade_order_milestone_order;

ALTER TABLE pinova.trade_order
    ADD CONSTRAINT ck_trade_order_status CHECK (status IN (0, 1, 2, 3, 4, 5)),
    ADD CONSTRAINT ck_trade_order_paid_amount CHECK (
        paid_amount_fen <= payable_amount_fen AND (
            (status IN (0, 4) AND paid_amount_fen = 0)
            OR (status IN (1, 2, 3, 5) AND paid_amount_fen = payable_amount_fen)
        )
    ),
    ADD CONSTRAINT ck_trade_order_shipping_snapshot CHECK (
        (carrier_code IS NULL AND carrier_name IS NULL AND tracking_no IS NULL AND shipped_at IS NULL)
        OR (carrier_code IS NOT NULL AND carrier_name IS NOT NULL AND tracking_no IS NOT NULL
            AND btrim(carrier_code) <> '' AND btrim(carrier_name) <> ''
            AND btrim(tracking_no) <> '' AND shipped_at IS NOT NULL)
    ),
    ADD CONSTRAINT ck_trade_order_completion_source CHECK (
        completion_source IS NULL OR completion_source IN (1, 2, 3)
    ),
    ADD CONSTRAINT ck_trade_order_completion_reason CHECK (
        completion_reason IS NULL OR btrim(completion_reason) <> ''
    ),
    ADD CONSTRAINT ck_trade_order_lifecycle CHECK (
        (status = 0 AND paid_at IS NULL AND fulfillment_started_at IS NULL
            AND completed_at IS NULL AND closed_at IS NULL AND refunded_at IS NULL)
        OR (status = 1 AND paid_at IS NOT NULL AND fulfillment_started_at IS NULL
            AND completed_at IS NULL AND closed_at IS NULL AND refunded_at IS NULL)
        OR (status = 2 AND paid_at IS NOT NULL AND fulfillment_started_at IS NOT NULL
            AND completed_at IS NULL AND closed_at IS NULL AND refunded_at IS NULL)
        OR (status = 3 AND paid_at IS NOT NULL AND fulfillment_started_at IS NOT NULL
            AND completed_at IS NOT NULL AND closed_at IS NULL AND refunded_at IS NULL)
        OR (status = 4 AND paid_at IS NULL AND fulfillment_started_at IS NULL
            AND completed_at IS NULL AND closed_at IS NOT NULL AND refunded_at IS NULL)
        OR (status = 5 AND paid_at IS NOT NULL AND closed_at IS NULL AND refunded_at IS NOT NULL)
    ),
    ADD CONSTRAINT ck_trade_order_milestone_order CHECK (
        submitted_at >= created_at
        AND (paid_at IS NULL OR paid_at >= submitted_at)
        AND (shipped_at IS NULL OR shipped_at >= paid_at)
        AND (fulfillment_started_at IS NULL OR fulfillment_started_at >= paid_at)
        AND (completed_at IS NULL OR completed_at >= fulfillment_started_at)
        AND (closed_at IS NULL OR closed_at >= submitted_at)
        AND (refunded_at IS NULL OR refunded_at >= paid_at)
        AND (auto_complete_at IS NULL OR auto_complete_at >= shipped_at)
        AND (after_sale_deadline_at IS NULL OR after_sale_deadline_at >= completed_at)
    );

COMMENT ON COLUMN pinova.trade_order.carrier_code IS '承运商稳定代码';
COMMENT ON COLUMN pinova.trade_order.carrier_name IS '发货时承运商名称快照';
COMMENT ON COLUMN pinova.trade_order.tracking_no IS '物流单号';
COMMENT ON COLUMN pinova.trade_order.shipped_at IS '整单发货时间';
COMMENT ON COLUMN pinova.trade_order.auto_complete_at IS '发货后自动完成时间';
COMMENT ON COLUMN pinova.trade_order.completion_source IS '完成来源：1-会员确认，2-系统自动，3-后台强制';
COMMENT ON COLUMN pinova.trade_order.completion_reason IS '后台强制完成原因';
COMMENT ON COLUMN pinova.trade_order.after_sale_deadline_at IS '已完成订单仅退款申请截止时间';
COMMENT ON COLUMN pinova.trade_order.refunded_at IS '整单全额退款完成时间';

CREATE INDEX idx_trade_order_auto_complete
    ON pinova.trade_order (auto_complete_at, id) WHERE status = 2;

CREATE TABLE pinova.trade_order_fulfillment_log (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    request_key varchar(64) NOT NULL,
    action_type smallint NOT NULL,
    status_before smallint NOT NULL,
    status_after smallint NOT NULL,
    carrier_code varchar(32),
    carrier_name varchar(64),
    tracking_no varchar(128),
    reason varchar(255),
    operator_type smallint NOT NULL,
    operator_id bigint NOT NULL,
    occurred_at timestamptz(3) NOT NULL,
    created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by bigint NOT NULL DEFAULT 0,
    updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by bigint NOT NULL DEFAULT 0,
    CONSTRAINT pk_trade_order_fulfillment_log PRIMARY KEY (id),
    CONSTRAINT fk_trade_order_fulfillment_log_order FOREIGN KEY (order_id) REFERENCES pinova.trade_order (id),
    CONSTRAINT ck_trade_order_fulfillment_request CHECK (btrim(request_key) <> ''),
    CONSTRAINT ck_trade_order_fulfillment_action CHECK (action_type IN (1, 2, 3, 4, 5)),
    CONSTRAINT ck_trade_order_fulfillment_status CHECK (
        status_before IN (0, 1, 2, 3, 4, 5) AND status_after IN (0, 1, 2, 3, 4, 5)
    ),
    CONSTRAINT ck_trade_order_fulfillment_operator CHECK (operator_type IN (1, 2, 3)),
    CONSTRAINT ck_trade_order_fulfillment_reason CHECK (reason IS NULL OR btrim(reason) <> '')
);

CREATE UNIQUE INDEX uk_trade_order_fulfillment_request
    ON pinova.trade_order_fulfillment_log (order_id, request_key);
CREATE INDEX idx_trade_order_fulfillment_order
    ON pinova.trade_order_fulfillment_log (order_id, occurred_at DESC, id DESC);
COMMENT ON TABLE pinova.trade_order_fulfillment_log IS '订单履约和完成操作的不可变审计事实';

CREATE TABLE pinova.order_after_sale (
    id bigint NOT NULL,
    after_sale_no varchar(64) NOT NULL,
    order_id bigint NOT NULL,
    member_id bigint NOT NULL,
    request_key varchar(64) NOT NULL,
    type smallint NOT NULL DEFAULT 1,
    reason_code smallint NOT NULL,
    reason varchar(500),
    amount_fen bigint NOT NULL,
    currency_code varchar(3) NOT NULL,
    status smallint NOT NULL DEFAULT 0,
    applied_at timestamptz(3) NOT NULL,
    reviewed_at timestamptz(3),
    reviewed_by bigint,
    review_reason varchar(500),
    completed_at timestamptz(3),
    version integer NOT NULL DEFAULT 0,
    created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by bigint NOT NULL DEFAULT 0,
    updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by bigint NOT NULL DEFAULT 0,
    CONSTRAINT pk_order_after_sale PRIMARY KEY (id),
    CONSTRAINT ck_order_after_sale_no CHECK (btrim(after_sale_no) <> ''),
    CONSTRAINT ck_order_after_sale_request CHECK (btrim(request_key) <> ''),
    CONSTRAINT ck_order_after_sale_type CHECK (type = 1),
    CONSTRAINT ck_order_after_sale_reason_code CHECK (reason_code BETWEEN 1 AND 5),
    CONSTRAINT ck_order_after_sale_reason CHECK (reason IS NULL OR btrim(reason) <> ''),
    CONSTRAINT ck_order_after_sale_amount CHECK (amount_fen > 0),
    CONSTRAINT ck_order_after_sale_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_order_after_sale_status CHECK (status IN (0, 1, 2, 3, 4, 5)),
    CONSTRAINT ck_order_after_sale_review CHECK (
        (status = 0 AND reviewed_at IS NULL AND reviewed_by IS NULL)
        OR (status IN (1, 2, 3, 4, 5) AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    ),
    CONSTRAINT ck_order_after_sale_version CHECK (version >= 0)
);

CREATE UNIQUE INDEX uk_order_after_sale_no ON pinova.order_after_sale (after_sale_no);
CREATE UNIQUE INDEX uk_order_after_sale_request ON pinova.order_after_sale (member_id, request_key);
CREATE UNIQUE INDEX uk_order_after_sale_order_active
    ON pinova.order_after_sale (order_id) WHERE status IN (0, 2, 5);
CREATE INDEX idx_order_after_sale_status_created
    ON pinova.order_after_sale (status, created_at DESC, id DESC);
COMMENT ON TABLE pinova.order_after_sale IS '订单整单全额仅退款售后申请';

CREATE TABLE pinova.refund_order (
    id bigint NOT NULL,
    refund_no varchar(64) NOT NULL,
    after_sale_id bigint NOT NULL,
    order_id bigint NOT NULL,
    payment_order_id bigint NOT NULL,
    member_id bigint NOT NULL,
    provider_code varchar(32) NOT NULL,
    provider_refund_no varchar(128),
    currency_code varchar(3) NOT NULL,
    amount_fen bigint NOT NULL,
    status smallint NOT NULL DEFAULT 0,
    attempt_count integer NOT NULL DEFAULT 1,
    last_queried_at timestamptz(3),
    succeeded_at timestamptz(3),
    failed_at timestamptz(3),
    review_required_at timestamptz(3),
    failure_code varchar(64),
    failure_message varchar(255),
    version integer NOT NULL DEFAULT 0,
    created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by bigint NOT NULL DEFAULT 0,
    updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by bigint NOT NULL DEFAULT 0,
    CONSTRAINT pk_refund_order PRIMARY KEY (id),
    CONSTRAINT fk_refund_order_after_sale FOREIGN KEY (after_sale_id) REFERENCES pinova.order_after_sale (id),
    CONSTRAINT fk_refund_order_payment FOREIGN KEY (payment_order_id) REFERENCES pinova.payment_order (id),
    CONSTRAINT ck_refund_order_no CHECK (btrim(refund_no) <> ''),
    CONSTRAINT ck_refund_order_provider CHECK (provider_code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
    CONSTRAINT ck_refund_order_provider_no CHECK (provider_refund_no IS NULL OR btrim(provider_refund_no) <> ''),
    CONSTRAINT ck_refund_order_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_refund_order_amount CHECK (amount_fen > 0),
    CONSTRAINT ck_refund_order_status CHECK (status IN (0, 1, 2, 3)),
    CONSTRAINT ck_refund_order_attempt CHECK (attempt_count > 0),
    CONSTRAINT ck_refund_order_version CHECK (version >= 0)
);

CREATE UNIQUE INDEX uk_refund_order_no ON pinova.refund_order (refund_no);
CREATE UNIQUE INDEX uk_refund_order_after_sale ON pinova.refund_order (after_sale_id);
CREATE UNIQUE INDEX uk_refund_order_order ON pinova.refund_order (order_id);
CREATE UNIQUE INDEX uk_refund_order_provider_no
    ON pinova.refund_order (provider_code, provider_refund_no) WHERE provider_refund_no IS NOT NULL;
COMMENT ON TABLE pinova.refund_order IS '售后审核通过后创建的整单全额退款单';

CREATE TABLE pinova.admin_operation_audit (
    id bigint NOT NULL,
    operator_id bigint NOT NULL,
    domain_code varchar(32) NOT NULL,
    action_code varchar(64) NOT NULL,
    target_type varchar(64) NOT NULL,
    target_id varchar(128) NOT NULL,
    request_id varchar(64),
    reason varchar(500),
    before_snapshot jsonb,
    after_snapshot jsonb,
    occurred_at timestamptz(3) NOT NULL,
    created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by bigint NOT NULL DEFAULT 0,
    updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by bigint NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_operation_audit PRIMARY KEY (id),
    CONSTRAINT ck_admin_operation_audit_domain CHECK (domain_code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
    CONSTRAINT ck_admin_operation_audit_action CHECK (action_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
    CONSTRAINT ck_admin_operation_audit_target_type CHECK (btrim(target_type) <> ''),
    CONSTRAINT ck_admin_operation_audit_target_id CHECK (btrim(target_id) <> ''),
    CONSTRAINT ck_admin_operation_audit_request CHECK (request_id IS NULL OR btrim(request_id) <> ''),
    CONSTRAINT ck_admin_operation_audit_reason CHECK (reason IS NULL OR btrim(reason) <> '')
);

CREATE INDEX idx_admin_operation_audit_operator
    ON pinova.admin_operation_audit (operator_id, occurred_at DESC, id DESC);
CREATE INDEX idx_admin_operation_audit_domain
    ON pinova.admin_operation_audit (domain_code, action_code, occurred_at DESC, id DESC);
CREATE INDEX idx_admin_operation_audit_target
    ON pinova.admin_operation_audit (target_type, target_id, occurred_at DESC, id DESC);
COMMENT ON TABLE pinova.admin_operation_audit IS '后台写操作不可变审计记录，不保存敏感凭据或渠道原文';

COMMIT;
