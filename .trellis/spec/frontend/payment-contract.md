# Storefront Payment Contract

## Scenario: Members pay a submitted checkout

### 1. Scope / Trigger

- Trigger: changing checkout success actions, pending-order cards, payment dialogs, `/api/payments` proxies or frontend payment status handling.
- Related backend contract: `../backend/payment-contract.md`.

### 2. Signatures

```ts
type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED"
  | "REVIEW_REQUIRED";

createPayment(checkoutNo: string): Promise<PaymentOrder>;
refreshPayment(paymentNo: string): Promise<PaymentOrder>;
simulatePayment(paymentNo: string, outcome: "SUCCESS" | "FAILED"):
  Promise<PaymentOrder>;
```

```text
POST /api/payments
GET /api/payments/{paymentNo}
POST /api/payments/{paymentNo}/refresh
POST /api/payments/{paymentNo}/mock-result
```

### 3. Contracts

- Checkout success shows `立即支付` only when at least one submitted order is `PENDING_PAYMENT`.
- Every pending order card shows `去支付` using the server-provided `checkoutNo`. Repeated cards from one checkout resolve to the same payment order.
- `PaymentDialog` owns payment loading, retry, refresh, simulated result and terminal-state feedback. Checkout and member orders reuse it through `@/features/payments`.
- The UI renders server `amountFen`, `orderCount`, status and expiry. It never sends an amount or infers payment success from a click.
- `SUCCEEDED` refreshes the order list and removes pending payment actions. `FAILED` offers a server-side restart. `CLOSED` returns the member to orders. `REVIEW_REQUIRED` tells the member not to pay again.
- Mock result controls render only when `mockMode` is true. They are development controls, not a production payment option.
- Payment dialogs use an accessible modal, Escape dismissal, initial close focus, body scroll lock, 44px controls, existing storefront tokens and no visible region outlines.
- API proxy routes validate `paymentNo`, preserve member cookies, use no-store responses and translate upstream connection errors.

### 4. Validation & Error Matrix

| Condition | Frontend behavior |
| --- | --- |
| HTTP 401 | Tell the member to log in again |
| HTTP 404 | Tell the member to refresh the order |
| HTTP 409 | Show the server detail and keep a recovery action |
| HTTP 503 | State that local mock payment is not enabled |
| Unknown payment status | Treat response as invalid; do not show success |
| `REVIEW_REQUIRED` | Show manual-confirmation state; no retry payment control |
| Payment request in progress | Disable result buttons and show progress feedback |

### 5. Good / Base / Bad Cases

- Good: checkout success opens one dialog showing aggregate amount/order count; simulated success updates the checkout and member-order state.
- Base: a failed result shows its message and restarts the same payment through `createPayment`.
- Bad: each split order displays a separately calculated checkout total or generates a client payment number.
- Bad: the UI changes an order to paid immediately after pressing the success button.

### 6. Tests Required

- Checkout E2E: pending checkout renders `立即支付`; zero-payable checkout does not.
- Orders E2E: only pending cards render `去支付`; success removes it after the list refresh.
- Payment E2E: exact request paths and bodies for create, refresh, success and failure.
- Failure E2E: failure -> retry -> success keeps the same payment number and ends in `SUCCEEDED`.
- Responsive: modal and order page have no horizontal overflow at 375px and 1440px; every button is at least 44px high.
- Accessibility: dialog has an accessible name, Escape closes it and focus enters the dialog.

### 7. Wrong vs Correct

#### Wrong

```ts
setOrder({ ...order, status: "PENDING_FULFILLMENT" });
await fetch("/api/payments", { body: JSON.stringify({ checkoutNo, amountFen }) });
```

#### Correct

```ts
const payment = await createPayment(order.checkoutNo);
const confirmed = await simulatePayment(payment.paymentNo, "SUCCESS");
// Render confirmed.status and reload the server-backed order list.
```
