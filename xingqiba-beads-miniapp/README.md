# 星期八 · 拼豆微信小程序

AppID：`wx45e33e348d630daf`  
CloudBase 环境：`cloud1-d6gtwjvgqe576cbf0`

## 当前功能

- 首页、图集、系列详情、门店、个人中心、会员中心与新手教程
- 照片在本机转换为拼豆图纸，支持 16/24/32/48 网格、颜色数量、裁剪位置、亮度、对比度、圆豆/方格预览、用量统计与相册导出
- 图集会员等级访问控制、收藏、云端作品保存与再次编辑
- 微信官方手机号授权绑定、成长值、积分与 V1–V4 等级
- 编辑器和预约弹层可就地完成手机号授权；已绑定用户可重新授权更新联系方式，且不会重复领取首次绑定奖励
- 门店资料与实景图册管理、预约容量校验、预约取消与记录查询
- CloudBase 管理后台：概览、图集、预约、用户会员、用户作品、教程和运营配置
- `web-studio/` 提供可独立运行的 React 照片转拼豆工作台，包含本地转换、精细编辑、3D 效果预览和 PNG 导出
- 后台图片上传自动压缩为最长边 2000px 的高质量 WebP，降低图集、教程和门店图册加载成本
- 后台和用户作品上传均记录待清理文件，刷新、崩溃或响应丢失后可自动清理未引用文件
- 作品保存使用递增版本号，跨设备同时编辑时拒绝静默覆盖；后台会员编辑同样会检测积分和成长值并发变化
- 首页、图集、用户记录和后台业务列表均读取真实云端数据并支持分页；云存储作品使用临时访问地址

原照片不会主动上传；只有生成后的图纸预览和网格数据在用户保存作品时写入云端。

## 本地检查

```bash
npm install
npm test
npm run typecheck
```

使用微信开发者工具打开本目录。云函数目录为 `cloudfunctions/`，小程序目录为 `miniprogram/`。

## 照片转换 Web 工作台

```bash
cd web-studio
npm install
npm run dev
```

如果管理后台已占用 `5173` 端口，可使用 `npm run dev -- --port 5174`。Web 工作台会在浏览器 Web Worker 中处理照片，不会主动上传原图。更多说明见 [`web-studio/README.md`](web-studio/README.md)。

## 云函数部署

```bash
./uploadCloudFunction.sh
```

只部署本次修改的函数时传入名称，例如 `./uploadCloudFunction.sh userService adminService`。环境 ID、开发者工具端口和 CLI 路径可分别通过 `CLOUD_ENV_ID`、`WECHAT_IDE_PORT`、`WECHAT_CLI` 覆盖。

## CloudBase 数据权限

小程序和管理后台的业务数据均通过云函数读取。请在 CloudBase 控制台将以下集合设置为“客户端不可直接读写”，云函数仍可使用服务端权限访问：

`users`、`member_profiles`、`favorites`、`works`、`bookings`、`booking_slots`、`reward_counters`、`admins`、`admin_audit_logs`、`member_configs`、`store_configs`、`tutorial_configs`、`collections`。

同时关闭 CloudBase 用户名密码账号的公开注册，只在控制台创建管理员账号。管理员 UID 必须作为 `admins` 文档 ID；`owner` 可修改会员、门店和用户资料并删除用户作品，`editor` 可维护内容与预约。

`reward_counters` 只由 `userService` 在事务中读写，用于限制同一用户每天获得“新作品奖励”的次数，并拦截异常高频的作品保存和预约提交。文档 ID 是用户、操作类型和上海自然日组合后的 SHA-256，不作为客户端身份凭证，也不允许客户端直接查询或修改；90 天前的计数会在云函数冷启动时分批清理。

云存储中的 `admin/collections/`、`admin/tutorials/`、`admin/store/` 和 `user-works/` 允许已登录客户端执行上传，但删除统一经过云函数校验。CloudBase 存储权限应设置为“仅创建者可写”，禁止匿名上传和跨用户覆盖；业务集合权限与存储权限是两套独立配置，必须分别检查。

后台操作日志保留最近 365 天。店主打开“操作日志”时，`adminService` 会每次最多清理 100 条过期记录；365 天内的日志不会自动删除。

## 数据库索引

为避免数据量上升后分页查询退化，请在 CloudBase 数据库索引中创建以下复合索引。代码在索引尚未创建时有兼容回退，但正式运营必须创建：

| 集合 | 字段顺序 |
| --- | --- |
| `collections` | `status` 升序、`sort` 升序 |
| `favorites` | `userId` 升序、`createdAt` 降序 |
| `works` | `userId` 升序、`updatedAt` 降序 |
| `bookings` | `userId` 升序、`createdAt` 降序 |
| `bookings` | `userId` 升序、`status` 升序 |
| `bookings` | `date` 升序、`timeSlot` 升序、`status` 升序 |

后台按单字段读取 `users.createdAt`、`works.updatedAt` 和 `bookings.date`，使用 CloudBase 默认单字段索引即可。

完整的环境、权限和发布核对步骤见 [`docs/CLOUDBASE_CHECKLIST.md`](docs/CLOUDBASE_CHECKLIST.md)。

## 上线前外部条件

以下能力不能用测试代码替代真实商户资质：

- 微信手机号能力：小程序主体需完成认证并拥有接口权限。
- 微信支付：需微信支付商户号、API v3 密钥、商户证书、商品与退款规则。
- 订阅消息：需在微信公众平台申请预约确认、到店提醒等模板 ID。
- 正式隐私政策、用户协议、门店地址、客服电话和退款说明。

优惠券、付费会员和订阅提醒在对应规则、资质与模板确定前不会展示虚假入口。门店页原有的演示优惠券已移除。

不要把 AppSecret、管理员密码、支付密钥或证书提交到项目中。
