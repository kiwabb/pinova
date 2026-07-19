# Shipping address overrides

Read `../MASTER.md` first.

- Desktop uses saved addresses plus a sticky edit form; mobile uses one column.
- Address cards show receiver, mobile, full display address, default state and optional user label.
- Create, edit, default, delete-confirmation, loading, empty, login-expired and version-conflict states are required.
- China mainland phone numbers are normalized to E.164 before submission.
- Administrative names and stable codes are both required until a trusted region-selector data source replaces manual entry.
- Personal data is never written to logs, page metadata or analytics events.
