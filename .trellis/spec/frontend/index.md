# Frontend Development Guidelines

These rules describe the root Vite/React application in `src/`. They are
source-backed conventions for the current project, not generic React advice.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Current |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Current |
| [Hook Guidelines](./hook-guidelines.md) | React hook and effect conventions | Current |
| [State Management](./state-management.md) | Local persistence and worker state | Current |
| [Quality Guidelines](./quality-guidelines.md) | Tests, accessibility, and verification | Current |
| [Type Safety](./type-safety.md) | TypeScript and domain contracts | Current |
| [Checkout Order Contract](./checkout-order-contract.md) | Checkout request, response, idempotency, and failure behavior | Current |
| [Member Orders Contract](./member-orders-contract.md) | Customer order-history route, states, filters and API mapping | Current |
| [Storefront Payment Contract](./payment-contract.md) | Checkout and order payment entry, dialog states and proxy behavior | Current |
| [Pinova Admin](./pinova-admin.md) | Independent admin application boundaries and scaffold conventions | Current |
| [Commerce Operation Lifecycle](../backend/commerce-operation-lifecycle.md) | Cross-layer cancellation, fulfillment, refund and operations contract | Current |

The root app is a client-only studio: React components own interaction and
rendering, domain modules own serializable project/color types, engine modules
own image conversion/export, and the converter worker keeps expensive image
processing off the UI thread. Use the relevant guide before changing a layer.

All documentation in this directory is written in English.

`pinova-cloud/pinova-admin` is a separate operations application. Read the
Pinova Admin guide before changing its shell, navigation, routes, or tooling.
