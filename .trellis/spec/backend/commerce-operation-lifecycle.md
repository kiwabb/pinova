# Commerce Operation Lifecycle Contract

## Scenario: Operate paid orders through fulfillment, refund and administration

### 1. Scope / Trigger

- Trigger: changing cancellation, shipment, completion, after-sale/refund, product/SKU/media, warehouse/inventory, member/category administration or admin audit.
- Source migration: `pinova-cloud/database/init/026-create-commerce-operation-lifecycle.sql`.
- Physical products only. After-sale means full refund of one child `trade_order`; returns, exchanges and partial refunds are outside this contract.

### 2. Signatures

```http
POST /orders/checkout/{checkoutNo}/cancel
POST /orders/{orderNo}/confirm-receipt             Idempotency-Key: <key>
GET  /after-sales
POST /after-sales/orders/{orderNo}                 Idempotency-Key: <key>

POST /admin/orders/{orderNo}/shipment              Idempotency-Key: <key>
PUT  /admin/orders/{orderNo}/shipment              Idempotency-Key: <key>
POST /admin/orders/{orderNo}/complete              Idempotency-Key: <key>
GET|POST /admin/after-sales/**
GET|POST|PUT|DELETE /admin/products/**
GET|POST|PUT /admin/inventory/**
GET|PUT|POST /admin/members/**
GET|POST|PUT|DELETE /admin/categories/**
GET /admin/audits
```

```text
trade_order status: 0 PENDING_PAYMENT, 1 PENDING_FULFILLMENT,
                    2 FULFILLING, 3 COMPLETED, 4 CLOSED, 5 REFUNDED

trade_order_fulfillment_log(order_id, request_key, action, before/after, operator)
order_after_sale(after_sale_no, order_id, member_id, request_key, amount, status, version)
refund_order(refund_no, after_sale_id, payment_order_id, amount, status, attempt_count, version)
admin_operation_audit(operator_id, domain_code, action_code, target, reason, snapshots)
```

### 3. Contracts

- Pending-payment cancellation operates on all positive pending orders in one checkout. It acquires the checkout advisory transaction lock before order/payment/reservation/stock rows, closes the provider payment and releases reservations atomically.
- Shipment requires carrier code, carrier name and tracking number. Shipment sets `FULFILLING`, `shipped_at`, and `auto_complete_at = shipped_at + 7 days`.
- Completion accepts member confirmation, scheduler auto-completion and SUPER_ADMIN forced completion. Active after-sale freezes shipment, shipment correction and every completion source.
- After-sale is allowed for paid pending-fulfillment, fulfilling, or completed orders through `after_sale_deadline_at`. Amount is server-owned and must equal both paid amount and payment-link snapshot.
- Refund retry and reconciliation lock after-sale, refund and payment records before provider calls. Successful refund atomically sets after-sale completed and order `REFUNDED`.
- Every `/admin/**` write requires the dedicated admin session, admin CSRF token and `SUPER_ADMIN` role at the service boundary.
- Product administration supports SPU/SKU create, edit, state changes and soft delete; published products must first be taken off shelf before SPU/SKU deletion. Publish requires a main image and an enabled SKU.
- Inventory supports `DELTA` and `COUNT`. Lock the stock row before calculating target; reject `target < reserved` or `target < 0`; write an immutable ledger with unique `transactionNo`.
- Member mobile/email are masked in admin HTTP responses. Disabling a member revokes all active sessions.
- Category moves lock the category tree and reject cycles or excessive depth. Only empty leaf categories may be soft-deleted.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Non-SUPER_ADMIN performs admin write | HTTP 403 stable admin authorization error |
| Cancel races with payment success | Checkout lock serializes them; loser sees state conflict |
| Shipment lacks carrier/tracking | HTTP 400 Bean Validation error |
| Fulfillment action while after-sale active | HTTP 409; order state unchanged |
| Refund after completed-order deadline | HTTP 409 window-expired error |
| Duplicate active after-sale | Idempotent replay for same key; otherwise active-sale conflict/unique-index rejection |
| Refund provider amount/currency mismatch | Roll back and return state conflict; never set order refunded |
| Inventory target below reserved | HTTP 400/409; stock and ledger unchanged |
| Delete category with children/products | Conflict; category remains active |
| Publish without main image/enabled SKU | Invalid request; SPU remains unpublished |

### 5. Good / Base / Bad Cases

- Good: admin ships a paid order, member confirms receipt, and the order completes with a 7-day after-sale deadline.
- Good: member applies once, admin approves, mock provider succeeds, and exactly one refund row exists while the child order becomes `REFUNDED`.
- Base: provider returns failed; after-sale remains frozen in `FAILED`, admin retry uses the same refund business number and later completes.
- Bad: auto-completion and member confirmation both update the same fulfilling order; one wins and the other becomes an idempotent/state-conflict result, never two completion facts.
- Bad: a stocktaking correction overwrites an active reservation or creates a second ledger for the same `transactionNo`.

### 6. Tests Required

- Apply migration `026` to PostgreSQL with `ON_ERROR_STOP=1`; assert four new tables and lifecycle columns/constraints.
- Unit: SUPER_ADMIN acceptance and non-role rejection; member masking; request-body validation.
- Integration: cancel versus pay/timeout; fulfillment versus active after-sale; duplicate refund/retry/reconcile; inventory reserved invariant; category cycle/depth/delete; product publish/delete.
- API: member can cancel, confirm receipt, apply/list refund; admin can ship, force-complete, review/retry/reconcile and operate catalog/inventory.
- Frontend: both production builds and lint pass; refunded status and logistics fields render without exposing database IDs or raw member PII.

### 7. Wrong vs Correct

#### Wrong

```text
Check SUPER_ADMIN only by hiding frontend buttons.
Call refund provider without locking refund/payment state.
Let frontend submit refund amount or final stock availability.
Advance fulfillment after checking after-sale outside the order transaction.
```

#### Correct

```text
Enforce SUPER_ADMIN inside every write service.
Lock after-sale -> refund -> payment, validate provider result, then lock/update order.
Derive refund amount from payment snapshot and stock target under stock FOR UPDATE.
Lock order first, check active after-sale, update with expected status + version.
```
