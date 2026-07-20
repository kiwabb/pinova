# Order Management UI Research

## Repository Constraints

* The UI stack is fixed: Ant Design inside the existing Pinova Admin shell.
* No trustworthy KPI or chart endpoint exists.
* Order status, amounts, product snapshots, and shipping snapshots are real domain fields.
* Filters should be URL-backed so an operations view survives refresh and can be shared internally.

## UI/UX Findings

* Use a compact, scannable table as the primary order-list surface, with filters above it and row navigation to a dedicated detail route.
* Status must use text plus a restrained semantic tag; color alone cannot encode lifecycle state.
* Monetary figures use tabular numerals and server-provided currency and fen values.
* On small screens, preserve the most important columns and move secondary fields into an expandable row or detail route instead of forcing page-level horizontal scrolling.
* Provide explicit loading, empty, request-failure, unauthorized, and not-found states with an available recovery action.

## Rejected Generic Recommendations

The external design-system query suggested comparison-table landing patterns, a purple dark palette, KPI cards, and charts. These do not match an operational order workflow or the established Pinova Admin shell, so they are not adopted. Only data-density, filtering, row highlighting, accessibility, and responsive checks apply.

