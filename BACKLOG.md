# Backlog

This file captures follow-up work, deferred decisions, and ideas surfaced during development that are not yet formal GitHub Issues. Items graduate from here to Issues when they are about to be worked on or need discussion.

- Always-append. New items go at the top of their category.
- Every item has a date (YYYY-MM-DD) and a short note.
- When an item has a GitHub Issue, link it inline.
- When an item is completed or explicitly dropped, move it to the "Resolved" section at the bottom with a resolution note.
- Priority is informal: H (high), M (medium), L (low), S (speculative).
- Categories: Infrastructure, Validator, Spec, Governance, Process, Product.

## Infrastructure

- [ ] **CAA records on llmo.org** (H) — Restrict TLS certificate issuance to specific CAs (Let's Encrypt, Google Trust Services, DigiCert). Defensive hardening, ~2 minutes of work. Added 2026-04-20.
- [ ] **Registrar transfer from GoDaddy to Cloudflare** (M) — Consolidate DNS and registration under team@diverse.org. Unlocks the ability to programmatically manage the domain. Requires GoDaddy EPP auth code + 5-7 day waiting period. Added 2026-04-20.
- [ ] **Self-hosted AJV for the validator** (M) — Eliminate esm.sh as a runtime single point of failure. Bundle AJV with the validator, serve from Cloudflare Pages alongside `index.html`. Added 2026-04-20.
- [ ] **Diverse.org production signing infrastructure** (M) — When Diverse.org eventually serves a signed `/.well-known/llmo.json` at llmo.org, it needs a KMS-managed ES256 signing key with rotation policy, access controls, and documented key ceremony. Currently deferred; Priority 12 ships unsigned. Workerd is the intended runtime. Added 2026-04-20.

## Validator

- [ ] **Defensive fallback cleanup in `index.html`** (L) — Change `|| "none"` fallback in the `cls` assignment to `|| "fail"` so an undefined variant renders as red rather than unstyled. Latent, not currently triggered. Added 2026-04-20.
- [ ] **Server-side validator on workerd** (L) — A self-hostable validator service would unblock signature verification (JWKS fetch without CORS) and allow observing headers like `Cache-Control` on the JWKS response. Out of scope for v0.1. Added 2026-04-20.

## Spec

- [ ] **Authorship provenance for the LLMO specification** (M) — Establish durable, independently-verifiable proof that Nic Chavez of Diverse.org authored the LLMO specification, dated to its actual publication. Planned approach: (1) GPG-sign commits on the spec repo with a key published on keybase.io, keys.openpgp.org, and a personal domain; (2) OpenTimestamps-anchor the SHA-256 of the v0.1 spec document to commit the content's existence to the Bitcoin blockchain. Both are standard practice in open-source and cryptographic communities. Added 2026-04-20.

## Process

- [ ] **Cross-repo paired-PR workflow** (M) — When `openllmo/llmo.org` modifies the JSON Schema or any test vector, a paired PR must land in `openllmo/llmo-validator` updating the inlined copy. Add this explicitly to `CONTRIBUTING.md` as a checklist item for schema/test-vector PRs. Added 2026-04-20.

## Resolved

_Move items here when completed or dropped, with date and resolution note._

---

*Last updated: 2026-04-20*
