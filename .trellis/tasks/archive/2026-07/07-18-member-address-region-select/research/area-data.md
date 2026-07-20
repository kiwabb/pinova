# 行政区数据源

## Decision

使用 `@vant/area-data@2.1.0`。该包提供 `province_list`、`city_list`、`county_list` 代码到名称的映射，可在浏览器本地构造三级联动选项，无运行时网络依赖。

## Evidence

- npm 描述：Vant 省市区数据。
- MIT 许可。
- 解包体积约 322,805 字节。
- 对比的 `china-area-data@5.0.1` README 标明 v5 数据源日期为 2019-10-31，因此不采用。

## Integration

- 将行政区数据封装在 member-addresses feature 内的纯函数模块。
- 根据行政区代码前缀筛选城市和区县。
- UI 使用原生 `select`，保持键盘访问和浏览器自动填充能力。
