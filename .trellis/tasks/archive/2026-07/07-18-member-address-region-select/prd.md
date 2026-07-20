# 收货地址省市区三级联动选择

## Goal

将收货地址表单中的省级、城市、区县名称和代码手工输入改为三级联动选择框。用户只选择地区名称，表单内部同时保存对应行政区代码，以保持现有后端契约不变。

## What I already know

- 当前表单在 `member-address-form.tsx` 中展示六个文本框：省/市/区名称及对应代码。
- 后端 `SaveMemberShippingAddressRequest` 和数据库仍要求省、市、区名称及代码。
- 项目内没有行政区划数据源。
- `@vant/area-data` 提供本地省、市、县代码映射，不需要运行时公网请求。

## Assumptions

- “代码填写去掉”指移除省级代码、城市代码、区县代码三个可见输入框；代码字段仍由选择结果自动提交。
- 邮政编码是独立的可选业务字段，本次保留。
- 已保存的历史地址如果无法匹配当前区划数据，编辑时仍显示原值，用户重新选择后再更新。

## Requirements

- 省、市、区县使用三个原生 `select` 控件。
- 选择省份后清空城市和区县，城市选项仅展示该省下属项。
- 选择城市后清空区县，区县选项仅展示该市下属项。
- 每次选择同步写入 `provinceCode/provinceName`、`cityCode/cityName`、`districtCode/districtName`。
- 不展示行政区代码输入框，不改变后端请求和存储契约。
- 保留现有表单验证、编辑回填、键盘操作和错误聚焦。

## Acceptance Criteria

- [x] 新增和编辑地址时不再出现省级/城市/区县代码输入框。
- [x] 省、市、区县只能通过三级联动选择。
- [x] 提交请求仍包含正确的名称和行政区代码。
- [x] 省市区必填错误显示在对应选择框下方。
- [x] lint 和 TypeScript 检查通过。

## Out of Scope

- 修改数据库字段或 Java API 契约。
- 新增行政区划后端接口。
- 删除邮政编码字段。

## Technical Notes

- 表单：`pinova-cloud/pinova-web/src/features/member-addresses/components/member-address-form.tsx`
- 类型与验证：`pinova-cloud/pinova-web/src/features/member-addresses/types.ts`、`lib/validate-member-address.ts`
- API 映射：`pinova-cloud/pinova-web/src/features/member-addresses/lib/member-address-api.ts`
- 行政区数据选择见 `research/area-data.md`。
