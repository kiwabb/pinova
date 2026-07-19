<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pinova Frontend Instructions

These instructions apply to all files under `pinova-web`. The authoritative detailed component standard is [`../docs/frontend-component-conventions.md`](../docs/frontend-component-conventions.md). Read it before adding a page, component, hook, context, store, or frontend feature.

## Architecture

- Use feature-first organization under `src/features/<feature>`.
- Keep `page.tsx` and `layout.tsx` as Server Components unless browser state or event handling is required. Route files fetch data and render a feature entry; they do not contain large business UI blocks.
- Expose each feature through its `index.ts`. Code outside a feature must not import its internal `components`, `hooks`, or `lib` paths.
- Keep code used by only one feature inside that feature. Promote code to shared `src/components`, `src/data`, or `src/lib` only after at least two features have a stable shared requirement.
- Do not create generic dumping-ground files such as `utils.ts`, `helpers.ts`, or `common.tsx`; names must describe a concrete responsibility.

## Components

- One file exports one primary React component. A private recursive node or small local implementation component may remain in the same file.
- Split page sections, navigation, dialogs, drawers, lists, and independently stateful regions into components based on their reason to change.
- Feature entry components should stay under 250 lines and ordinary components under 200 lines. Files over 300 lines must be split unless a code review records a concrete reason not to.
- Components receive the smallest explicit props needed for their responsibility. Use semantic callback names such as `onLoadCategory` and `onUpdateQuantity`.
- Do not add wrapper components that only forward every prop or extract trivial JSX without an independent domain or interaction meaning.
- Presentational components do not fetch remote data. Fetch in Server Components, API clients, or dedicated feature hooks.

## State And Hooks

- Keep state at the lowest owner that covers all consumers.
- Local UI state stays in its component; shared feature state belongs in the feature entry or a dedicated hook.
- Prefer URL state for navigable categories, filters, and detail locations. Do not duplicate server data in Context or a global store.
- Use Context only when a stable dependency has multiple consumers across at least three component levels.
- A custom hook must own a real lifecycle or side effect, such as request deduplication, storage persistence, timers, or subscriptions. Do not wrap a single `useState` for abstraction alone.
- Effects must clean up event listeners, timers, scroll locks, and subscriptions. Derived values must not be copied into state through an Effect.

## Types And Data

- Define explicit `XxxProps` interfaces. Put types shared across a feature in its `types.ts`.
- Keep API response shapes inside API clients and map them to stable frontend domain types before rendering.
- Preserve nullable backend fields as nullable. Do not invent prices, stock, sales, images, or other business data in the UI.
- Represent Java `Long` identifiers as strings in frontend domain models.
- Pure formatting, sorting, and tree operations belong in feature `lib` files and must not depend on React state.

## Styling And Accessibility

- Use CSS Modules or the established design system; do not introduce feature-specific global selectors.
- Reusable components use adjacent style ownership. A tightly composed feature may share a feature-level CSS Module for coordinated responsive behavior.
- Preserve 44px minimum interactive targets, visible focus states, disabled/loading states, and `prefers-reduced-motion` behavior.
- Icon-only controls require an accessible name. Decorative icons use `aria-hidden="true"`.
- Menus, trees, drawers, and dialogs must support keyboard interaction and Escape dismissal. Mobile workflows cannot depend on hover.

## Storefront Visual Language

- The storefront follows the **material mall / e-commerce density** system in `design-system/pinova-mall/MASTER.md` and `../docs/frontend-component-conventions.md`. Optimize for browse → price → cart, not a corporate brand site.
- Before UI generation, also read the matching `design-system/pinova-mall/pages/<page>.md` override when present. External design skills are review aids and must not replace or persist over the repository design system.
- Prefer product imagery, prices, category shortcuts, dense shelves, and clear CTAs. Category accent chips are fine; do not lead the home page with manifesto copy, coordinate rulers, or color-sample matrix walls.
- Home merchandising and category browsing are different domains. The home page groups real products by fulfillment type; category pages use breadcrumb, hierarchy rail or drawer, toolbar, and a dense product grid.
- Product cards may use a light surface and soft shadow. Missing API fields remain visually empty; never invent prices, stock, ratings, sales, imagery, policies, or availability copy.
- Visible links and actions must lead to a real route or working interaction. Do not ship placeholder navigation that only opens a "coming soon" toast.
- Visible sales labels, service promises and policies require a documented API field. Never expose framework errors, raw database IDs or internal presentation labels as customer-facing content.
- Reuse `CommercePageHeader` for product, cart, account and member-management routes. Do not add another page-local brand header.
- Keep page-area styles in adjacent CSS Modules. Do not rebuild a monolithic storefront stylesheet or add end-of-file override layers to repair an earlier visual system.
- Motion is limited to causal state changes and subtle media feedback. Spatial movement and scaling use `transform` and `opacity`; color and border state transitions stay within 140-240ms, complex entrances stay under 360ms, and every motion path provides a `prefers-reduced-motion` fallback.

## Verification

- For component refactors, run `npm run lint`, `npx tsc --noEmit`, and the relevant Playwright tests.
- Layout changes require checks at 375px and 1440px and must not introduce horizontal overflow.
- A component split is not complete when it only compiles; existing user workflows and accessibility behavior must remain covered by tests.
