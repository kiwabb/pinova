# Trade Order Contract

## Scenario: Cart checkout creates transaction orders

### 1. Scope / Trigger

- Trigger: creating or changing order tables, checkout submission, order creation APIs, inventory reservation links or checkout success responses.
- Source SQL: `pinova-cloud/database/init/023-create-trade-order.sql`.
- Detailed domain design: `pinova-cloud/database/trade-order.md`.
- First release accepts physical products only and creates one order per `shop_id + fulfillment_type` within a checkout.

### 2. Signatures

Database aggregate:

```text
trade_order(id, order_no, checkout_no, request_hash, member_id, shop_id,
            source_cart_id, fulfillment_type, currency_code,
            goods_amount_fen, discount_amount_fen, shipping_amount_fen,
            payable_amount_fen, paid_amount_fen, buyer_remark,
            status, milestone timestamps, close_reason_code,
            close_reason, version, audit fields)

trade_order_item(id, order_id, source_cart_item_id, spu_id, sku_id,
                 product and SKU snapshots, unit_price_fen, quantity,
                 line_amount_fen, discount_amount_fen,
                 payable_amount_fen, audit fields)

trade_order_shipping_address(id, order_id, source_address_id,
                             source_address_version, receiver and region
                             snapshots, audit fields)
```

HTTP request:

```text
POST /orders
Idempotency-Key: <UUID>
Cookie: PINOVA_MEMBER_SESSION=<opaque token>; PINOVA_CART_TOKEN=<opaque token>
{ cartId, shippingAddressId, shippingAddressVersion,
  items: [{ cartItemId, cartItemVersion, skuId, quantity }],
  buyerRemark }
```

Service boundary and multi-order response:

```text
submitOrder(SubmitOrderCommand) -> SubmittedCheckoutResult
{ checkoutNo, orders: [{ id, orderNo, status }] }
```

### 3. Contracts

- Normalize and persist `Idempotency-Key` as `checkout_no`; hash the canonical request as lowercase SHA-256 `request_hash`. Every split order stores the same hash.
- The same key and hash return the original result. The same key with a different hash returns an idempotency conflict.
- Serialize submissions for one checkout with a PostgreSQL transaction advisory lock before reading existing orders. MyBatis must map the lock query to an integer sentinel, for example `SELECT 1 FROM pg_advisory_xact_lock(...)`; mapping the PostgreSQL `void` result to a Java `void` method fails at runtime.
- Re-read the authenticated member, active cart, selected cart rows, SKU state, current price, inventory and address version on the server.
- Never trust submitted price, shop, product name, SKU snapshot, totals or order number.
- Split selected rows by `shop_id + fulfillment_type`. First release rejects non-physical product types before storage.
- Insert order headers, all item snapshots, physical address snapshots, inventory reservations and inventory ledgers in one transaction.
- Lock every enabled warehouse stock row for a tracked SKU in deterministic order and split the requested quantity across rows. Aggregate availability is authoritative; do not require one warehouse to hold the entire quantity. If the locked rows cannot satisfy the full quantity, roll back every split reservation.
- Positive-payable orders create active reservations and `RESERVE-*` ledgers. Zero-payable orders enter pending fulfillment, deduct on-hand inventory immediately, create closed/deducted reservations and `DEDUCT-*` ledgers; they must not leave expiring active reservations.
- Cross-domain identifiers are logical references. `trade_order_item.order_id` and `trade_order_shipping_address.order_id` are transaction-domain foreign keys.
- No order table uses soft delete. Item and address snapshots are immutable after creation.
- Status `4` means an unpaid order is closed. It retains `payment_expires_at` and requires `closed_at` plus `close_reason_code`; optional `close_reason` is supplementary text.
- Allowed core transitions are `0 → 1`, `0 → 4`, `1 → 2`, `2 → 3`; an approved full refund may move paid status `1`, `2`, or `3` to `5`. Service updates match `id + expected_status + version` and reject every other transition.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Missing or invalid authentication | HTTP 401 |
| Cart/address/item version changed | HTTP 409 with stable business error code |
| Idempotency key reused with different payload | HTTP 409 idempotency conflict |
| Empty selection, SKU mismatch or quantity mismatch | HTTP 409; no order created |
| SKU disabled, price unavailable or product not physical | HTTP 409; no order created |
| Inventory reservation fails | HTTP 409; entire checkout rolls back |
| Aggregate stock is sufficient but split across warehouses | Create one reservation/ledger per allocation; reservation quantities sum to the order item quantity |
| Aggregate stock is insufficient after partial allocation | HTTP 409; all stock updates, reservations and order rows roll back |
| Duplicate `(checkout_no, shop_id, fulfillment_type)` | Return original matching result or conflict; never create another order |
| Amount identity fails | Database check violation and transaction rollback |
| Status milestone fields do not match status | Database check violation and transaction rollback |
| Pending-payment or closed order lacks `payment_expires_at` | Database check violation and transaction rollback |
| Transition is not in the whitelist | HTTP 409; status and milestone fields remain unchanged |
| `source_cart_item_id` already consumed | Conflict; no duplicate order item |

### 5. Good / Base / Bad Cases

- Good: two selected physical rows from one shop create one order, two immutable item rows, one address snapshot and matching reservations.
- Base: selected physical rows from two shops create two orders sharing one `checkout_no`; the response contains both entries in `orders[]`.
- Base: one tracked SKU quantity is supplied by two enabled warehouses; the order item remains one snapshot row and its reservations sum to the requested quantity.
- Good: a zero-price physical SKU creates a pending-fulfillment order and an immediately deducted inventory record without an active expiring reservation.
- Bad: retrying a cart item with a new checkout key is rejected by `uk_trade_order_item_source_cart_item`.
- Bad: `payable_amount_fen` not equal to goods minus discount plus shipping is rejected by `ck_trade_order_payable_amount`.
- Bad: a pending-fulfillment row without `paid_at` is rejected by `ck_trade_order_lifecycle`.
- Bad: directly changing pending payment to completed is rejected by the Service transition whitelist even when all milestone timestamps are supplied.

### 6. Tests Required

- Migration test: apply schema `001` and order migration `023` with `ON_ERROR_STOP=1` in a disposable PostgreSQL database.
- Constraint integration tests: assert valid pending-payment order/item/address rows insert successfully.
- Constraint integration tests: assert duplicate checkout group, invalid amount, invalid lifecycle and duplicate cart item fail with their named constraints.
- Service unit tests: cover every allowed transition and reject `0 → 2`, `0 → 3`, `1 → 3`, transitions out of terminal states and stale versions.
- Service integration test: concurrent identical idempotency requests return the same checkout result and create one aggregate.
- Service integration test: stale cart/address versions and insufficient inventory leave order, reservation and cart state unchanged.
- Service integration test: stock split across two warehouses produces two locked allocations whose quantities sum to the order item quantity; aggregate insufficiency rolls back earlier allocations.
- Service integration test: zero-payable tracked inventory decreases on-hand quantity, creates reservation status `1`, sets `closed_at`, and writes a `DEDUCT-*` type-2 ledger.
- Mapper integration test: the checkout advisory-lock statement returns integer `1` and does not attempt to map PostgreSQL `void` to a Java `void` return type.
- API test: multi-shop checkout returns `checkoutNo + orders[]` and never a fabricated single success order.

### 7. Wrong vs Correct

#### Wrong

```text
Use the frontend total and current member address during order reads.
Return one orderNo even when selected rows belong to multiple shops.
Create the order before reserving stock, then compensate on failure.
Require one warehouse to satisfy a quantity even though storefront stock is aggregated.
Map `SELECT pg_advisory_xact_lock(...)` directly to a Java `void` mapper method.
```

#### Correct

```text
Recompute totals on the server and persist item/address snapshots.
Return checkoutNo plus every split order in orders[].
Create orders, snapshots, reservations, ledgers and cart transition in one transaction.
Lock and allocate all eligible warehouse stock rows in deterministic order.
Return an integer sentinel from the advisory-lock query and ignore it after lock acquisition.
Validate every state change against the transition whitelist and optimistic-lock version.
```
