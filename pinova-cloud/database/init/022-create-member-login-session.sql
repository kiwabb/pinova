CREATE TABLE pinova.member_login_session (
    id              bigint         NOT NULL,
    member_id       bigint         NOT NULL,
    token_hash      varchar(64)    NOT NULL,
    expires_at      timestamptz(3) NOT NULL,
    last_seen_at    timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at      timestamptz(3),
    client_ip       inet,
    user_agent      varchar(512),
    created_at      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      bigint         NOT NULL DEFAULT 0,
    updated_at      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by      bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_member_login_session PRIMARY KEY (id),
    CONSTRAINT fk_member_login_session_member_account
        FOREIGN KEY (member_id) REFERENCES pinova.member_account (id),
    CONSTRAINT ck_member_login_session_token_hash
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_member_login_session_expiration
        CHECK (expires_at > created_at),
    CONSTRAINT ck_member_login_session_last_seen
        CHECK (last_seen_at >= created_at),
    CONSTRAINT ck_member_login_session_revoked
        CHECK (revoked_at IS NULL OR revoked_at >= created_at),
    CONSTRAINT ck_member_login_session_user_agent_not_blank
        CHECK (user_agent IS NULL OR btrim(user_agent) <> '')
);

COMMENT ON TABLE pinova.member_login_session IS '会员不透明登录会话';
COMMENT ON COLUMN pinova.member_login_session.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.member_login_session.member_id IS '登录会员主键';
COMMENT ON COLUMN pinova.member_login_session.token_hash IS '随机会话令牌 SHA-256 十六进制哈希，不保存原始令牌';
COMMENT ON COLUMN pinova.member_login_session.expires_at IS '会话绝对过期时间';
COMMENT ON COLUMN pinova.member_login_session.last_seen_at IS '最近一次通过会话认证的时间';
COMMENT ON COLUMN pinova.member_login_session.revoked_at IS '主动退出或安全操作导致的撤销时间';
COMMENT ON COLUMN pinova.member_login_session.client_ip IS '登录时客户端 IP，不信任未经网关校验的转发头';
COMMENT ON COLUMN pinova.member_login_session.user_agent IS '登录时客户端 User-Agent，最多 512 字符';
COMMENT ON COLUMN pinova.member_login_session.created_at IS '会话创建时间';
COMMENT ON COLUMN pinova.member_login_session.created_by IS '创建会员主键';
COMMENT ON COLUMN pinova.member_login_session.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.member_login_session.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_member_login_session_token_hash
    ON pinova.member_login_session (token_hash);

CREATE INDEX idx_member_login_session_member_active
    ON pinova.member_login_session (member_id, expires_at DESC, id DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_member_login_session_active_expiration
    ON pinova.member_login_session (expires_at, id)
    WHERE revoked_at IS NULL;
