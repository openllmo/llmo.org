# Service accounts and entity ownership

This file is the canonical map of which entity owns which service account, who has access, and what email or identity is used to log in. It exists because the same "which account owns what" question came up repeatedly during the 2026-04-26 Mintlify-to-Hugo migration; an hour was lost reconstructing account associations that should have been written down.

This file is committed to a public repository. It documents **identities** (emails, account IDs, service-account names) and **resource ownership**, but it **never** contains credentials. Passwords, API tokens, recovery codes, and 2FA backup codes live in the operator's password manager (or a hardware key for high-stakes accounts). See "What this file does NOT contain" at the bottom.

Production infrastructure for LLMO is operated by Nicholas Chavez as an individual. Earlier materials described Diverse.org, Inc. as the steward; that stewardship was never formally stood up ([ADR-0014](/adr/0014-single-steward-individual/)), so no infrastructure is held by Diverse.org, Inc. The `diverse.org` domain is a Google Workspace personally owned by the steward and used as an operational login identity for Cloudflare and other services; it does not represent corporate ownership. Migration off the `diverse.org`-tied login identity to a non-Diverse-named identity is a TODO (see "Open migrations" below).

- **LLMO stewardship (Nicholas Chavez, individual):** owns the production infrastructure for the protocol and the site.
- **Greyfront, Inc.**: Delaware C-corp; future commercial vehicle. No live infrastructure deployed yet; domains reserved. The individual steward also operates Greyfront.
- **Personal / individual**: accounts attached to specific humans and not routed through any entity.

---

## LLMO stewardship (Nicholas Chavez, individual)

### Cloudflare

- **Account email:** `team@diverse.org` (personal Google Workspace, see below; not a Diverse.org, Inc. account)
- **Account ID:** `5d9418e9813fd14854487fc005ff07c1`
- **Auth:** Google SSO via the `team@diverse.org` Google Workspace identity.
- **Resources owned:**
  - DNS zone for `llmo.org`
  - Pages project `llmo-org` (serves `llmo.org` and `www.llmo.org`)
  - Pages project `llmo-validator` (legacy; held as a redirect after the validator migrated into `llmo.org/validator/` on 2026-04-29; scheduled for deletion ~6 months later. The `validate.llmo.org/* -> llmo.org/validator/*` redirect is held by an account-level Cloudflare Bulk Redirect rule, independent of this Pages project.)
- **API access:** the wrangler OAuth flow on this account grants `zone:read`. DNS edits are done through the dashboard manually; no long-lived API token exists. If programmatic edits become needed, mint a scoped token per `infrastructure/DNS.md` "API access".
- **TODO:** migrate the Cloudflare account login identity away from `team@diverse.org` to a non-Diverse-named identity, consistent with the ADR-0014 stewardship withdrawal. Low urgency; operational continuity is unaffected.

### Google Workspace

- **Domain:** `diverse.org` (personally owned by Nicholas Chavez; retained operationally even though Diverse.org, Inc. no longer appears on protocol surfaces)
- **Aliases configured:**
  - `spec@llmo.org`: protocol editor and primary public contact
  - `security@llmo.org`: security disclosure address (see `SECURITY.md`)
  - `team@diverse.org`: operational / infrastructure address used as the SSO identity for Cloudflare
- **Notes:** Workspace pays for the email infrastructure that backs all three aliases. Mail flow for `llmo.org` is configured via MX records on the Cloudflare zone (see `infrastructure/DNS.md`).
- **TODO:** decide whether to retain the `diverse.org` Workspace indefinitely, migrate to an `llmo.org`-only Workspace, or move to a steward-named Workspace. Low urgency; current routing works.

### GitHub organization

- **Org name:** `openllmo`
- **Owner (admin human):** `@thegigachav`
- **Repos:** `openllmo/llmo.org`, `openllmo/llmo-validator`
- **Org-level GitHub Apps installed:**
  - `cloudflare-workers-and-pages`: drives Cloudflare Pages auto-deploy on push to `main` for both Pages projects.
  - `Mintlify`: **REMOVED 2026-04-26** during the migration. See "Mintlify" below.
- **Notes:** the org is administered by a personal GitHub account (`@thegigachav`). This is consistent with the individual stewardship model recorded in ADR-0014. If a stewarding entity is ever formed, org-ownership transfer to an entity-tied identity becomes relevant work; until then there is no action required.

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

- `greyfront.com`: registered, parked.
- `grayfront.com`: registered, parked.
- `llmo.com`: registered, parked.

No DNS, hosting, email, or other services are configured for these domains yet. They will be commissioned during the `llmo.com` product build.

**TODO when commissioned:** registrar of record for each domain, DNS provider, hosting provider, email provider, and the email/account identity used to administer each.

---

## Personal / individual

### GitHub

- **`@thegigachav`**: primary personal GitHub account. Owner of the `openllmo` organization (administers `llmo.org`, `llmo-validator`).
- **Primary email on file:** rocketmail address (the same address Mintlify still has on file for the orphaned project).
- **Notes:** this is the human who can administer the `openllmo` org. The individual-steward model (ADR-0014) is consistent with the current personal-account ownership; no entity-tied migration is required.

### Anthropic Pro

- **Owner:** Nic Chavez (personal account).
- **Notes:** powers Claude.ai, Claude Code, and Claude Design access used during LLMO protocol development. Not a Greyfront subscription; expensed personally.

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
