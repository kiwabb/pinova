# Checkout Order Contract

## 1. Scope / Trigger

Use this contract when changing the cart checkout entry, `/checkout`, the
Next.js `/api/orders` proxy, or the future Java order endpoint. One checkout
may contain products from multiple shops, so submission and success handling
must support multiple orders without inventing client-side transaction facts.

## 2. Signatures

```http
POST /api/orders
Content-Type: application/json
Idempotency-Key: <UUID generated once per checkout session>
```

```ts
submitOrder(input: SubmitOrderInput, idempotencyKey: string): Promise<SubmittedCheckout>
```

## 3. Contracts

Request IDs are strings. Versions and quantities are integers. Prices, shop
grouping, shipping fees, discounts, inventory results, and payment state are
not submitted as authoritative client values.

```json
{
  "cartId": "980000000000000001",
  "shippingAddressId": "970000000000000001",
  "shippingAddressVersion": 3,
  "items": [
    {
      "cartItemId": "990000000000000001",
      "cartItemVersion": 1,
      "skuId": "920000000000000001",
      "quantity": 1
    }
  ],
  "buyerRemark": "周末收货"
}
```

Success uses one checkout aggregate and one or more shop orders:

```json
{
  "code": "SUCCESS",
  "message": "success",
  "data": {
    "checkoutNo": "550e8400-e29b-41d4-a716-446655440000",
    "orders": [
      {
        "id": "930000000000000001",
        "orderNo": "PO202607180001",
        "status": "PENDING_PAYMENT"
      }
    ]
  }
}
```

`PINOVA_API_BASE_URL` selects the Java upstream for the Next.js proxy. It is
optional in local development and currently defaults to `http://127.0.0.1:8080`.

## 4. Validation & Error Matrix

| Condition | Frontend behavior |
| --- | --- |
| Not logged in | Show login action; do not submit |
| No selected items | Return to cart; do not submit |
| Any selected item has `priceFen=null` | Block submission and return to cart |
| No selected address | Disable submit and offer address management |
| `401` | Tell the user to log in again |
| `404` | Show `订单服务当前不可用，请稍后重试` |
| `409` | Tell the user the cart or address changed and must be refreshed |
| Proxy connection failure (`502`) | Show a recoverable submission failure |
| Success without `checkoutNo` or non-empty `orders[]` | Treat as submission failure |

The same `Idempotency-Key` is reused when retrying the same checkout session.
The submit control stays disabled while the request is pending.

## 5. Good / Base / Bad Cases

- Good: selected real-price items and a versioned address produce a versioned
  request; a multi-shop response renders every returned order number.
- Base: one shop still returns `orders` with one entry.
- Bad: missing prices, stale versions, an empty `orders` result, or an
  unavailable order service never renders success or a fabricated order ID.

## 6. Tests Required

- Cart E2E: checkout entry exists only when selected items all have prices.
- Checkout E2E: assert exact request body and a non-empty idempotency header.
- Failure E2E: `404` is announced with `role="alert"` inside the order summary.
- Success E2E: a two-order response renders both order numbers.
- Big-ID assertion: an unquoted Java `Long` response ID is preserved as a
  string by the JSON bigint boundary.
- Responsive E2E/manual check: no horizontal overflow at 375px and 1440px.

## 7. Wrong vs Correct

Wrong: submit client totals and assume one order per checkout.

```ts
await submitOrder({ totalFen, orderNo: "LOCAL-1" });
```

Correct: submit source IDs plus versions and accept a checkout aggregate.

```ts
await submitOrder(
  { cartId, shippingAddressId, shippingAddressVersion, items, buyerRemark },
  idempotencyKey,
);
// => { checkoutNo, orders: [...] }
```
