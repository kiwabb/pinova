# PINOVA Mall Design System (MASTER)

Source of truth for storefront visual and IA decisions.
Method: UI UX Pro Max · Product type **E-commerce (General)** · Style **Vibrant & Block-based + Flat Design**.

## Retrieval order (mandatory)

Before changing a storefront page, read in this order:

1. `pinova-web/AGENTS.md`
2. `docs/frontend-component-conventions.md`
3. This `MASTER.md`
4. `pages/<page-name>.md`, when it exists
5. Existing components and neighboring CSS Modules

External UI skills and generators are advisory checklists only. They may supplement accessibility,
responsive behavior and interaction-state review, but they must not replace this design system,
persist a new palette, change the stack, or override an existing page rule.

## Dials

| Dial | Value | Meaning |
| --- | --- | --- |
| variance | 4 | Regular shelf grids, not art-direction asymmetry |
| motion | 3 | Micro-interactions only (150–240ms) |
| density | 8 | Tight commerce spacing (8–24px gaps, dense product grids) |

## Brand tokens (map existing CSS variables)

| Role | Token / value |
| --- | --- |
| Price / primary CTA | `--catalog-accent` `#c72c59` |
| Success / in-stock | `--catalog-emerald` `#0c715f` |
| Ink | `--catalog-ink` `#111311` |
| Muted | `--catalog-muted` `#626761` |
| Paper / page bg | `--catalog-paper` `#f4f6f3` |
| Product surface | `#ffffff` |
| Rule | `--catalog-rule` |
| Control radius | `--catalog-radius-control` `6px` |
| Surface radius | `--catalog-radius-surface` `8px` |
| Repeated-item shadow | `--catalog-shadow-card` |
| Sticky-shell shadow | `--catalog-shadow-subtle` |

Category accent colors remain for shortcut icon chips only, not as full-page language.

## Typography

- UI / Chinese: system sans (`--font-system`)
- Price / SKU / counts: tabular + mono (`--font-mono`)
- Body ≥ 14px; product titles 14–16px; prices 16–20px bold brand color
- Do not use editorial display H1 larger than product merchandising blocks on home

## Layout

- Content max: `1344px`
- Home product grid: 2 col mobile → 3 tablet → 4–5 desktop
- Section vertical padding: ~24–40px (not 80–120px gallery gaps)
- Cards: light surface, optional soft shadow `0 4px 16px rgb(17 19 17 / 6%)`, radius ≤ 8px
- Prefer spacing, surface tone and one shadow tier over visible borders. Do not create a line around every region.
- Text commands use 6px controls. Fully pill-shaped text buttons are not part of the storefront language.
- Decorative radial/linear gradients and backdrop blur are prohibited. Product imagery carries the visual signal.

## Components

### Product card
Image-led, title 2 lines max, price always prominent when non-null, add-to-cart visible (not hover-only). Empty price/stock remain empty.

### Category shortcut
Icon chip + label + real category href. Horizontal strip, scroll on mobile.

### Merch hero
Featured product photo + name + price + primary CTA. No manifesto copy as the main message.

### Floor header
Title + optional count + “查看更多” link on one row.

### Shared page shell

- Storefront browse routes use `StorefrontHeader` because they own search, categories and the cart drawer.
- Product, cart, account and member-management routes use `CommercePageHeader`.
- Do not implement another page-local brand header. Extend the shared header with a typed variant when a real need appears.
- Every shared header reads its badge count from the same shopping-cart API as the cart page. While the cart state is unknown or failed, omit the count; never present an unknown cart as zero.
- Navigation labels must not imply popularity or sales ranking without a documented field; use neutral destinations such as “商品”.

### Member account and reviews

- Do not expose a member number unless a working customer workflow requires users to read or enter it.
- A review shows purchase identity at most once. Do not repeat the same “已购” status in both the reviewer label and metadata.

## Anti-patterns

- Corporate manifesto hero, coordinate rulers, FIELD labels as primary UI
- Color-sample matrix walls without product anchors
- Long editorial prose blocks on home
- AI purple gradients, glassmorphism slabs
- Fake sales, ratings, inventory, policies
- Emoji as icons; hover-only purchase actions
- Empty links / “coming soon” toasts
- Static claims such as “热卖”, “大家都在买”, “正品保证”, “快速发货” or “售后保障” without an API field
- Internal presentation labels such as `FILE /`, `OPTIONS`, raw database IDs or long SKU IDs as primary content
- A checkout or payment CTA before a real order API and recoverable submission flow exist

## Business truth gate

- Every visible price, stock state, rating, sales label, policy and fulfillment promise must map to a documented API field.
- When a backend capability is absent, omit the action. Do not add disabled placeholders or development-status copy.
- Backend errors are translated into user-facing recovery messages; framework and route errors are never displayed raw.
- Address forms preserve administrative region names and stable codes. Do not derive fake codes from display names.
- Never synthesize SKU names from array positions or database IDs. Hide a selector when there is only one SKU; for incomplete multi-SKU data, fall back to factual price and availability until `specSummary` is supplied.

## Accessibility & motion

- Touch targets ≥ 44×44px
- Contrast ≥ 4.5:1 for body text
- Focus visible; Escape closes menus/drawers
- Animate only `transform` / `opacity`; honor `prefers-reduced-motion`

## Delivery gate

- Check `375×812`, `768×1024`, `1024×768`, `812×375` and `1440×1000` for layout work.
- Verify no horizontal overflow, no text overlap and no content hidden under sticky UI.
- All interactive targets are at least `44×44px`; icon-only controls have accessible names.
- Run `npm run lint` and `npx tsc --noEmit`; run the relevant Playwright flow for behavior or layout changes.
- Scan changed CSS for raw brand colors, radii above 8px, decorative gradients and page-local header implementations.

## Stack

Next.js App Router + CSS Modules. Do not introduce Tailwind/shadcn solely for this redesign.
