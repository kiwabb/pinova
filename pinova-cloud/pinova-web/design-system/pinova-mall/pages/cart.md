# Cart page overrides

Read `../MASTER.md` first.

- Desktop uses cart lines plus a sticky summary; mobile stacks them in reading order.
- Selection, quantity and removal remain directly available and at least 44px.
- Item names and real specification summaries are primary. Internal SKU IDs and inferred tags stay hidden.
- Suggestions use the standard product surface and only real image, name, price and category data.
- Do not show checkout until the order API, address selection, submission idempotency and error recovery are implemented.
- Do not repeat static trust claims in the cart.
