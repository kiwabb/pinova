CREATE TABLE pinova.admin_account (
    id                    bigint         NOT NULL,
    username              varchar(64)    NOT NULL,
    display_name          varchar(64)    NOT NULL,
    password_hash         varchar(255)   NOT NULL,
    status                smallint       NOT NULL DEFAULT 1,
    must_change_password  boolean        NOT NULL DEFAULT true,
    password_changed_at   timestamptz(3),
    last_login_at         timestamptz(3),
    last_login_ip         inet,
    failed_login_count    integer        NOT NULL DEFAULT 0,
    locked_until          timestamptz(3),
    version               integer        NOT NULL DEFAULT 0,
    deleted               boolean        NOT NULL DEFAULT false,
    deleted_at            timestamptz(3),
    deleted_by            bigint,
    created_at            timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            bigint         NOT NULL DEFAULT 0,
    updated_at            timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by            bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_account PRIMARY KEY (id),
    CONSTRAINT ck_admin_account_username CHECK (
        username = lower(btrim(username)) AND username ~ '^[a-z][a-z0-9_]{3,31}$'
    ),
    CONSTRAINT ck_admin_account_display_name CHECK (btrim(display_name) <> ''),
    CONSTRAINT ck_admin_account_password_hash CHECK (btrim(password_hash) <> ''),
    CONSTRAINT ck_admin_account_status CHECK (status IN (0, 1)),
    CONSTRAINT ck_admin_account_failed_login_count CHECK (failed_login_count >= 0),
    CONSTRAINT ck_admin_account_version CHECK (version >= 0),
    CONSTRAINT ck_admin_account_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.admin_account IS 'Pinova 运营后台独立管理员账号';
COMMENT ON COLUMN pinova.admin_account.username IS '规范化后台登录名，小写且不可复用';
COMMENT ON COLUMN pinova.admin_account.password_hash IS 'BCrypt 密码摘要，禁止保存明文密码';
COMMENT ON COLUMN pinova.admin_account.must_change_password IS '临时管理员首次登录是否必须修改密码';
COMMENT ON COLUMN pinova.admin_account.failed_login_count IS '连续失败登录次数，成功登录后清零';
COMMENT ON COLUMN pinova.admin_account.locked_until IS '失败次数达到阈值后的临时锁定截止时间';

CREATE UNIQUE INDEX uk_admin_account_username_active
    ON pinova.admin_account (lower(username))
    WHERE deleted = false;

CREATE TABLE pinova.admin_role (
    id          bigint         NOT NULL,
    role_code   varchar(64)    NOT NULL,
    name        varchar(64)    NOT NULL,
    built_in    boolean        NOT NULL DEFAULT false,
    version     integer        NOT NULL DEFAULT 0,
    deleted     boolean        NOT NULL DEFAULT false,
    deleted_at  timestamptz(3),
    deleted_by  bigint,
    created_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  bigint         NOT NULL DEFAULT 0,
    updated_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_role PRIMARY KEY (id),
    CONSTRAINT uk_admin_role_code UNIQUE (role_code),
    CONSTRAINT ck_admin_role_code CHECK (role_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
    CONSTRAINT ck_admin_role_name CHECK (btrim(name) <> ''),
    CONSTRAINT ck_admin_role_version CHECK (version >= 0),
    CONSTRAINT ck_admin_role_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

CREATE TABLE pinova.admin_permission (
    id               bigint         NOT NULL,
    permission_code  varchar(64)    NOT NULL,
    name             varchar(64)    NOT NULL,
    built_in         boolean        NOT NULL DEFAULT false,
    version          integer        NOT NULL DEFAULT 0,
    deleted          boolean        NOT NULL DEFAULT false,
    deleted_at       timestamptz(3),
    deleted_by       bigint,
    created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       bigint         NOT NULL DEFAULT 0,
    updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by       bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_permission PRIMARY KEY (id),
    CONSTRAINT uk_admin_permission_code UNIQUE (permission_code),
    CONSTRAINT ck_admin_permission_code CHECK (permission_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
    CONSTRAINT ck_admin_permission_name CHECK (btrim(name) <> ''),
    CONSTRAINT ck_admin_permission_version CHECK (version >= 0),
    CONSTRAINT ck_admin_permission_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

CREATE TABLE pinova.admin_account_role (
    id          bigint         NOT NULL,
    account_id  bigint         NOT NULL,
    role_id     bigint         NOT NULL,
    created_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  bigint         NOT NULL DEFAULT 0,
    updated_at  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_account_role PRIMARY KEY (id),
    CONSTRAINT uk_admin_account_role UNIQUE (account_id, role_id),
    CONSTRAINT fk_admin_account_role_account FOREIGN KEY (account_id) REFERENCES pinova.admin_account (id),
    CONSTRAINT fk_admin_account_role_role FOREIGN KEY (role_id) REFERENCES pinova.admin_role (id)
);

CREATE TABLE pinova.admin_role_permission (
    id             bigint         NOT NULL,
    role_id        bigint         NOT NULL,
    permission_id  bigint         NOT NULL,
    created_at     timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     bigint         NOT NULL DEFAULT 0,
    updated_at     timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by     bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_role_permission PRIMARY KEY (id),
    CONSTRAINT uk_admin_role_permission UNIQUE (role_id, permission_id),
    CONSTRAINT fk_admin_role_permission_role FOREIGN KEY (role_id) REFERENCES pinova.admin_role (id),
    CONSTRAINT fk_admin_role_permission_permission FOREIGN KEY (permission_id) REFERENCES pinova.admin_permission (id)
);

CREATE TABLE pinova.admin_login_session (
    id           bigint         NOT NULL,
    account_id   bigint         NOT NULL,
    token_hash   varchar(64)    NOT NULL,
    expires_at   timestamptz(3) NOT NULL,
    last_seen_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at   timestamptz(3),
    client_ip    inet,
    user_agent   varchar(512),
    created_at   timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   bigint         NOT NULL DEFAULT 0,
    updated_at   timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by   bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_admin_login_session PRIMARY KEY (id),
    CONSTRAINT fk_admin_login_session_account FOREIGN KEY (account_id) REFERENCES pinova.admin_account (id),
    CONSTRAINT ck_admin_login_session_token_hash CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_admin_login_session_expiration CHECK (expires_at > created_at),
    CONSTRAINT ck_admin_login_session_last_seen CHECK (last_seen_at >= created_at),
    CONSTRAINT ck_admin_login_session_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at),
    CONSTRAINT ck_admin_login_session_user_agent CHECK (user_agent IS NULL OR btrim(user_agent) <> '')
);

CREATE UNIQUE INDEX uk_admin_login_session_token_hash ON pinova.admin_login_session (token_hash);
CREATE INDEX idx_admin_login_session_account_active
    ON pinova.admin_login_session (account_id, expires_at DESC, id DESC)
    WHERE revoked_at IS NULL;
CREATE INDEX idx_admin_login_session_active_expiration
    ON pinova.admin_login_session (expires_at, id)
    WHERE revoked_at IS NULL;
CREATE INDEX idx_admin_account_role_account ON pinova.admin_account_role (account_id, role_id);
CREATE INDEX idx_admin_role_permission_role ON pinova.admin_role_permission (role_id, permission_id);

INSERT INTO pinova.admin_role (
    id, role_code, name, built_in, version, deleted, created_by, updated_by
) VALUES (
    920000000000000001, 'SUPER_ADMIN', '超级管理员', true, 0, false, 0, 0
);

INSERT INTO pinova.admin_permission (
    id, permission_code, name, built_in, version, deleted, created_by, updated_by
) VALUES (
    920000000000000101, 'ORDER_READ', '读取订单', true, 0, false, 0, 0
);

INSERT INTO pinova.admin_role_permission (
    id, role_id, permission_id, created_by, updated_by
) VALUES (
    920000000000000201, 920000000000000001, 920000000000000101, 0, 0
);

