# Pinova Repository Instructions

These instructions apply to the whole repository. A nested `AGENTS.md` may add rules for its own subtree.

## Verification

- Do not run full compile, build, or type-check commands for SQL-only, config-only, or documentation-only changes unless the user explicitly asks for it.
- Prefer lightweight checks first: inspect changed files, validate syntax shape, and explain or transactionally verify SQL.
- For Java or frontend changes, run compilation, build, or type checks only when the change risk justifies the cost or the user requests verification.
- Never leave local test data, temporary servers, or validation processes running after verification.
- After a change that affects a running Java or frontend application, restart the affected development service when required to load the change, then verify its primary URL before reporting completion. Documentation-only changes do not require a restart.

## Git Workflow

- After completing and verifying a scoped change, create a focused Git commit without waiting for an explicit commit request.
- Stage only files that belong to the completed change. Never include unrelated user changes in the commit.

## Communication

- Avoid vague wording such as "可能" when evidence is sufficient.
- State a clear conclusion when verified. When evidence is insufficient, state exactly what is unknown and how to verify it.

## Java Object Models

The authoritative detailed convention is `docs/java-object-model-conventions.md`. Read it before introducing or renaming Java boundary models.

Use names based on ownership and responsibility:

| Type | Owner | Purpose |
| --- | --- | --- |
| `Entity` | `pinova-pojo` | Database table mapping |
| `Request` | `pinova-api` | HTTP request contract |
| `Response` | `pinova-api` | HTTP response contract |
| `Command` | `pinova-service` | Write-use-case input |
| `Query` | `pinova-service` | Read-use-case criteria |
| `Result` | `pinova-service` | Application service output |
| `Event` | Owning business module | An already occurred business fact |
| Value object | Owning business module | Domain concept compared by value |

Required boundaries:

- Controllers convert `Request` to `Command` or `Query`, and `Result` to `Response`.
- Services must not depend on `pinova-api`, accept `Request`, or return `Response`.
- Mappers must not accept API or service boundary models. They operate on entities and explicit persistence query parameters.
- Controllers must not return entities or MyBatis-Plus `Page` objects.
- Response models must not expose passwords, password hashes, tokens, logical-delete fields, optimistic-lock versions, or internal audit fields unless the API contract explicitly requires them.
- Collections in `Response` and `Result` models return empty collections, never `null`.
- API `Result` to `Response` conversions use a business-specific `*ResponseAssembler` in `pinova-api` so controllers remain focused on HTTP orchestration.
- Service `Entity` to `Result` conversions use a business-specific `*ResultAssembler` in `pinova-service` so service implementations remain focused on use-case orchestration.
- Assembler methods use explicit target names such as `toSummaryResponse` and `toTreeResponse`; do not overload a generic `toResponse` name for different response shapes.
- Assemblers are pure transformations and must not query Mapper, repositories, remote services, or other infrastructure.
- Do not add a mapping framework for trivial field copies.

Naming restrictions:

- Do not establish generic `BO` or `VO` layers.
- HTTP output uses `Response`, not `VO`.
- Domain value objects use business names such as `Money` or `Address`, not a `VO` suffix.
- Do not use `DTO` as a default application layer. Reserve `DTO` for versioned RPC contracts, external-system adapters, or generic import/export formats when no more precise name applies.
- Do not mechanically create identical `PO/BO/DTO/VO` copies for every layer.
- Do not replace explicit models with `Map<String, Object>`.

Preferred package locations:

```text
pinova-api/src/main/java/com/pinova/api/{controller,request,response,assembler}
pinova-service/src/main/java/com/pinova/service/{command,query,model,assembler,impl}
pinova-pojo/src/main/java/com/pinova/pojo/entity
```

Add business-domain subpackages when a package becomes crowded, for example `response.product` or `command.order`.

## API Responses

- Successful HTTP responses use `ApiResponse<T>` with an API `Response` model as data.
- Error responses use RFC 9457 `ProblemDetail` through the global exception handler.
- Business failures use a stable `ErrorCode` and `BusinessException`; do not assemble ad hoc error maps in controllers.
- HTTP status codes must match error semantics. Do not return HTTP 200 for every result.
