# Validator Infrastructure

This document describes the hosting, deployment, and operational model for the LLMO reference validator at `validate.llmo.org`. Last verified: 2026-04-21.

## Overview

The validator is a single-file vanilla HTML application hosted on Cloudflare Pages, served at `https://validate.llmo.org` with Cloudflare-issued TLS.

The validator implements §5.4 of the LLMO specification: client-side conformance checking against the published JSON Schema with per-tier reporting (Minimal, Standard, Strict) per §5.1 through §5.3.

## Source code

Repository: [openllmo/llmo-validator](https://github.com/openllmo/llmo-validator)

License: MIT, copyright 2026 Diverse.org.

Primary file: `index.html` (contains all HTML, CSS, and JavaScript inline, plus two embedded `<script type="application/json">` blocks carrying the schema and strict test vector). No build step at development time; the repo IS the deployable output. A single `sed` substitution runs at deploy time to replace the `COMMIT_SHA` placeholder with the actual git SHA.

## Inlined assets

The validator embeds two JSON assets from the spec repo inline in `index.html`:

- LLMO v0.1 JSON Schema (from `openllmo/llmo.org/spec/v0.1/schema.json`)
- Strict tier test vector (from `openllmo/llmo.org/spec/v0.1/test-vectors/signed-strict.json`)

These are inlined because `llmo.org` does not serve CORS headers on `/spec/v0.1/*` paths, so the validator at `validate.llmo.org` cannot runtime-fetch them.

**Update protocol:** whenever either asset changes in `openllmo/llmo.org`, a paired PR in `openllmo/llmo-validator` must update the inlined copy. Schema changes in particular are likely coordinated with a spec revision, so the workflow is:

1. Update the asset in `openllmo/llmo.org` (PR, review, merge).
2. Open a corresponding PR in `openllmo/llmo-validator` re-embedding the updated asset. The PR description cites the spec-repo commit SHA that the update tracks.
3. Merge the validator PR after the spec-repo change is merged. Cloudflare Pages auto-deploys the new build.

The validator's footer displays the commit SHA of the deployed build, allowing implementers and maintainers to identify exactly which build of the validator served a given result.

## Hosting

**Provider:** Cloudflare Pages  
**Account:** team@diverse.org (account ID `5d9418e9813fd14854487fc005ff07c1`)  
**Project name:** `llmo-validator`  
**Production branch:** `main`  
**Default URL:** `llmo-validator.pages.dev`  
**Custom domain:** `validate.llmo.org`

The GitHub App for Cloudflare Pages is installed on the `openllmo` organization, scoped to the `llmo-validator` repository only (not the entire org).

Pages auto-deploys on push to `main`. Pull requests produce preview deployments at `<deployment-hash>.llmo-validator.pages.dev`.

Dashboard navigation note: in the current unified Workers & Pages UI, the Pages creation path is **Workers & Pages → Create → Compute tab → Pages**. The default "Create application" flow routes to Workers; selecting Pages explicitly is required.

### Build configuration

```
Build command: sed -i "s/COMMIT_SHA = 'DEV'/COMMIT_SHA = '$CF_PAGES_COMMIT_SHA'/" index.html
Build output directory: (blank; serves from repo root)
Root directory: (blank)
Framework preset: None
Environment variables: (none)
```

The build command substitutes Cloudflare's `CF_PAGES_COMMIT_SHA` environment variable into the `COMMIT_SHA` constant in `index.html`, so the deployed footer displays the real commit SHA instead of the placeholder `DEV`.

The `sed` pattern anchors on the single-quoted form `COMMIT_SHA = 'DEV'`. The three build-time constants in `index.html` (`VERSION`, `BUILD_DATE`, `COMMIT_SHA`) must use single-quoted string literals for the substitution to match. A prior commit that used double-quoted literals shipped a deployment with the placeholder still present; the fix is recorded in the validator repo's commit history.

## DNS

`validate.llmo.org` is a CNAME to `llmo-validator.pages.dev`, managed on the `llmo.org` Cloudflare zone. Proxied through Cloudflare (orange cloud) because Cloudflare Pages expects traffic via the Cloudflare edge.

| Type  | Name              | Content                   | TTL  | Proxied |
|-------|-------------------|---------------------------|------|---------|
| CNAME | validate.llmo.org | llmo-validator.pages.dev  | Auto | true    |

This contrasts with the apex `A` record for `llmo.org` (which points at Vercel/Mintlify and is unproxied). The proxied/unproxied distinction is meaningful: proxied records route through Cloudflare's edge; unproxied records return the origin IP directly.

## TLS

Cloudflare Universal SSL auto-issues TLS certificates for `validate.llmo.org`. Certificate authority at initial issuance: Google Trust Services. No manual certificate management; renewal is automatic.

## Runtime dependencies

The validator loads two external resources at runtime from a public CDN:

- `https://esm.sh/ajv@8/dist/2020.js`: JSON Schema validator (AJV)
- `https://esm.sh/ajv-formats@3`: AJV format validators (date-time, uri, etc.)

The schema and strict test vector are inlined (see "Inlined assets" above), so the validator does not depend on `llmo.org` being reachable at runtime.

If esm.sh becomes unavailable, the validator displays an initialization error panel and disables validation. Schema validation is not hand-rolled. A future hardening step would be to self-host AJV (bundle with the validator or serve from Cloudflare Pages alongside). Deferred.

## Versioning

The validator displays its version in the footer: `Validator <VERSION> (<COMMIT_SHA>) · built <BUILD_DATE>`.

- `VERSION`: semantic version constant in `index.html`. Bumped in PRs that introduce behavioral changes to the rule set or UX.
- `COMMIT_SHA`: the git commit SHA of the deployed build, substituted at deploy time.
- `BUILD_DATE`: constant in `index.html`, updated manually in PRs when a new release is tagged.

Current version: matches specification version. See [versioning policy](/spec/versioning).

Rule-set changes that modify conformance semantics require a corresponding spec revision (in `openllmo/llmo.org`) and must be coordinated across both repos. Bug fixes, UX improvements, and error-message edits do not require spec coordination.

## Access control

- **Repository access:** openllmo organization members.
- **Cloudflare Pages project:** team@diverse.org Cloudflare account.
- **API access for programmatic management:** custom API token with:
  - `Zone → DNS → Edit` on specific zone `llmo.org`
  - `Account → Cloudflare Pages → Edit` on account `5d9418e9813fd14854487fc005ff07c1`
  
  Token is personal credential material. Store in a password manager under the Diverse.org Cloudflare entry. Never commit. Never paste into PRs or issues.

## Migration log

**2026-04-20:** Validator previously attempted as a Mintlify MDX snippet at `llmo.org/validate` (Priority 4 original implementation). Mintlify's MDX snippet resolver silently substituted the `<Validator />` component with a no-op stub, rendering the validator invisible. Cause was not an export-form issue (fixed and verified), but a deeper resolver behavior that could not be diagnosed without internal Mintlify access. Abandoned the Mintlify-hosted approach.

Re-implemented as vanilla HTML on Cloudflare Pages (Phase 2 of Priority 4 redux) under the principle of avoiding vendor-controlled critical path dependencies. The Mintlify `/validate` page on `llmo.org` becomes a thin pointer to `validate.llmo.org` in Phase 3.

## Contact

- Validator bugs/improvements: [GitHub Issues on openllmo/llmo-validator](https://github.com/openllmo/llmo-validator/issues)
- Spec or rule-set questions: [GitHub Issues on openllmo/llmo.org](https://github.com/openllmo/llmo.org/issues)
- Editor: spec@llmo.org
- Operational infrastructure: team@diverse.org
