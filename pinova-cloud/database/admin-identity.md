# 后台身份与权限

后台身份与商城会员身份完全分离，由 `admin_account`、`admin_login_session`、`admin_role`、`admin_permission` 及两张关联表组成。

- 正常服务不提供管理员注册接口。
- 首个临时超级管理员通过非 Web 引导模式创建，数据库迁移不写默认账号或密码。
- 密码只保存 BCrypt 摘要；会话只保存随机令牌的 SHA-256 哈希。
- 临时管理员必须先修改密码，才能使用角色授予的业务权限。
- 首期内置 `SUPER_ADMIN` 角色和 `ORDER_READ` 权限，不提供账号或角色管理页面。
- 后台会话与 `PINOVA_MEMBER_SESSION` 完全分离。

初始化脚本为 `database/init/024-create-admin-identity.sql`。

## 本地初始化

先加载 `.env` 并应用迁移：

```bash
set -a
source .env
set +a
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/024-create-admin-identity.sql
```

只有 `admin_account` 为空时才能执行首个管理员引导。引导账号是临时超级管理员，首次登录后必须修改密码：

```bash
export PINOVA_ADMIN_BOOTSTRAP_USERNAME=admin
export PINOVA_ADMIN_BOOTSTRAP_PASSWORD='<temporary-password>'
mvn -pl pinova-api -am -DskipTests package
java -Dloader.main=com.pinova.AdminBootstrapApplication \
  -cp pinova-api/target/pinova-api-1.0.0-SNAPSHOT.jar \
  org.springframework.boot.loader.launch.PropertiesLauncher
unset PINOVA_ADMIN_BOOTSTRAP_USERNAME PINOVA_ADMIN_BOOTSTRAP_PASSWORD
```

账号表非空、用户名或密码缺失时，引导命令会失败且不修改数据。不要把临时密码写入脚本、日志或版本库。
