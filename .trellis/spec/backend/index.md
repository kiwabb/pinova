# Backend Development Guidelines

These rules cover the Pinova Java backend and PostgreSQL schema under `pinova-cloud/`.

## Guidelines Index

| Guide | Description | Status |
| --- | --- | --- |
| [Trade Order Contract](./trade-order-contract.md) | Checkout, order storage, idempotency and snapshot boundaries | Current |
| [Admin Order Contract](./admin-order-contract.md) | Independent admin identity, RBAC and read-only masked order queries | Current |
| [Member Order Query Contract](./member-order-query-contract.md) | Authenticated member order history and immutable item snapshots | Current |
| [Payment Contract](./payment-contract.md) | Checkout payment aggregation, provider results, inventory conversion and timeout closing | Current |
| [Request Validation Contract](./request-validation-contract.md) | Required JSON bodies, Bean Validation, nested requests and error ownership | Current |
| [Commerce Operation Lifecycle](./commerce-operation-lifecycle.md) | Cancellation, fulfillment, refund, catalog, inventory and admin-write contracts | Current |

## Pre-Development Checklist

- Read `pinova-cloud/AGENTS.md`.
- Read `pinova-cloud/database/schema-conventions.md`.
- For controller request-body work, read `request-validation-contract.md`.
- For checkout or order work, read `trade-order-contract.md` and `pinova-cloud/database/trade-order.md`.
- For payment, paid-order, reservation conversion or timeout work, read `payment-contract.md` and `pinova-cloud/database/payment.md`.
- For customer order-history work, also read `member-order-query-contract.md`.
- For admin identity or admin order queries, read `admin-order-contract.md` and `pinova-cloud/database/admin-identity.md`.
- Trace cart, member address, inventory reservation and order data across storage, service, API and UI before changing a contract.

## Quality Check

- SQL migrations execute with `ON_ERROR_STOP=1` in a disposable database or a rollback-safe transaction.
- Valid aggregate rows are accepted and every documented invalid case is rejected by the named constraint or service error.
- Cross-domain IDs remain logical references; transaction-owned children use foreign keys.
- API idempotency and multi-order response shapes remain consistent with the database contract.
