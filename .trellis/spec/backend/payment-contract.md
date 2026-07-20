# Payment Contract

## Scenario: Checkout-level payment advances orders and inventory

### 1. Scope / Trigger

- Trigger: changing payment tables, payment providers, `POST /payments`, payment result processing, order payment actions, inventory reservation conversion or timeout closing.
- Source SQL: `pinova-cloud/database/init/025-create-payment-order.sql`.
- Detailed schema design: `pinova-cloud/database/payment.md`.

### 2. Signatures

```text
payment_order(payment_no, checkout_no, member_id, provider_code,
              provider_transaction_no, currency_code, amount_fen,
              status, attempt_count, expires_at, result timestamps,
              failure fields, version, audit fields)

payment_order_trade_order(payment_order_id, trade_order_id,
                          order_amount_fen, audit fields)
```

```http
POST /payments
{ "checkoutNo": "550e8400-e29b-41d4-a716-446655440000" }

GET /payments/{paymentNo}
POST /payments/{paymentNo}/refresh
POST /payments/{paymentNo}/mock-result
{ "outcome": "SUCCESS" | "FAILED" }
```

```text
PaymentOrderService.createPayment(CreatePaymentCommand) -> PaymentOrderResult
PaymentOrderService.refreshPayment(memberId, paymentNo) -> PaymentOrderResult
PaymentOrderService.simulatePayment(SimulatePaymentResultCommand) -> PaymentOrderResult
```

### 3. Contracts

- One `checkout_no` has one payment order. Repeated creation returns that payment; a failed payment restarts the same business payment and increments `attempt_count`.
- Payment amount is the server-side sum of positive pending `trade_order.payable_amount_fen` rows in the checkout. Currency must be identical across linked orders.
- Current-member identity comes only from `PINOVA_MEMBER_SESSION`. A payment belonging to another member is returned as not found.
- All checkout mutations acquire the PostgreSQL advisory lock for `checkout_no` before locking payment, order, reservation or stock rows. Checkout creation, payment success and timeout closing must keep this order.
- A provider success is trusted only after transaction number, amount, currency and success time are checked. Browser redirects or frontend state never mark an order paid.
- Success atomically sets the payment to `SUCCEEDED`, all linked positive orders `0 -> 1`, paid amounts/times, reservations `0 -> 1`, stock `on_hand -= quantity` and `reserved -= quantity`, and inserts immutable deduction ledgers.
- A duplicate or out-of-order provider result is idempotent. A confirmed provider success that cannot safely advance business state becomes `REVIEW_REQUIRED` in a separate transaction; the frontend must tell the member not to pay again.
- Timeout closing atomically moves pending orders `0 -> 4`, releases active reservations, writes release ledgers and closes pending/failed payment orders.
- `PINOVA_PAYMENT_MOCK_ENABLED=true` enables `MOCK` only outside the `prod` profile. Production keeps it false and cannot execute mock results.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Invalid checkout UUID | HTTP 400, `PAYMENT.INVALID_CHECKOUT_NO` |
| Checkout/payment absent or belongs to another member | HTTP 404 |
| Checkout contains only zero-amount orders | HTTP 409, `PAYMENT.NOT_REQUIRED` |
| Positive order is not pending payment | HTTP 409, `PAYMENT.ORDER_NOT_PAYABLE` |
| Payment/order amount or currency differs | Roll back and return state conflict or review-required |
| Mock provider disabled or `prod` profile active | HTTP 503, no provider mutation |
| Duplicate success result | Return success; no additional stock or ledger mutation |
| Payment expired before creation | HTTP 409, `PAYMENT.EXPIRED` |
| Provider success arrives after local close | Mark `REVIEW_REQUIRED`; never reopen the order automatically |

### 5. Good / Base / Bad Cases

- Good: one checkout split into two shop orders creates one payment; one provider success advances both orders and all reservations once.
- Base: a provider failure leaves orders pending and a repeated create call restarts the same payment number with a new attempt.
- Bad: a controller accepts an amount from the browser or writes `trade_order.status = 1` directly.
- Bad: timeout closes orders while a success processor holds the payment row first and waits for order rows; advisory checkout locking prevents this reverse lock order.

### 6. Tests Required

- Provider unit: mock create returns pending; simulated success/failure is returned by query; production profile disables it.
- Service integration: multi-order amount and link snapshots equal the payment amount.
- Service integration: success produces exactly one deduction ledger per reservation and keeps `reserved <= on_hand`.
- Service integration: duplicate success leaves order versions, stock balances and ledger counts unchanged.
- Service integration: failure followed by create increments `attempt_count`, keeps one `payment_order`, then succeeds.
- Service integration: timeout closes all pending checkout orders and releases each active reservation once.
- API: another member cannot create, read, refresh or simulate the payment.

### 7. Wrong vs Correct

#### Wrong

```text
Frontend says success -> update order status
Lock payment row -> lock order row
Store provider transaction fields directly on trade_order
Enable mock endpoints by default in production
```

#### Correct

```text
Provider notification/query -> validate -> one transactional result processor
Acquire checkout advisory lock -> lock payment/order/reservation/stock rows
Keep payment_order and payment_order_trade_order as a separate aggregate
Require explicit mock flag and reject it under the prod profile
```
