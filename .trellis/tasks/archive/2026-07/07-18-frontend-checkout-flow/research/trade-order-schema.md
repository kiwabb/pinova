# Trade order schema research

## Existing repository contracts

- `shopping_cart` may contain multiple shops and requires checkout to split by `shop_id`.
- Cart prices and inventory are not authoritative; checkout must revalidate SKU state, current price and inventory before creating an order.
- `inventory_reservation` already stores logical `order_id` and `order_item_id`, so the new transaction tables must use application-generated bigint IDs.
- `member_shipping_address` is mutable and explicitly requires an order address snapshot.
- Product, member and cart IDs are cross-domain logical references. Transaction-owned child tables may use database foreign keys to the order aggregate.
- Monetary values use bigint RMB fen; mutable aggregate roots use optimistic locking; order facts are retained rather than soft-deleted.

## Chosen aggregate

1. `trade_order`: one member, one shop and one fulfillment type; owns lifecycle, totals, idempotency and milestone timestamps.
2. `trade_order_item`: immutable product, SKU, price and quantity snapshot for each purchased cart item.
3. `trade_order_shipping_address`: one-to-one shipping snapshot, separated from the main table so future digital and service fulfillment do not create a wide nullable order row.

## Invariants

- `(checkout_no, shop_id, fulfillment_type)` is unique so retrying one checkout cannot duplicate a shop fulfillment order.
- Every split order stores the same SHA-256 `request_hash` of the canonical submission payload, so the service can distinguish a true retry from reuse of the idempotency key with different input.
- `source_cart_item_id` is globally unique when present so a cart line cannot be converted twice.
- `goods_amount_fen - discount_amount_fen + shipping_amount_fen = payable_amount_fen`.
- `unit_price_fen * quantity = line_amount_fen` and `line_amount_fen - discount_amount_fen = payable_amount_fen`.
- Lifecycle timestamps must match the current order status; status `4` means an unpaid order is closed and requires a stable close reason code.
- The Service transition whitelist is `0 → 1`, `0 → 4`, `1 → 2`, `2 → 3`; database snapshot checks do not replace transition validation.
- Address snapshot source ID/version are audit references only and never foreign-keyed to the mutable address row.

## API boundary

- The checkout draft already sends a UUID in the `Idempotency-Key` header. The order service should normalize and persist that value as `checkout_no`.
- The current draft response contains one `orderNo`, but a checkout can split into multiple shop orders. Before the API is implemented, the response contract must converge to `checkoutNo` plus an `orders` array.

## Deferred concerns

- Payment transactions, refunds, after-sale cases, invoice data, promotions and shipment tracking require separate aggregates.
- Status history should become an immutable table when the order service implements state transitions.
- Virtual delivery and service reservations require their own fulfillment snapshot tables before those product types can enter checkout.
