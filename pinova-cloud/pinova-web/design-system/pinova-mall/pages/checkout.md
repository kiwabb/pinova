# Checkout page overrides

Read `../MASTER.md` first.

- Use the shared `CommercePageHeader`; the back action returns to the cart.
- Keep the reading order as address, selected products, optional buyer remark, then order summary. Desktop may make the summary sticky; mobile stacks it after the form content.
- Address choices are full-card radios with a visible selected state and keyboard focus. Empty address state links to the working address-management route.
- Show only product quantity, real unit price, and product total. Do not add shipping fees, discounts, invoices, delivery promises, payment methods, or policy claims without documented API fields.
- The primary action is disabled without an address and while submitting. Submission errors stay next to the action, use an announced alert, and preserve a retry path.
- Success is rendered only from a real `checkoutNo + orders[]` response. A multi-shop result lists every returned order number; never create a local order number or mock success.
- Keep every control at least 44px, prevent horizontal overflow, and verify the sticky summary does not cover content at 375px and 1440px.
