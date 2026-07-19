# PINOVA

PINOVA 是一个包含商城前后端、运营后台和微信小程序的电商项目。

## 目录

- `pinova-cloud/`：商城全栈工程
  - `pinova-api/`：Spring Boot API 与后台接口
  - `pinova-admin/`：运营后台（React + Vite）
  - `pinova-web/`：商城用户端（Next.js）
  - `database/`：PostgreSQL 初始化脚本与数据模型文档
- `miniapp/`：微信小程序端（Taro + React）
- `xingqiba-beads-miniapp/`：星期八图集小程序完整工程
  - `admin/`：图集与材料配置管理后台
  - `cloudfunctions/`：`adminService`、`galleryService` 等 CloudBase 云函数
  - `miniprogram/`：微信小程序端
  - `web-studio/`：网页拼豆图纸工作台

## 本地开发

后端与数据库说明见 [`pinova-cloud/README.md`](pinova-cloud/README.md)。

```bash
cd pinova-cloud
docker compose up -d postgres
mvn spring-boot:run -pl pinova-api -am
```

启动商城前端：

```bash
cd pinova-cloud/pinova-web
npm install
npm run dev
```

启动运营后台：

```bash
cd pinova-cloud/pinova-admin
npm install
npm run dev
```

启动微信小程序：

```bash
cd miniapp
npm install
npm run dev:weapp
```

图集小程序工程的后台和云函数依赖 CloudBase，具体配置与部署脚本见
`xingqiba-beads-miniapp/README.md` 和 `xingqiba-beads-miniapp/uploadCloudFunction.sh`。

## 注意事项

- `.env`、依赖目录、构建产物和本地日志不会提交到 Git。
- 微信小程序发布前，请在 `miniapp/project.config.json` 中替换正式 AppID。
- 后端需要 Java 21、Maven 3.9+ 和 PostgreSQL。
