# Member orders page overrides

Read `../MASTER.md` first.

- `/account/orders` is the canonical customer order-history route and is linked from the signed-in account panel and checkout success state.
- Order data comes from the authenticated member query only. Render immutable order-item snapshots; do not replace names, specifications, images or prices with current product data.
- Keep status filtering as a compact segmented control. Status is communicated by text plus a small semantic color marker, never by color alone.
- Each order is one repeated surface with a light shadow. Separate header, item rows and total through spacing and surface tone instead of outlining every region.
- Show order number, submission time, status, item quantity, unit price, line amount and order amount. Do not add payment, refund, logistics or after-sales actions before those APIs exist.
- Authentication failure, upstream failure, empty results and filtered-empty results each provide a clear recovery path.
- Preserve 44px controls, visible focus, reduced motion and no horizontal overflow at 375px and 1440px.
