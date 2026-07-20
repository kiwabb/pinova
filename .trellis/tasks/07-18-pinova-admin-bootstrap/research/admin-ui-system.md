# Pinova Admin UI System Research

## Inputs

* Repository decision: React + TypeScript + Vite + Ant Design.
* Product type: internal e-commerce operations console.
* UI/UX Pro Max query: `ecommerce operations admin dashboard data-dense professional`.

## Findings

* Use a data-dense but scannable operations layout: stable sidebar, compact header, route breadcrumb, restrained surfaces, tables and trees as primary work areas.
* Use semantic status colors only for actual state. Do not fabricate KPI cards, charts, sales figures or operational alerts without API fields.
* Keep row highlighting, loading feedback and filtering clear; avoid ornate styling and marketing-page composition.
* Preserve WCAG AA contrast, visible keyboard focus, reduced-motion behavior and responsive layouts at 375, 768, 1024 and 1440 widths.
* Use Ant Design components and tokens as the implementation base. The external palette and font suggestions are not adopted because the repository already fixed the stack and the admin must remain consistent with Pinova rather than import a generic blue analytics theme.

## Recommended Direction

Build a quiet, work-focused Ant Design console with compact density, neutral surfaces and a limited Pinova brand accent. Start with real member and category workflows; do not lead with a dashboard that has no trustworthy data source.

