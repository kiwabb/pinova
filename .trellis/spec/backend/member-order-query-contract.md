# Member Order Query Contract

## Scenario: Authenticated members read their order history

### 1. Scope / Trigger

- Trigger: changing `GET /orders`, member order pagination, status filtering, order-item snapshot responses or the storefront order-history page.
- This is a member boundary. Administrator sessions and member sessions are not interchangeable.

### 2. Signatures

```http
GET /orders?status=0&page=1&pageSize=10
Cookie: PINOVA_MEMBER_SESSION=<opaque token>
```

```text
listOrders(memberId, MemberOrderListQuery(status, page, pageSize))
  -> MemberOrderPageResult
```

Response data:

```json
{
  "items": [{
    "orderNo": "PO202607190001",
    "status": "PENDING_PAYMENT",
    "fulfillmentType": 1,
    "currencyCode": "CNY",
    "payableAmountFen": 5990,
    "paidAmountFen": 0,
    "submittedAt": "2026-07-19T04:00:00Z",
    "items": [{
      "productName": "48 色基础拼豆套装",
      "skuSpec": "48 色 / 基础版",
      "imageUrl": "http://127.0.0.1:19000/pinova-public/products/starter.webp",
      "unitPriceFen": 5990,
      "quantity": 1,
      "payableAmountFen": 5990
    }]
  }],
  "page": 1,
  "pageSize": 10,
  "total": 1
}
```

### 3. Contracts

- Resolve `memberId` only from `PINOVA_MEMBER_SESSION`; never accept it as a request parameter.
- Every order query includes `trade_order.member_id = authenticated memberId` before optional status filtering.
- Status filter codes are `0..5`; response status names are the matching `TradeOrderStatus` enum names, including `REFUNDED`.
- Page starts at `1`; page size is `1..50`.
- Read order items from `trade_order_item` snapshots in one batch for the current order page. Do not issue one item query per order.
- Product name, SKU specification, image key, unit price, quantity and payable amount come from immutable snapshots. Current product or SKU data must not overwrite them.
- Resolve snapshot image keys through `PublicMediaUrlResolver`; blank keys remain `null`.
- Customer responses do not expose database order IDs, member IDs, cart IDs or address snapshots.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Missing or invalid member session | HTTP 401, `MEMBER_AUTH.AUTHENTICATION_REQUIRED` |
| `status` outside `0..5` | HTTP 400, `COMMON.INVALID_REQUEST` |
| Page below `1` or page size outside `1..50` | HTTP 400, `COMMON.INVALID_REQUEST` |
| No matching orders | HTTP 200 with `items = []` and `total = 0` |
| Order belongs to another member | It is absent from the result, never 403/404 leaked by the list |
| Snapshot image key is blank | `imageUrl = null` |

### 5. Good / Base / Bad Cases

- Good: a member with two orders receives only those orders, newest first, with their immutable item snapshots.
- Base: a valid status filter with no match returns an empty page.
- Bad: passing another member ID through query or body changes the result; member IDs are not accepted from HTTP.
- Bad: the service loads current product prices and rewrites the historical order amount.

### 6. Tests Required

- Service assembler unit: numeric status maps to the enum name and item snapshot fields survive unchanged.
- API assembler unit: image keys resolve to encoded public URLs and pagination totals survive.
- Query integration: records for a second member never appear and item loading remains batched per page.
- API/browser: unauthenticated reads return 401 and the storefront offers a login recovery route.

### 7. Wrong vs Correct

#### Wrong

```text
GET /orders?memberId=123
select all orders, then filter memberId in Java
load current SKU price for display
```

#### Correct

```text
memberId = currentMemberResolver.requireCurrentMemberId(request)
WHERE member_id = :memberId AND (:status IS NULL OR status = :status)
render trade_order_item snapshot fields
```
