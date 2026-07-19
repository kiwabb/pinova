CREATE TABLE pinova.member_account (
    id                  bigint         NOT NULL,
    member_no           varchar(32)    NOT NULL,
    username            varchar(64),
    mobile              varchar(32),
    email               varchar(254),
    password_hash       varchar(255),
    nickname            varchar(64)    NOT NULL,
    avatar_url          varchar(512),
    status              smallint       NOT NULL DEFAULT 1,
    last_login_at       timestamptz(3),
    last_login_ip       inet,
    password_changed_at timestamptz(3),
    version             integer        NOT NULL DEFAULT 0,
    deleted             boolean        NOT NULL DEFAULT false,
    deleted_at          timestamptz(3),
    deleted_by          bigint,
    created_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          bigint         NOT NULL DEFAULT 0,
    updated_at          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          bigint         NOT NULL DEFAULT 0,
    CONSTRAINT pk_member_account PRIMARY KEY (id),
    CONSTRAINT uk_member_account_member_no UNIQUE (member_no),
    CONSTRAINT ck_member_account_member_no_not_blank CHECK (btrim(member_no) <> ''),
    CONSTRAINT ck_member_account_username_not_blank CHECK (username IS NULL OR btrim(username) <> ''),
    CONSTRAINT ck_member_account_mobile_not_blank CHECK (mobile IS NULL OR btrim(mobile) <> ''),
    CONSTRAINT ck_member_account_email_not_blank CHECK (email IS NULL OR btrim(email) <> ''),
    CONSTRAINT ck_member_account_password_hash_not_blank CHECK (
        password_hash IS NULL OR btrim(password_hash) <> ''
    ),
    CONSTRAINT ck_member_account_login_identifier CHECK (
        username IS NOT NULL OR mobile IS NOT NULL OR email IS NOT NULL
    ),
    CONSTRAINT ck_member_account_nickname_not_blank CHECK (btrim(nickname) <> ''),
    CONSTRAINT ck_member_account_status CHECK (status IN (0, 1, 2)),
    CONSTRAINT ck_member_account_version CHECK (version >= 0),
    CONSTRAINT ck_member_account_deleted CHECK (
        (deleted = false AND deleted_at IS NULL AND deleted_by IS NULL)
        OR
        (deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

COMMENT ON TABLE pinova.member_account IS '商城会员账户';
COMMENT ON COLUMN pinova.member_account.id IS '主键，由应用生成';
COMMENT ON COLUMN pinova.member_account.member_no IS '公开且不可复用的会员编号';
COMMENT ON COLUMN pinova.member_account.username IS '登录用户名，应用层去除首尾空格并统一规范化';
COMMENT ON COLUMN pinova.member_account.mobile IS '登录手机号，应用层统一为国际格式';
COMMENT ON COLUMN pinova.member_account.email IS '登录邮箱，按大小写不敏感方式唯一';
COMMENT ON COLUMN pinova.member_account.password_hash IS '密码摘要；验证码登录账户可为空，禁止保存明文密码';
COMMENT ON COLUMN pinova.member_account.nickname IS '会员昵称';
COMMENT ON COLUMN pinova.member_account.avatar_url IS '头像资源地址';
COMMENT ON COLUMN pinova.member_account.status IS '账户状态：0-禁用，1-正常，2-锁定';
COMMENT ON COLUMN pinova.member_account.last_login_at IS '最近一次成功登录时间';
COMMENT ON COLUMN pinova.member_account.last_login_ip IS '最近一次成功登录 IP';
COMMENT ON COLUMN pinova.member_account.password_changed_at IS '最近一次密码变更时间';
COMMENT ON COLUMN pinova.member_account.version IS '乐观锁版本号';
COMMENT ON COLUMN pinova.member_account.deleted IS '逻辑删除标记';
COMMENT ON COLUMN pinova.member_account.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN pinova.member_account.deleted_by IS '逻辑删除操作人';
COMMENT ON COLUMN pinova.member_account.created_at IS '创建时间';
COMMENT ON COLUMN pinova.member_account.created_by IS '创建人，0 表示系统';
COMMENT ON COLUMN pinova.member_account.updated_at IS '最后更新时间';
COMMENT ON COLUMN pinova.member_account.updated_by IS '最后更新人，0 表示系统';

CREATE UNIQUE INDEX uk_member_account_username_active
    ON pinova.member_account (lower(username))
    WHERE username IS NOT NULL AND deleted = false;

CREATE UNIQUE INDEX uk_member_account_mobile_active
    ON pinova.member_account (mobile)
    WHERE mobile IS NOT NULL AND deleted = false;

CREATE UNIQUE INDEX uk_member_account_email_active
    ON pinova.member_account (lower(email))
    WHERE email IS NOT NULL AND deleted = false;

CREATE INDEX idx_member_account_created_at_active
    ON pinova.member_account (created_at DESC, id DESC)
    WHERE deleted = false;
