# 优化收货地址地区下拉体验

## Goal

将收货地址省、市、区县的原生下拉框升级为符合 Pinova 商城视觉语言的自定义下拉组件，解决原生控件外观粗糙的问题，同时保持完整键盘与屏幕阅读器能力。

## Requirements

- 自定义触发器沿用表单的 48px 控件高度、语义颜色和 6px 圆角。
- 使用 Lucide `ChevronDown` 表达展开状态，选中项使用 `Check` 标记。
- 下拉层显示在控件下方，具备边框、轻阴影、最大高度和内部滚动。
- 支持点击外部、Escape、Tab 关闭。
- 支持 ArrowUp/ArrowDown 移动高亮，Enter/Space 选择。
- 支持错误态、禁用态、焦点态及 `aria-expanded`、`listbox`、`option` 语义。
- 保持省、市、区县三级联动和提交名称/代码逻辑不变。
- 375px 和 1440px 下不溢出、不遮挡后续表单控件。

## Acceptance Criteria

- [x] 页面不再呈现浏览器原生 select 外观。
- [x] 鼠标和键盘均可完成省、市、区县选择。
- [x] 展开层视觉与现有 Pinova 表单一致。
- [x] 行政区请求体名称和代码保持正确。
- [x] ESLint、TypeScript 检查通过。

## Out of Scope

- 搜索地区。
- 修改行政区数据源或后端接口。
- 重构整个收货地址页面。

## Technical Notes

- 新组件放在 `pinova-web/src/features/member-addresses/components/`，保持 feature 私有。
- 参考同项目 `storefront-search.tsx` 的 listbox 与键盘高亮模式。
- 外部 UI/UX 建议仅用于键盘、触控、z-index 和焦点检查；颜色、字体、圆角遵循 `design-system/pinova-mall/MASTER.md`。
