# 标准化请求体校验

## Goal

统一 Pinova API 的 JSON 请求体校验方式，删除控制器中的重复空值判断，使用 Spring MVC 必填请求体语义和 Jakarta Bean Validation 返回一致的 HTTP 400 错误。

## Requirements

* 所有业务 JSON 请求参数统一声明为 `@Valid @RequestBody`，不再使用 `required = false` 接收本应必填的请求体。
* 删除控制器中的 `body == null`、`request == null` 和 `requireBody` 辅助判空。
* 为所有现有 Request 模型补充与服务层规则一致的基础字段约束，包括必填、正数、版本非负、集合非空和已有长度上限。
* 对订单明细集合启用级联校验，并拒绝集合中的 `null` 元素。
* 跨字段和业务状态规则继续由服务层校验，不把业务冲突错误改成参数绑定错误。
* 缺失或不可解析的 JSON 由现有 `HttpMessageNotReadableException` 处理；字段校验错误由现有 `MethodArgumentNotValidException` 处理。

## Acceptance Criteria

* [x] 代码中不存在 `@RequestBody(required = false)`。
* [x] 控制器中不存在仅用于请求体判空的手动逻辑。
* [x] 全部 12 个请求体入口使用 `@Valid @RequestBody`。
* [x] Request 模型的基础字段约束覆盖控制器当前使用到的必填字段。
* [x] 缺失请求体和字段校验失败均返回 HTTP 400，不进入业务服务。
* [x] Pinova API 的聚焦测试和编译通过。

## Definition of Done

* 聚焦 API 测试覆盖缺失请求体与字段校验。
* Java 编译和相关测试通过。
* 变更范围内不存在残留重复模式。
* 只提交本任务相关文件。

## Technical Approach

* 在 `pinova-api` 引入 `spring-boot-starter-validation`。
* Request record 直接使用 Jakarta Validation 注解表达 HTTP 边界的结构约束。
* Controller 方法参数使用 `@Valid @RequestBody`，依赖 `GlobalExceptionHandler` 统一转换为 RFC 9457 Problem Detail。
* Service 层保留规范化、跨字段校验、授权、幂等和业务冲突判断。

## Decision (ADR-lite)

**Context**: 当前部分接口通过 `required = false` 加手动判空，另一些默认必填接口仍做不可达的空值判断，字段模型没有 Bean Validation。

**Decision**: 使用 Spring MVC 默认的必填请求体语义，并在所有请求入口统一启用 Bean Validation。

**Consequences**: 空请求体的错误详情统一为“请求体格式错误”，字段错误获得结构化 `errors`；服务层仍作为业务规则的最终防线。

## Out of Scope

* 修改 Service 层业务错误码与业务规则。
* 修改前端请求结构。
* 新增通用校验辅助类或自定义跨字段注解。
* 调整查询参数、路径参数和请求头校验。

## Technical Notes

* 现有统一异常处理：`pinova-api/.../GlobalExceptionHandler.java`。
* 订单请求约束参考 `.trellis/spec/backend/trade-order-contract.md`。
* 本次为 HTTP 边界一致性改造，不改变订单、支付、认证、地址或购物车业务语义。
