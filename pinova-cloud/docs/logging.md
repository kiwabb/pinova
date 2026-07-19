# 日志规范

Pinova 使用 SLF4J 作为日志门面，Log4j2 作为运行时实现。业务代码只能依赖 `org.slf4j.Logger` 和 `LoggerFactory`，不能直接依赖 Log4j2 API。

## 输出位置

- 控制台：开发环境直接查看。
- `logs/pinova.log`：全部 INFO 及以上日志。
- `logs/pinova-error.log`：只记录 ERROR 日志。
- `logs/archive/`：按天或单文件达到 100 MB 时滚动压缩，普通日志保留 30 天。

日志目录已加入 `.gitignore`，不会提交到 Git。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PINOVA_LOG_PATH` | `logs` | 日志根目录 |
| `PINOVA_LOG_LEVEL` | `INFO` | `com.pinova` 包日志级别 |

## 日志格式

```text
2026-07-14 22:10:00.123 INFO  [http-nio-8080-exec-1] [traceId=0123456789abcdef0123456789abcdef] com.pinova.Example - message
```

每个 HTTP 响应都返回 `X-Trace-Id`，同一个值写入 MDC 和日志。HTTP 访问日志只记录请求方法、路径、响应状态和耗时，不记录请求体、查询参数、Cookie 或 Authorization。

## 使用方式

```java
private static final Logger LOGGER = LoggerFactory.getLogger(OrderService.class);

LOGGER.info("Order created: orderId={}, memberId={}", orderId, memberId);
```

禁止使用字符串拼接，避免日志级别未启用时仍执行无意义的字符串构造。

禁止记录以下信息：

- 密码、密码摘要、验证码和令牌；
- 完整手机号、邮箱、身份证号和银行卡号；
- 请求体、Cookie、Authorization 请求头；
- SQL 参数中的敏感个人信息。
