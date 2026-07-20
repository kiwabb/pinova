# Member Orders Contract

## Scenario: Storefront members view order history

### 1. Scope / Trigger

- Trigger: changing `/account/orders`, the account order entry, checkout success actions, the Next.js order proxy or member-order presentation.
- Read `pinova-web/design-system/pinova-mall/pages/orders.md` before changing the page layout.

### 2. Signatures

```text
Route: /account/orders
Proxy: GET /api/orders?page=<n>&pageSize=10&status=<optional 0..5>
Mutations: POST /api/orders/checkout/{checkoutNo}/cancel
           POST /api/orders/{orderNo}/confirm-receipt
           GET|POST /api/after-sales/**
Client: listMemberOrders({ filter, page, pageSize }, signal)
```

Stable frontend status union:

```ts
type MemberOrderStatus =
  | "PENDING_PAYMENT"
  | "PENDING_FULFILLMENT"
  | "FULFILLING"
  | "COMPLETED"
  | "CLOSED"
  | "REFUNDED";
```

### 3. Contracts

- The signed-in account panel and successful checkout both link to `/account/orders`.
- The Next.js `/api/orders` route supports both GET and POST. The shared proxy sends no body or `Content-Type` on GET/HEAD and preserves cookies.
- Parse the Java response through the JSON-bigint boundary and map DTOs into feature-local domain types before rendering.
- Runtime status validation accepts only own keys from the closed status map.
- Filter mapping is `ALL -> omitted`, pending payment `-> 0`, pending fulfillment `-> 1`, fulfilling `-> 2`, completed `-> 3`, closed `-> 4`.
- Render status with text plus a small color marker. Color is supplementary, not the only meaning.
- Pending-payment cards expose cancel and pay; fulfilling cards expose confirm receipt; eligible paid cards expose full-refund application unless an active after-sale freezes fulfillment.
- Render carrier/tracking and auto-completion time from order response fields; never infer shipment from status alone.
- Load member after-sales with the order page and show their status. An active after-sale hides fulfillment actions for the same `orderNo`.
- Render order and item amounts from response snapshots. Do not calculate a replacement order total or fetch current product facts.
- Abort superseded list requests. Loading, unauthenticated, initial error, empty and filtered-empty states all have explicit UI.

### 4. Validation & Error Matrix

| Condition | Frontend behavior |
| --- | --- |
| HTTP 401 | Show login-required state linking to `/account?mode=login` |
| HTTP 404 | Show `订单服务当前不可用，请稍后重试` with retry |
| Other upstream error | Show translated recoverable error, never framework text |
| Unknown status name | Treat response as invalid and show a recoverable load failure |
| Empty all-orders page | Offer a real link back to the storefront |
| Empty filtered page | Offer to reset the filter to all orders |
| Multiple pages | Provide previous/next controls with disabled boundary states |

### 5. Good / Base / Bad Cases

- Good: order cards show status, submission time, order number, item snapshot, quantity and amount without horizontal overflow.
- Base: an authenticated member with no orders sees the empty state and storefront action.
- Bad: an unauthenticated page silently looks empty instead of asking the user to log in.
- Bad: a visible payment, refund, logistics or review action has no working API.

### 6. Tests Required

- Account E2E: signed-in account exposes `/account/orders`.
- Order list E2E: snapshot name, status, order number and amount render from the response.
- Filter E2E: selecting a status sends the correct numeric status and renders filtered-empty state.
- Authentication E2E: 401 renders the login recovery link.
- Checkout E2E: successful submission links to `/account/orders`.
- Responsive E2E/manual: no horizontal overflow at 375px and 1440px; all seven status filters remain reachable.

### 7. Wrong vs Correct

#### Wrong

```ts
const orders = JSON.parse(localStorage.getItem("orders") ?? "[]");
const total = currentProducts.reduce((sum, product) => sum + product.price, 0);
```

#### Correct

```ts
const page = await listMemberOrders({ filter, page: 1, pageSize: 10 }, signal);
// Render page.items[].items snapshot fields and page.items[].payableAmountFen.
```
