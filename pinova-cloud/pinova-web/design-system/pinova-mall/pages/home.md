# Home page overrides

Read `../MASTER.md` first. This file only records home-specific rules.

## Section order (required)

1. Header (global)
2. Merch hero (featured product)
3. Category shortcuts
4. Product floors (by fulfillment type, real products only)
5. Store strip (single short band)
6. Footer (global)

## Section rules

### Merch hero
- Ink band (`--catalog-ink` surface, on-ink text, marigold price, accent CTA)
- Prefer product main image; fallback to atelier hero asset only if no featured product
- Must show price when `priceFen` is non-null
- Primary CTA → product detail; secondary → starter kits category

### Category shortcuts
- One row of all root categories + link to `/category/all`
- No bead-field matrix
- Caption optional one line under strip title “按分类逛”

### Product floors
- Titles use plain commerce Chinese (e.g. 实物材料 / 数字图纸 / 到店体验)
- Floor header: 18px title + mono count chip; section h2 carries the accent bar marker
- Dense grid of the shared raised product cards; digital products still use image + price card (no split editorial layout)
- Floor “查看更多” only if a real category or filtered route exists

### Store strip
- Ink band mirroring the hero (on-ink text, marigold eyebrow, accent CTA)
- One image + short copy + link to store-experience category
- Max ~2 sentences; no multi-step creation path story

## Copy tone

Shop language: 买、逛、加购、到店. Avoid brand-poetry as section headlines.
