# Pinova Admin Guidelines

## Application Boundary

`pinova-cloud/pinova-admin` is an independent React, TypeScript, Vite, and Ant
Design application. It does not share pages or runtime state with
`pinova-cloud/pinova-web` or the root studio application.

Keep application composition and route metadata under `src/app`. Put each
business route under `src/features/<feature>` and expose it through the
feature's `index.ts`. Do not add API clients, query state, or business types
until a real backend contract is being integrated.

## Shell And Routes

The application shell owns navigation, breadcrumbs, page titles, and
responsive layout. Route-specific components own only their page content.
Keep route metadata in a pure function so deep paths can select the correct
navigation section and can be unit tested without rendering the UI.

```ts
getRouteMeta("/members/910000000000000001").menuKey === "/members";
```

Desktop navigation uses a persistent sidebar. Below the large breakpoint,
navigation uses an accessible drawer that closes with Escape and restores
focus. Every route must support direct loading and browser refresh.

## Empty States

Scaffold routes show a truthful empty state. They must not include fake KPI
cards, sample members, fabricated category data, or disabled action buttons
that imply an unavailable backend capability.

## Authenticated Server State

Use TanStack Query for administrator session and order data. A 401 session
response redirects to `/login`; a temporary administrator redirects to
`/change-password`. Network and server failures render a recoverable Result or
Alert with a retry command and trace ID when available. Do not throw a session
query error into a missing React error boundary, because that leaves a blank
application.

Order filters live in `URLSearchParams`, including page and page size. A page
with matching records must render the server `total`; never infer totals from
the current `items` array. Detail pages read immutable order snapshots and only
render the masked receiver fields returned by the API.

Tables may use an internal `scroll.x`, but every CSS Grid/Flex ancestor and the
immediate grid item around the table must allow `min-width: 0`. Verify both
`documentElement.scrollWidth <= clientWidth` and the visual layout at 375, 768,
1024 and 1440 pixels.

When the header has only one account command, use a direct icon button with an
accessible name instead of a hover-only Dropdown. Keep the administrator name
as non-interactive identity text.

## Toolchain Compatibility

Pin TypeScript to the latest `5.9.x` release while `typescript-eslint` 8 is in
use. TypeScript 7 causes the parser to fail before linting with an internal
`typescript-estree` error. Upgrade TypeScript only after the configured ESLint
parser declares support, then run lint, tests, and the production build.

## Required Checks

Run `pnpm lint`, `pnpm test`, and `pnpm build`. Verify 375, 768, 1024, and 1440
pixel viewports for horizontal overflow. Browser verification must cover a
direct deep-route refresh, mobile drawer Escape dismissal, focus restoration,
and zero console errors.
