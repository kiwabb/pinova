# Product detail overrides

Read `../MASTER.md` first.

- Order: breadcrumb → gallery + purchase panel → structured product content → real reviews.
- Gallery, purchase panel and content surfaces use radius ≤ 8px and the shared shadow scale.
- The purchase panel prioritizes product name, review summary when present, price, stock, specification, quantity and add-to-cart.
- A single media item has no pager, arrow or duplicate thumbnail. A single SKU is selected without rendering a choice control.
- Do not repeat the same favorite action in both the title row and purchase action row.
- Do not show raw product IDs, long SKU IDs, `FILE`, `OPTIONS` or inferred recommendation badges.
- Service promises render only from documented product or shop policy fields.
- Cart failures use a user-facing cause and recovery action; never expose a framework route error.
