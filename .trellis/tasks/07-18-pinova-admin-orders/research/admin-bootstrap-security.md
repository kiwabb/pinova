# Initial Admin Bootstrap Security

## Sources

* Keycloak, "Bootstrapping and recovering an admin account": recommends a dedicated bootstrap command, supports passwords from environment input, and treats bootstrap identities as temporary.
* OWASP Secrets Management Cheat Sheet: secrets must not be hardcoded; environment variables can leak through process inspection, logs, or dumps and should only be used when stronger secret injection is unavailable.
* Berserk UI first-boot setup: compares one-time setup links, secret-managed pre-provisioning, and OIDC-only provisioning; setup routes must become permanently inert after the first user exists.

## Options For Pinova

### A. Dedicated one-time bootstrap command (recommended)

Run the application in non-web bootstrap mode. Create an initial temporary super administrator only when no administrator exists. Read the password interactively or from an explicitly named secret environment variable, hash it immediately, and never log it. Normal HTTP startup exposes no setup route.

Pros: smallest remote attack surface; deterministic for local and deployment automation; easy to test as an idempotent command.

Cons: requires an explicit operator step; password rotation and creation of permanent administrators still need a later administration workflow.

### B. First-start environment provisioning

Normal server startup checks secret-backed username/password variables and inserts an administrator only when the account table is empty.

Pros: convenient for unattended deployment.

Cons: credentials can remain in the runtime environment and operators may forget to remove them; server startup gains identity mutation behavior.

### C. One-time web setup flow

Create a short-lived, single-use setup token and expose a setup page only while no administrator exists.

Pros: friendly interactive onboarding.

Cons: larger implementation and attack surface; token storage, expiry, atomic consumption, restart behavior and log sensitivity all require dedicated tests.

## Recommendation

Use Option A. The command should fail closed when required inputs are missing, do nothing when an administrator already exists, create only a temporary super administrator, and require a password change before normal order access.

