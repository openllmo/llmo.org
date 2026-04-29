# Service accounts and entity ownership

This file is the canonical map of which entity owns which service account, who has access, and what email or identity is used to log in. It exists because the same "which account owns what" question came up repeatedly during the 2026-04-26 Mintlify-to-Hugo migration; an hour was lost reconstructing account associations that should have been written down.

This file is committed to a public repository. It documents **identities** (emails, account IDs, service-account names) and **resource ownership**, but it **never** contains credentials. Passwords, API tokens, recovery codes, and 2FA backup codes live in the operator's password manager (or a hardware key for high-stakes accounts). See "What this file does NOT contain" at the bottom.

The two entities that own production infrastructure today, plus a third grouping for personal / individual accounts that connect to the projects:

- **Diverse.org** — California 501(c)(3); steward of the LLMO protocol.
- **Greyfront, Inc.** — Delaware C-corp; future commercial vehicle. No live infrastructure deployed yet; domains reserved.
- **Personal / individual** — accounts attached to specific humans rather than to either entity.

---

## Diverse.org

### Cloudflare

- **Account email:** `team@diverse.org`
- **Account ID:** `5d9418e9813fd14854487fc005ff07c1`
- **Auth:** Google SSO via the `team@diverse.org` Google Workspace identity.
- **Resources owned:**
  - DNS zone for `llmo.org`
  - Pages project `llmo-org` (serves `llmo.org` and `www.llmo.org`)
  - Pages project `llmo-validator` (legacy; held as a redirect after the validator migrated into `llmo.org/validator/` on 2026-04-29; scheduled for deletion ~6 months later. The `validate.llmo.org/* -> llmo.org/validator/*` redirect is held by an account-level Cloudflare Bulk Redirect rule, independent of this Pages project.)
- **API access:** the wrangler OAuth flow on this account grants `zone:read`. DNS edits are done through the dashboard manually; no long-lived API token exists. If programmatic edits become needed, mint a scoped token per `infrastructure/DNS.md` "API access".

### Google Workspace

- **Domain:** `diverse.org`
- **Aliases configured:**
  - `spec@llmo.org` — protocol editor and primary public contact
  - `security@llmo.org` — security disclosure address (see `SECURITY.md`)
  - `team@diverse.org` — operational / infrastructure address used as the SSO identity for Cloudflare
- **Notes:** Workspace pays for the email infrastructure that backs all three aliases. Mail flow for `llmo.org` is configured via MX records on the Cloudflare zone (see `infrastructure/DNS.md`).

### GitHub organization

- **Org name:** `openllmo`
- **Owner (admin human):** `@thegigachav`
- **Repos:** `openllmo/llmo.org`, `openllmo/llmo-validator`
- **Org-level GitHub Apps installed:**
  - `cloudflare-workers-and-pages` — drives Cloudflare Pages auto-deploy on push to `main` for both Pages projects.
  - `Mintlify` — **REMOVED 2026-04-26** during the migration. See "Mintlify" below.
- **Notes:** the org is administered by a personal GitHub account (`@thegigachav`) rather than a Diverse.org-owned identity. Migrating ownership to a `team@diverse.org`-tied GitHub identity is a TODO; there is no urgency until staffing changes or for governance reasons.

### Mintlify (DEFUNCT, retained for historical record)

- **Status:** project orphaned; GitHub App uninstalled from `openllmo` on 2026-04-26.
- **Original auth:** the Mintlify project was created via the GitHub App installation flow on the `openllmo` org. No paired user dashboard account was created during signup, so there is no Mintlify dashboard login that resolves to this project.
- **Email associated with the orphaned project:** the GitHub primary email on `@thegigachav` (a rocketmail address). This is the only contact Mintlify support can use to identify the project.
- **Outcome:** the Mintlify dashboard for the orphaned project is inaccessible. Hugo on Cloudflare Pages now serves `llmo.org`. The Mintlify project still exists on Mintlify's side and is awaiting a support-email request to delete entirely. **TODO:** send the deletion request to Mintlify support.

### OpenTimestamps

- **No account.** OpenTimestamps is a free, account-less public service; calendars accept hashes from anyone.
- **Calendar servers used by `scripts/anchor-lip.sh`:**
  - `a.pool.opentimestamps.org`
  - `b.pool.opentimestamps.org`
  - `a.pool.eternitywall.com`
  - `ots.btc.catallaxy.com`
- **Local install:** `opentimestamps-client` (Python package) at `~/Library/Python/3.9/bin/ots`. **TODO:** add this directory to the operator's shell `PATH` durably (currently exported per session).

---

## Greyfront, Inc.

### Domains reserved (no infrastructure deployed)

- `greyfront.com` — registered, parked.
- `grayfront.com` — registered, parked.
- `llmo.com` — registered, parked.

No DNS, hosting, email, or other services are configured for these domains yet. They will be commissioned during the `llmo.com` product build.

**TODO when commissioned:** registrar of record for each domain, DNS provider, hosting provider, email provider, and the email/account identity used to administer each.

---

## Personal / individual

### GitHub

- **`@thegigachav`** — primary personal GitHub account. Owner of the `openllmo` organization (administers `llmo.org`, `llmo-validator`).
- **Primary email on file:** rocketmail address (the same address Mintlify still has on file for the orphaned project).
- **Notes:** this is the human who can administer the `openllmo` org. Org-ownership migration to a Diverse.org-tied identity is the TODO noted under "GitHub organization" above.

### Anthropic Pro

- **Owner:** Nic Chavez (personal account).
- **Notes:** powers Claude.ai, Claude Code, and Claude Design access used during LLMO protocol development. Not a Diverse.org or Greyfront subscription; expensed personally.

---

## When to update this file

- When a new service or account is created for any entity.
- When credentials migrate between identities (e.g., changing the email tied to a service, or transferring an account from a personal identity to an entity-owned identity).
- When an account is decommissioned (mark as `DEFUNCT`, retain history rather than deleting).
- When entity ownership of a resource changes.
- On a quarterly review cycle, re-verify each entry is still accurate.

---

## What this file does NOT contain

- **Passwords.** Live in the password manager.
- **API keys, tokens, or secrets.** Stored per-service in the password manager; never committed.
- **Recovery codes or 2FA backup codes.** Password manager.
- **Personal phone numbers.** Kept private.
- **Account numbers, payment methods, billing details.** Kept private.

If you find any of the above committed in this repository, treat it as a security incident: rotate the credential immediately and follow the disclosure process in `SECURITY.md`.
