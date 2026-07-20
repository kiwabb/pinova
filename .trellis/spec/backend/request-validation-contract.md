# Request Validation Contract

## Scenario: Required JSON request bodies

### 1. Scope / Trigger

- Trigger: adding or changing a controller method that accepts a business JSON request body under `pinova-api`.
- Purpose: keep missing-body, malformed JSON, structural validation and business validation behavior consistent.

### 2. Signatures

Controller boundary:

```java
public ApiResponse<?> execute(@Valid @RequestBody ExampleRequest request)
```

Request model:

```java
public record ExampleRequest(
        @NotBlank String name,
        @NotNull @Positive Long resourceId,
        @NotNull List<@NotNull @Valid ExampleLineRequest> lines) {
}
```

### 3. Contracts

- A business JSON body is required unless the endpoint contract explicitly documents an absent-body meaning.
- Required bodies use Spring MVC's default `@RequestBody(required = true)` through plain `@RequestBody`.
- Every request body parameter uses `@Valid`; Request records declare structural constraints such as required values, ranges, lengths and nested validation.
- Controllers convert validated Request models to service Commands or Queries.
- Services retain normalization, authorization, cross-field rules, idempotency, state transitions and database-dependent business validation.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Body missing or JSON unreadable | HTTP 400 through `HttpMessageNotReadableException`; detail is `请求体格式错误` |
| Request field violates a Bean Validation constraint | HTTP 400 through `MethodArgumentNotValidException`; Problem Detail contains `errors` |
| Nested collection element is `null` | HTTP 400 from container-element `@NotNull` |
| Nested request field is invalid | HTTP 400 from cascaded `@Valid` |
| Cross-field or business rule fails | Stable `BusinessException` from the owning Service |

### 5. Good / Base / Bad Cases

- Good: a valid body reaches the controller and is converted to a Command.
- Base: an optional field is absent and its Service-level default or normalization remains effective.
- Bad: an absent body is accepted with `required = false` and rejected manually inside the controller.
- Bad: a nested list omits `@Valid`, allowing invalid child fields to reach the Service.

### 6. Tests Required

- Reflection guard: every business `@RequestBody` parameter is required and annotated with `@Valid`.
- MVC test: a missing body returns 400 and does not call the resolver or application Service.
- MVC test: an invalid field returns 400 with the expected field in `errors` and does not call application code.
- Validator or MVC test: nested invalid fields and `null` collection elements are rejected.
- Service tests continue to cover cross-field and business rules independently of the HTTP boundary.

### 7. Wrong vs Correct

#### Wrong

```java
public ApiResponse<?> execute(@RequestBody(required = false) ExampleRequest body) {
    if (body == null) {
        throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "请求体不能为空");
    }
}
```

#### Correct

```java
public ApiResponse<?> execute(@Valid @RequestBody ExampleRequest body) {
    return ApiResponse.success(service.execute(toCommand(body)));
}
```
