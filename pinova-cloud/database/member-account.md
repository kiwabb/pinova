# 会员账户表设计

`pinova.member_account` 保存商城 C 端会员的账户与基础展示信息。用户账户属于 Pinova 平台，不属于某个店铺，因此本表不包含 `tenant_id`。商家员工、店铺成员和权限关系应在商家域单独建表。

## 字段

| 字段 | 类型 | 是否为空 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 否 | 应用生成的主键 |
| `member_no` | `varchar(32)` | 否 | 对外展示的稳定会员编号，删除后也不复用 |
| `username` | `varchar(64)` | 是 | 登录用户名，大小写不敏感唯一 |
| `mobile` | `varchar(32)` | 是 | 登录手机号，统一保存为国际格式 |
| `email` | `varchar(254)` | 是 | 登录邮箱，大小写不敏感唯一 |
| `password_hash` | `varchar(255)` | 是 | 密码摘要，验证码登录账户可以为空 |
| `nickname` | `varchar(64)` | 否 | 会员昵称，不承担登录标识职责 |
| `avatar_url` | `varchar(512)` | 是 | 头像资源地址 |
| `status` | `smallint` | 否 | `0` 禁用、`1` 正常、`2` 锁定 |
| `last_login_at` | `timestamptz(3)` | 是 | 最近一次成功登录时间 |
| `last_login_ip` | `inet` | 是 | 最近一次成功登录 IP |
| `password_changed_at` | `timestamptz(3)` | 是 | 最近一次密码变更时间 |
| `version` | `integer` | 否 | 乐观锁版本号 |
| `deleted`、`deleted_at`、`deleted_by` | - | - | 逻辑删除字段组 |
| `created_at`、`created_by` | - | - | 创建审计字段组 |
| `updated_at`、`updated_by` | - | - | 更新审计字段组 |

`username`、`mobile`、`email` 至少提供一个。三个字段只用于登录和找回账户，昵称可以重复。

## 设计约束

- 密码只保存 Argon2id 或 bcrypt 等密码算法生成的完整摘要，禁止自行加密或保存明文。
- 用户名和邮箱使用 `lower(...)` 表达式索引实现大小写不敏感唯一；写入前仍应在应用层去除首尾空格并规范化。
- 手机号在应用层解析并统一为 E.164 格式后写入，数据库不使用容易过时的正则表达式校验国际号码。
- 登录标识使用部分唯一索引，只约束未删除账户；`member_no` 永久唯一，不随逻辑删除释放。
- 账户禁用或锁定通过 `status` 表达，不能用逻辑删除代替。
- 真实姓名、证件号码、地址、第三方登录身份和会员等级不放入账户主表，按业务边界拆分到独立表。
- 登录失败次数、验证码和短时锁定计数属于高频临时状态，放入 Redis 等带过期机制的存储，不持续更新账户表。

## 初始化与执行

建表脚本位于 [`database/init/002-create-member-account.sql`](init/002-create-member-account.sql)。Docker 官方 PostgreSQL 镜像只会在数据目录首次初始化时执行该目录中的脚本。

已有本地数据库不会自动执行新增脚本，可手动执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/002-create-member-account.sql
```
