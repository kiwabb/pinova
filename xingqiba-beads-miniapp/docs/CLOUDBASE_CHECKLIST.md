# CloudBase 配置与发布检查表

适用环境：`cloud1-d6gtwjvgqe576cbf0`

## 1. 身份与管理员

- 关闭用户名密码账号公开注册。
- 只在 CloudBase 控制台创建后台账号，不在代码中保存邮箱密码。
- 在 `admins` 集合创建与登录账号 UID 同名的文档。
- 店主文档使用 `{ "name": "店主显示名", "role": "owner", "active": true }`。
- 内容管理员使用 `role: "editor"`；停用账号时将 `active` 改为 `false`。

## 2. 数据库权限

以下集合全部设置为“客户端不可直接读写”，小程序和后台只通过云函数访问：

`users`、`member_profiles`、`favorites`、`works`、`bookings`、`booking_slots`、`reward_counters`、`admins`、`admin_audit_logs`、`member_configs`、`store_configs`、`tutorial_configs`、`collections`。

关键边界：

- `users` 保存微信身份关联、手机号绑定状态和账号状态。
- `member_profiles` 保存等级、成长值和积分，等级由最新已发布会员规则计算。
- `reward_counters` 用于每日作品奖励、作品写入和预约提交限次，只能由 `userService` 的事务更新；90 天前记录会分批清理。
- `booking_slots` 是预约并发容量计数，只能由预约事务更新。
- `admins` 和 `admin_audit_logs` 只能由 `adminService` 读取或写入。
- `member_configs`、`store_configs`、`tutorial_configs` 的 `default` 是工作稿，`published` 是小程序读取的正式版本。

修改数据库权限会直接影响线上读写。执行前先确认当前环境 ID，修改后依次验证登录、图集、作品保存和预约。

## 3. 云存储权限

- 禁止匿名上传。
- 已登录用户只能修改自己创建的文件，禁止覆盖其他用户文件。
- 管理后台上传路径限定为 `admin/collections/`、`admin/tutorials/` 和 `admin/store/`。
- 小程序作品预览上传路径限定为 `user-works/{userId}/`。
- 删除文件必须调用 `adminService.deleteFiles`、`userService.deleteWorkUpload` 或作品删除接口；云函数会拒绝删除仍被业务记录引用的文件。
- 定期在 CloudBase 存储用量中检查孤立文件和异常上传增长。

## 4. 索引

创建以下复合索引：

| 集合 | 字段顺序 |
| --- | --- |
| `collections` | `status` 升序、`sort` 升序 |
| `favorites` | `userId` 升序、`createdAt` 降序 |
| `works` | `userId` 升序、`updatedAt` 降序 |
| `bookings` | `userId` 升序、`createdAt` 降序 |
| `bookings` | `userId` 升序、`status` 升序 |
| `bookings` | `date` 升序、`timeSlot` 升序、`status` 升序 |

`users.createdAt`、`works.updatedAt`、`bookings.date` 和 `admin_audit_logs.createdAt` 使用默认单字段索引。

## 5. 部署后冒烟测试

1. 后台店主账号登录，确认操作日志可见；编辑账号不可见。
2. 新建草稿图集，批量上传图纸，发布后在小程序图集中出现。
2a. 在 Web 工作台用管理员账号执行「导入图集」：向现有图集追加一张图纸，确认后台图纸数量、封面与操作日志更新；再用「新建图集」导入，确认生成草稿图集且封面为图纸图片。
3. 下架图集，确认小程序无法再打开；收藏记录不会绕过会员或下架校验。
4. 发布教程，确认小程序读取新标题、章节、图片和步骤。
5. 发布门店配置，提交预约，确认容量减少；取消后容量恢复。
6. 绑定测试手机号，首次新建作品获得奖励；超过每日上限后作品仍能保存但不再奖励。
7. 在编辑器和预约弹层内分别验证就地绑定；重新授权更换手机号，确认联系方式更新且不重复发放首次奖励。
8. 使用两个设备打开同一作品，先后保存，确认旧版本收到冲突提示且不会覆盖新版本。
9. 后台打开某位用户后，让该用户新增作品获得奖励，再保存旧表单，确认后台提示数据冲突。
10. 发布新的教程或门店图片版本，确认旧发布版不再引用的云文件被清理，当前草稿和发布版图片均正常。
11. 暂停测试用户，确认图集、作品、收藏和预约云函数均拒绝访问。
12. 刷新后台操作日志，确认上述关键写操作均有记录。

## 6. 正式发布前外部资源

- 已认证微信小程序主体与手机号接口权限。
- 正式隐私政策、用户协议、门店地址、客服电话和退款说明。
- 如启用支付：微信支付商户号、API v3 密钥、商户证书、商品和退款规则。
- 如启用提醒：预约确认和到店提醒的订阅消息模板 ID。

支付和订阅消息资源未齐全时保持入口关闭，不使用假商户号、假模板 ID 或本地模拟结果替代正式能力。
