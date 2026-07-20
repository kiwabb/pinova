# Admin Order Contract

## Scenario: Authorized administrators read masked order snapshots

### 1. Scope / Trigger

- Trigger: changing administrator identity, session handling, RBAC, admin order APIs, order masking or the `pinova-admin` order workflow.
- The administrator boundary is independent from member authentication. Member cookies and member IDs never authorize `/admin/**`.
- The first release is read-only. Order lifecycle writes, payment, refund, logistics, after-sales, exports and full PII access are outside this contract.

### 2. Signatures

Storage:

```text
admin_account, admin_login_session, admin_role, admin_permission,
admin_account_role, admin_role_permission
```

Bootstrap inputs:

```text
PINOVA_ADMIN_BOOTSTRAP_USERNAME=<required>
PINOVA_ADMIN_BOOTSTRAP_PASSWORD=<required temporary secret>
```

HTTP:

```text
GET  /admin/auth/csrf
POST /admin/auth/login
GET  /admin/auth/me
PUT  /admin/auth/password
POST /admin/auth/logout

GET /admin/orders?orderNo&status&submittedFrom&submittedTo&page&pageSize
GET /admin/orders/{orderNo}
```

Order responses use `orderNo`, never a database order ID. Java `Long` identifiers exposed by administrator identity responses serialize as strings.

### 3. Contracts

- Migration `024-create-admin-identity.sql` seeds stable `SUPER_ADMIN` and `ORDER_READ` codes, but no administrator or default password.
- The non-Web bootstrap command creates one temporary super administrator only when `admin_account` is empty. Missing input or an existing account fails without mutation.
- Passwords use BCrypt. Random session tokens are stored only as lowercase SHA-256 hashes.
- Five failed logins lock the account for 15 minutes. Sessions expire after 8 hours absolute or 30 minutes idle.
- A temporary administrator may read identity, change password and log out. `ORDER_READ` is unusable until the password is changed.
- Password change revokes every session. Login, password change and logout require the dedicated `PINOVA_ADMIN_CSRF` cookie and `X-PINOVA-ADMIN-CSRF` header.
- Order list pagination requires MyBatis-Plus `PaginationInnerInterceptor(DbType.POSTGRE_SQL)` plus the `mybatis-plus-jsqlparser` dependency. Returning records with `total = 0` violates the contract.
- Details read `trade_order_item` and `trade_order_shipping_address` snapshots. They never query current product or member-address data.
- `ORDER_READ` returns masked receiver name and mobile plus `detailAddress = "******"`. Raw receiver name, mobile and detail address must not enter the HTTP response body.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Missing or invalid admin session | HTTP 401, `ADMIN_AUTH.UNAUTHORIZED` |
| Missing/invalid CSRF on an admin write request | HTTP 403, `ADMIN_AUTH.CSRF_INVALID` |
| Temporary password still active | HTTP 403, `ADMIN_AUTH.PASSWORD_CHANGE_REQUIRED` |
| Missing `ORDER_READ` | HTTP 403 with stable authorization code |
| Unknown `orderNo` | HTTP 404, `ADMIN_ORDER.ORDER_NOT_FOUND` |
| Invalid status, dates, page or page size | HTTP 400 with stable request error |
| Unexpected server failure | RFC 9457 response with trace ID; no secret or raw PII |
| Matching page has one row | `items.length = 1` and `total = 1` |

### 5. Good / Base / Bad Cases

- Good: an authenticated permanent super administrator filters by order number and status, receives one page row and matching total, then reads masked snapshot detail.
- Base: a valid filter with no matches returns HTTP 200, `items = []` and `total = 0`.
- Bad: a member session calls `/admin/orders` and receives HTTP 401.
- Bad: a temporary administrator logs in successfully but receives HTTP 403 when reading orders.
- Bad: a response contains the original receiver mobile or detailed street address.

### 6. Tests Required

- Migration: apply `024` with `ON_ERROR_STOP=1`; assert stable role/permission rows and no default account.
- Bootstrap: assert empty database success, existing-account failure and missing-input failure without writes.
- Authentication: assert throttling, absolute/idle expiry, first-password gate, session revocation and CSRF behavior.
- Authorization: assert `ORDER_READ` success plus unauthenticated, missing-permission and temporary-password failures.
- Assembler: assert Unicode name masking, mobile masking and constant detail-address masking.
- Pagination integration: insert one valid aggregate, query it, and assert `items.length = total = 1`.
- Browser: cover login, URL filters, list/detail, 404, upstream failure/retry, logout, deep-route refresh, mobile drawer focus restoration and zero console errors.

### 7. Wrong vs Correct

#### Wrong

```text
Reuse the member cookie for admin orders.
Return TradeOrder entities or raw shipping snapshots.
Call selectPage without registering the PostgreSQL pagination interceptor.
Expose a public setup endpoint or seed a default administrator password.
```

#### Correct

```text
Resolve a dedicated admin session and enforce ORDER_READ in the service boundary.
Map Entity -> Result -> masked Response and expose only orderNo routes.
Register PaginationInnerInterceptor(DbType.POSTGRE_SQL) and verify total counts.
Bootstrap once through a non-Web command and force the first password change.
```
