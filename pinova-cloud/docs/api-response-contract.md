# API 响应协议

Pinova API 使用 HTTP 状态码表达请求结果，成功响应使用统一数据结构，失败响应遵循 RFC 9457 Problem Details。

## 成功响应

Controller 返回 `ApiResponse<T>`：

```json
{
  "code": "SUCCESS",
  "message": "success",
  "data": {}
}
```

```java
return ApiResponse.success(data);
```

没有响应数据时使用 `ApiResponse.success()`，此时 `data` 为 `null`。分页信息属于业务数据，应定义分页 DTO 后放入 `data`，不能向顶层响应增加临时字段。

## 失败响应

错误响应使用 `application/problem+json`：

```json
{
  "type": "about:blank",
  "title": "请求资源不存在",
  "status": 404,
  "detail": "会员 12345 不存在",
  "instance": "/member-accounts/12345",
  "code": "MEMBER.ACCOUNT_NOT_FOUND",
  "traceId": "0123456789abcdef0123456789abcdef"
}
```

参数校验失败时额外包含 `errors`：

```json
{
  "type": "about:blank",
  "title": "请求参数无效",
  "status": 400,
  "detail": "请求参数无效",
  "instance": "/member-accounts",
  "code": "COMMON.INVALID_REQUEST",
  "traceId": "0123456789abcdef0123456789abcdef",
  "errors": [
    {"field": "mobile", "message": "手机号格式错误"}
  ]
}
```

## 错误码

业务域通过枚举实现 `ErrorCode`，错误码格式为 `<DOMAIN>.<REASON>`：

```java
public enum MemberErrorCode implements ErrorCode {
    ACCOUNT_NOT_FOUND("MEMBER.ACCOUNT_NOT_FOUND", "会员不存在", 404);

    private final String code;
    private final String message;
    private final int httpStatus;

    MemberErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public String message() {
        return message;
    }

    @Override
    public int httpStatus() {
        return httpStatus;
    }
}
```

Service 抛出 `BusinessException`，不能在 Controller 中重复拼装错误响应：

```java
throw new BusinessException(MemberErrorCode.ACCOUNT_NOT_FOUND);
```

## 约束

- HTTP 状态码必须与错误语义一致，不能所有请求都返回 HTTP 200。
- `code` 是客户端判断分支的稳定契约；`message`、`title` 和 `detail` 只用于展示与诊断。
- 禁止把异常堆栈、SQL、密码摘要或内部类名返回给客户端。
- 未知异常统一返回 `COMMON.INTERNAL_ERROR`，完整异常只记录在服务端日志。
- 每个响应返回 `X-Trace-Id`。合法的上游 Trace ID 会继续传递，否则当前服务生成新值。
- 客户端报错时应同时提供 `traceId`，用于跨服务检索日志。
