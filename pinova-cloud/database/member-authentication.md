# 会员登录验证设计

Pinova 首期使用用户名、手机号或邮箱加密码登录，并签发服务端不透明会话。浏览器只持有随机原始令牌，数据库只保存令牌的 SHA-256 哈希；泄露数据库不能直接恢复可用登录 Cookie。

## 注册流程

1. 客户端向 `POST /auth/register` 提交 `username`、`nickname`、`password` 和 `confirmPassword`。
2. 用户名统一转为小写，必须以字母开头，且由 4 到 32 位字母、数字或下划线组成。
3. 新密码至少 8 个字符，必须同时包含字母和数字，UTF-8 编码后不能超过 bcrypt 的 72 字节上限。
4. Service 生成不可复用的公开会员编号，使用 bcrypt 保存密码摘要；昵称为空时使用规范化后的用户名。
5. 注册成功后创建 7 天会话并写入 `PINOVA_MEMBER_SESSION` Cookie，客户端无需再次登录。

用户名冲突返回 `409 MEMBER_AUTH.USERNAME_UNAVAILABLE`。数据库唯一索引同时处理并发注册，接口不会产生两个大小写不同但实际相同的用户名。

## 登录流程

1. 客户端向 `POST /auth/login` 提交 `identifier` 和 `password`。
2. Service 根据标识符形态精确选择用户名、E.164 手机号或邮箱查询，避免跨字段模糊匹配。
3. 使用 bcrypt 校验 `member_account.password_hash`，账号必须处于正常状态且未删除。
4. 校验成功后生成 32 字节安全随机令牌，数据库保存哈希、会员、绝对过期时间、登录 IP 和 User-Agent。
5. API 把原始令牌写入 `PINOVA_MEMBER_SESSION` Cookie，设置 `HttpOnly`、`SameSite=Lax`、`Path=/`，HTTPS 请求同时设置 `Secure`。

登录失败统一返回相同的“账号或密码错误”，不暴露账号是否存在、是否禁用或是否未设置密码。

## 会话表

`pinova.member_login_session` 保存登录会话生命周期，不保存原始令牌。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigint` | 应用生成的会话主键 |
| `member_id` | `bigint` | 登录会员主键 |
| `token_hash` | `varchar(64)` | 原始令牌的 SHA-256 哈希，全表唯一 |
| `expires_at` | `timestamptz(3)` | 绝对过期时间，首期为登录后 7 天 |
| `last_seen_at` | `timestamptz(3)` | 最近认证时间，按最小间隔更新，避免每次请求写库 |
| `revoked_at` | `timestamptz(3)` | 主动退出或安全操作撤销时间 |
| `client_ip` | `inet` | 登录来源 IP |
| `user_agent` | `varchar(512)` | 登录客户端标识 |
| 审计字段 | - | 遵循数据库固定字段规范 |

会话不使用软删除。退出只写 `revoked_at`，过期和撤销记录超过安全审计保留期后由清理任务物理删除。

## 认证规则

- 认证只接受 `PINOVA_MEMBER_SESSION` HttpOnly Cookie，不接受前端传入的 `memberId` 或临时身份请求头。
- 会话必须未撤销、未过期，关联会员必须正常且未删除。
- 若会员的 `password_changed_at` 晚于会话创建时间，则旧会话立即失效。
- `GET /auth/me` 返回当前会员最小展示信息；业务 Controller 从统一解析器取得会员 ID。
- `POST /auth/logout` 撤销当前会话并清除 Cookie，重复退出保持幂等。
- 登录接口上线公网前需要在网关或 Redis 增加按账号和 IP 的失败限流；失败计数不写入会员主表。

## 初始化

建表脚本位于 [`database/init/022-create-member-login-session.sql`](init/022-create-member-login-session.sql)。已有本地数据库手动执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/022-create-member-login-session.sql
```
