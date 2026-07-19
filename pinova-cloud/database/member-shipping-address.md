# 会员收货地址表设计

`pinova.member_shipping_address` 保存会员可编辑的常用收货地址。它是会员档案的一部分，供结算页选择配送目的地；订单创建后必须把选中的地址复制为订单地址快照，不能在订单中继续引用这张可变表。

## 字段

| 字段 | 类型 | 是否为空 | 说明 |
| --- | --- | --- | --- |
| `id` | `bigint` | 否 | 应用生成的主键 |
| `member_id` | `bigint` | 否 | 所属会员主键，外键关联 `member_account` |
| `receiver_name` | `varchar(64)` | 否 | 收货人姓名 |
| `receiver_mobile` | `varchar(32)` | 否 | 收货人手机号，应用层保存为 E.164 国际格式 |
| `country_code` | `varchar(2)` | 否 | ISO 3166-1 alpha-2 国家代码，首期默认 `CN` |
| `province_code`、`province_name` | - | 否 | 省级行政区的稳定代码和展示名称 |
| `city_code`、`city_name` | - | 否 | 市级行政区的稳定代码和展示名称 |
| `district_code`、`district_name` | - | 否 | 区县级行政区的稳定代码和展示名称 |
| `detail_address` | `varchar(255)` | 否 | 街道、门牌号、楼栋房间等详细地址 |
| `postal_code` | `varchar(16)` | 是 | 邮政编码 |
| `label` | `varchar(32)` | 是 | 用户自定义标签，例如“家”或“公司” |
| `is_default` | `boolean` | 否 | 当前默认收货地址 |
| `version` | `integer` | 否 | 乐观锁版本号 |
| 软删除与审计字段 | - | - | 遵循数据库固定字段规范 |

## 设计约束

- 行政区代码用于物流、风控和地址库对接，名称保存为创建时展示快照；行政区更名或地址库调整不应改写用户历史输入。
- `detail_address` 只保存街道与门牌等细节，不把省、市、区县再次拼入该字段，避免重复和难以校验的地址文本。
- 默认地址只在未删除数据中唯一。`uk_member_shipping_address_default_active` 保证同一会员最多一个默认地址，但允许没有默认地址。
- 切换默认地址必须在同一事务中先取消旧默认地址，再将目标地址设为默认；更新携带 `version`，避免多设备覆盖。
- 会员删除地址使用逻辑删除，删除默认地址后由 Service 选择剩余最新地址作为默认地址，或保持无默认地址。
- 会员最多可保存的地址数量、手机号格式、行政区代码层级及配送可达性由应用层校验。数据库只保证非空、审计与默认地址等稳定结构约束。
- 收货人姓名、手机号和详细地址均属于个人信息。接口按最小必要原则返回，日志、监控和运营导出必须脱敏；订单快照只向完成履约所需的主体开放。

## 订单快照边界

订单创建时应复制以下信息到交易域的订单地址快照：收货人、手机号、国家/行政区代码和名称、详细地址、邮编。之后用户编辑或删除 `member_shipping_address` 不得影响已创建订单的配送、售后和审计事实。

配送方式、运费试算、可达性、预约时间和物流轨迹不放入本表，它们分别属于履约或结算上下文。

## 初始化与执行

建表脚本位于 [`database/init/021-create-member-shipping-address.sql`](init/021-create-member-shipping-address.sql)。Docker 官方 PostgreSQL 镜像只会在数据目录首次初始化时执行该目录中的脚本；已有本地数据库需要手动执行：

```bash
docker compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U pinova -d pinova \
  < database/init/021-create-member-shipping-address.sql
```
