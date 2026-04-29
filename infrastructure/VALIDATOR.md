# Validator Infrastructure

This document describes the hosting, deployment, and operational model for the LLMO reference validator at `https://llmo.org/validator/`. Last verified: 2026-04-29.

## Overview

The validator is a Hugo-rendered page on the main `llmo.org` site. It implements §5.4 of the LLMO specification: client-side conformance checking against the published JSON Schema with per-tier reporting (Minimal, Standard, Strict) per §5.1 through §5.3.

Prior to 2026-04-29 the validator was hosted as a separate Cloudflare Pages project at `validate.llmo.org`. That subdomain is now a 301 redirect to `https://llmo.org/validator/` (see "Redirect from validate.llmo.org" below).

## Source code

The validator lives in this repository (`openllmo/llmo.org`):

- `content/validator/_index.md`: Hugo content file with frontmatter title, description, lead prose, and the `/validate/` alias for legacy links.
- `layouts/validator/list.html`: Hugo layout template. Renders the validator UI inside the spec-site shell (top nav, theme toggle, footer). Contains scoped CSS under `.validator-app`, the validator's HTML structure, two `<script type="application/json">` blocks inlined at build time via Hugo's `readFile`, a build-config script that injects version/date/SHA from Hugo template data, and a `<script src="/js/validator.js" defer>` reference.
- `static/js/validator.js`: 952-line vanilla JS validator (DOM wiring, AJV bootstrap, JCS canonicalization checks, tier evaluator, results renderer). Read at startup; reads embedded schema and strict test vector via `JSON.parse(document.getElementById(...).textContent)`.
- `static/spec/v0.1/schema.json`: the v0.1 JSON Schema. Source of truth for the validator's schema; auto-inlined at build.
- `static/spec/v0.1/test-vectors/signed-strict.json`: the strict-tier test vector. Source of truth; auto-inlined at build.

License: MIT, copyright 2026 Diverse.org. The validator's CSS is scoped under a `.validator-app` div so its color tokens, font stack, and button styles don't bleed into other pages on the site.

## Inlined assets and auto-sync

The validator embeds two JSON assets inline in the rendered HTML:

- LLMO v0.1 JSON Schema (from `static/spec/v0.1/schema.json`)
- Strict tier test vector (from `static/spec/v0.1/test-vectors/signed-strict.json`)

Both are inlined at build time via Hugo's `readFile` template function. There is no separate paired-PR workflow: when the spec changes either asset, the validator picks up the change automatically on the next site build. The validator and the spec ship from the same git tree on the same Cloudflare Pages deploy.

Inlining (rather than runtime fetch) is preserved from the prior architecture for two reasons:

1. The validator can run from `file://` and offline.
2. There is no CORS dependency between the page and `/spec/v0.1/*` paths.

## Hosting

**Provider:** Cloudflare Pages
**Account:** team@diverse.org (account ID `5d9418e9813fd14854487fc005ff07c1`)
**Project name:** `llmo-org`
**Production branch:** `main`
**Custom domain:** `llmo.org`

The validator is one of the pages produced by the `llmo-org` Hugo build. There is no separate Pages project for it.

Pages auto-deploys on push to `main`. Pull requests produce preview deployments under `<deployment-hash>.llmo-org.pages.dev`.

## Build configuration

The validator inherits the spec site's standard Hugo build:

- Build command: `hugo --minify`
- Build output directory: `public`
- Hugo version: pinned via Cloudflare Pages env var (any recent Hugo extended works for development).

The validator's footer SHA stamping is handled by Hugo's `enableGitInfo = true` (set in `hugo.toml`) plus `{{ .GitInfo.AbbreviatedHash }}` in the layout. No external `sed` substitution step is required.

## Build-time constants

Three constants are surfaced in the validator's footer:

- `VERSION`: hardcoded in the layout's build-config script. Bumped manually when validator behavior changes meaningfully.
- `BUILD_DATE`: rendered from Hugo's `now.Format` at build time.
- `COMMIT_SHA`: rendered from Hugo's `.GitInfo.AbbreviatedHash` at build time.

These are passed to the validator JS via `window.LLMO_VALIDATOR_BUILD = { version, date, sha }` in an inline `<script>` ahead of the external JS reference. The validator JS reads from this global with a defensive fallback if the global is missing.

## Redirect from validate.llmo.org

`validate.llmo.org` exists as a 301 redirect to `https://llmo.org/validator/*`, preserving path and query.

The redirect is implemented as a Cloudflare Bulk Redirect rule at the account level (account `5d9418e9813fd14854487fc005ff07c1`). The rule is independent of the legacy `llmo-validator` Cloudflare Pages project: the project still exists but is no longer the source of truth, and can be deleted without affecting the redirect.

DNS for `validate.llmo.org` resolves through the standard Cloudflare zone for `llmo.org`. No separate hostname registration required.

The `validate.llmo.org` redirect is held for at least 6 months from the migration date (2026-04-29), to catch any in-the-wild bookmarks or links.

## Runtime dependencies

The validator loads AJV from a public CDN at runtime:

- `https://esm.sh/ajv@8/dist/2020.js` (JSON Schema validator)
- `https://esm.sh/ajv-formats@3` (format validators)

The schema and strict test vector are inlined at build time, so the validator does not depend on `llmo.org` being reachable at runtime to bootstrap.

If esm.sh becomes unavailable, the validator displays an initialization error panel and disables validation. A future hardening step would be to self-host AJV (bundle with the validator or serve from `static/js/`). Deferred.

## Versioning

The validator's version, date, and commit SHA appear in its footer.

- Validator semver bumps when behavioral changes warrant. Documented in the spec changelog if the change affects observable validation output.
- Schema version tracks the LLMO spec version. The validator at any given commit validates against the schema at the same commit.
- Rule-set changes that modify conformance semantics are part of the spec's normative content. They land via the spec change process (LIPs, governance window, etc.) rather than as standalone validator commits.

## Access control

- **Repository access:** openllmo organization members on `openllmo/llmo.org`.
- **Cloudflare account:** team@diverse.org Google SSO.
- **Cloudflare Bulk Redirect rule:** managed in the Cloudflare dashboard under the team@diverse.org account. Account-level resource, not zone-scoped.
- **API access for programmatic management:** custom API token with:
  - `Zone → DNS → Edit` on specific zone `llmo.org` (rarely needed)
  - `Account → Cloudflare Pages → Edit` on account `5d9418e9813fd14854487fc005ff07c1`

Token is personal credential material. Store in a password manager under the Diverse.org Cloudflare entry. Never commit. Never paste into PRs or issues.

## Migration log

**2026-04-20:** Validator initially attempted as a Mintlify MDX snippet at `llmo.org/validate` (Priority 4 original implementation). Mintlify's MDX resolver silently substituted the validator component with a no-op stub. Abandoned the Mintlify-hosted approach.

Re-implemented as vanilla HTML on Cloudflare Pages at `validate.llmo.org` under a separate `openllmo/llmo-validator` repository. Phase 2 of Priority 4 redux. The principle was to avoid vendor-controlled critical path dependencies; in retrospect the separate subdomain was a workaround for Mintlify's limitations rather than an intentional architecture.

**2026-04-27:** Mintlify retired. Spec site rebuilt on Hugo + Cloudflare Pages, served from `openllmo/llmo.org` directly.

**2026-04-29:** Validator migrated into the main site at `https://llmo.org/validator/` (commit `4d1e6d0`). Schema and test vector now auto-sync via Hugo `readFile` (no more paired-PR workflow). The `validate.llmo.org` subdomain becomes a Cloudflare Bulk Redirect to `https://llmo.org/validator/*`. The `openllmo/llmo-validator` repo is preserved at the migration commit, scheduled for archival ~6 months later once redirect traffic decays.

## Contact

- Validator bugs/improvements: [GitHub Issues on openllmo/llmo.org](https://github.com/openllmo/llmo.org/issues)
- Spec or rule-set questions: same
- Editor: spec@llmo.org
- Operational infrastructure: team@diverse.org
