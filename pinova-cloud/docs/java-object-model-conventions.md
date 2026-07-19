# Java 对象模型规范

Pinova 按对象所属边界和真实职责命名，不采用 `PO/BO/DTO/VO` 全链路机械转换。

## 核心原则

- 类名必须说明对象的职责，不能只说明“它用于传数据”。
- API、应用服务和数据库模型相互独立，禁止跨层直接暴露内部对象。
- 转换发生在边界处：Controller 负责 API 模型转换，Service 负责业务结果与实体转换。
- 不为形式上的分层复制对象；只有字段、约束、生命周期或所有权不同时才创建独立类型。
- 对外契约优先保持兼容，内部模型可以独立演进。

## 对象类型

| 类型 | 所属模块 | 用途 | 示例 |
| --- | --- | --- | --- |
| `Entity` | `pinova-pojo` | 数据库表映射 | `ProductCategory` |
| `Request` | `pinova-api` | HTTP 请求体或复杂请求参数 | `CreateProductRequest` |
| `Response` | `pinova-api` | 返回给 HTTP 客户端的稳定契约 | `ProductCategoryTreeResponse` |
| `Command` | `pinova-service` | 发起一个会改变状态的用例 | `CreateProductCommand` |
| `Query` | `pinova-service` | 应用层查询条件 | `ProductPageQuery` |
| `Result` | `pinova-service` | 应用服务返回结果 | `ProductCategoryTreeResult` |
| `Event` | 事件所属业务模块 | 已经发生的业务事实 | `OrderCreatedEvent` |
| 值对象 | 业务模块 | 有业务含义且按值比较的概念 | `Money`、`Address` |

## API 层

### Request

简单的路径参数和单个查询参数直接使用 Spring MVC 注解。包含多个字段、需要校验或需要版本管理时定义 `Request`：

```java
public record CreateProductRequest(
        String name,
        Long categoryId) {
}
```

`Request` 只能存在于 `pinova-api`，不能传入 Mapper，也不能作为数据库实体保存。Controller 将其转换为 `Command` 或 `Query`。

### Response

Controller 只能返回 `Response`、基础值或统一响应包装 `ApiResponse<T>`：

```java
public record ProductCategorySummaryResponse(
        Long id,
        String categoryCode,
        String name,
        String iconUrl) {
}
```

禁止直接返回 Entity。响应模型不能包含密码摘要、逻辑删除字段、乐观锁版本和内部审计字段，除非接口契约明确需要。

## Service 层

### Command

`Command` 表达写操作意图，使用业务语言命名：

```java
public record CreateProductCommand(
        String name,
        Long categoryId,
        Long operatorId) {
}
```

一个 Command 对应一个明确用例，不使用 `Map<String, Object>` 传递业务参数。

### Query

`Query` 表达查询条件，不承载查询结果：

```java
public record ProductPageQuery(
        Long categoryId,
        String keyword,
        int page,
        int size) {
}
```

### Result

`Result` 是 Service 对调用方提供的结果，不包含 HTTP 注解或序列化配置：

```java
public record ProductCategoryTreeResult(
        Long id,
        String name,
        List<ProductCategoryTreeResult> children) {
}
```

Controller 负责把 `Result` 转换为 `Response`。Service 不能依赖 `pinova-api`，也不能返回 API 模块中的类型。

## Entity

Entity 只用于持久化映射，放在 `pinova-pojo` 的 `entity` 包：

```java
@TableName("product_category")
public class ProductCategory {
    // persistence fields
}
```

Entity 可以进入 Mapper 和 Service，但不能直接进入 Controller 响应。新增或更新数据库时，Service 显式完成 Command 与 Entity 的转换。

## DTO、BO 和 VO

### DTO

不把 `DTO` 作为固定层级。只有以下场景使用 DTO：

- RPC 客户端或服务端的版本化传输契约；
- 对接外部系统的适配器模型；
- 无法使用更准确名称的通用批量导入、导出格式。

HTTP 请求和响应分别使用 `Request`、`Response`，Service 输入输出分别使用 `Command`、`Query`、`Result`。

### BO

不使用通用 `XxxBO` 后缀。按真实职责命名为 `Context`、`Command`、`Result`、`Policy` 或具体业务概念，例如：

```text
OrderPricingContext
SubmitOrderCommand
OrderCalculationResult
```

### VO

不使用 `VO` 表示接口返回值，统一使用 `Response`。DDD 值对象直接使用业务名称，例如 `Money`，不添加 `VO` 后缀。

## 包结构

```text
pinova-api
└── com.pinova.api
    ├── assembler
    ├── controller
    ├── request
    └── response

pinova-service
└── com.pinova.service
    ├── assembler
    ├── command
    ├── query
    ├── model
    └── impl

pinova-pojo
└── com.pinova.pojo
    └── entity
```

业务规模扩大后可在上述目录内增加业务域子包，例如 `response.product`、`command.order`，不能恢复成按 `BO/DTO/VO` 后缀堆放的横向分层。

## 转换规则

```text
HTTP Request
  -> Controller: Request 转换为 Command 或 Query
  -> Service: Command 或 Query 转换、查询 Entity
  -> ResultAssembler: Entity 转换为 Result
  -> Service: 编排业务查询与操作
  -> ResponseAssembler: Result 转换为 Response
  -> Controller: 编排 HTTP 请求和响应
  -> ApiResponse<Response>
```

- `Result` 到 `Response` 的转换按业务域放入 `pinova-api` 的专用 `*ResponseAssembler`，Controller 不内置不断增长的映射方法。
- `Entity` 到 `Result` 的转换按业务域放入 `pinova-service` 的专用 `*ResultAssembler`，ServiceImpl 不内置不断增长的映射方法。
- Assembler 方法必须用 `toSummaryResponse`、`toTreeResponse` 等名称表达目标形态，不能为不同响应结构重载无语义的 `toResponse`。
- Assembler 只能执行纯对象转换，不能查询 Mapper、仓储、远程服务或其他基础设施；转换所需的派生数据由 Service 编排后显式传入。
- 简单字段复制使用显式 Java 代码，不引入额外映射框架。
- Assembler 只能依赖 API 模型和上游 Service 模型，不能造成模块反向依赖。
- 列表和树中的集合返回空集合，不返回 `null`。
- 分页响应统一定义 `PageResponse<T>`，不能直接暴露 MyBatis-Plus `Page`。

## 禁止事项

- Controller 直接返回 Entity；
- Service 返回 `Response` 或接收 `Request`；
- Mapper 接收 `Request`、`Command` 或 `Response`；
- 使用 `Map<String, Object>` 代替明确类型；
- 为每一层机械创建字段完全相同的 `PO/BO/DTO/VO`；
- 在 Response 中暴露密码、令牌、软删除和内部审计字段；
- 使用 `XxxVO` 同时表示 View Object 和 Value Object。
