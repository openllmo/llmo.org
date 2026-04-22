# Backlog

This file captures follow-up work, deferred decisions, and ideas surfaced during development that are not yet formal GitHub Issues. Items graduate from here to Issues when they are about to be worked on or need discussion.

- Always-append. New items go at the top of their category.
- Every item has a date (YYYY-MM-DD) and a short note.
- When an item has a GitHub Issue, link it inline.
- When an item is completed or explicitly dropped, move it to the "Resolved" section at the bottom with a resolution note.
- Priority is informal: H (high), M (medium), L (low), S (speculative).
- Categories: Infrastructure, Validator, Spec, Governance, Process, Product.

Entries are either short one-liners for lightweight items, or structured subsection entries for substantive work deferred from a specific PR. Structured entries capture scope, decided points, rejected alternatives, open questions, and references, so a future reader can reload context without reconstructing chat history.

## Infrastructure

- [ ] **CAA records on llmo.org** (H): Restrict TLS certificate issuance to specific CAs (Let's Encrypt, Google Trust Services, DigiCert). Defensive hardening, ~2 minutes of work. Added 2026-04-20.
- [ ] **Registrar transfer from GoDaddy to Cloudflare** (M): Consolidate DNS and registration under team@diverse.org. Unlocks the ability to programmatically manage the domain. Requires GoDaddy EPP auth code + 5-7 day waiting period. Added 2026-04-20.
- [ ] **Self-hosted AJV for the validator** (M): Eliminate esm.sh as a runtime single point of failure. Bundle AJV with the validator, serve from Cloudflare Pages alongside `index.html`. Added 2026-04-20.
- [ ] **Diverse.org production signing infrastructure** (M): When Diverse.org eventually serves a signed `/.well-known/llmo.json` at llmo.org, it needs a KMS-managed ES256 signing key with rotation policy, access controls, and documented key ceremony. Currently deferred; Priority 12 ships unsigned. Workerd is the intended runtime. Added 2026-04-20.

## Validator

- [ ] **Defensive fallback cleanup in `index.html`** (L): Change `|| "none"` fallback in the `cls` assignment to `|| "fail"` so an undefined variant renders as red rather than unstyled. Latent, not currently triggered. Added 2026-04-20.
- [ ] **Server-side validator on workerd** (L): A self-hostable validator service would unblock signature verification (JWKS fetch without CORS) and allow observing headers like `Cache-Control` on the JWKS response. Out of scope for v0.1. Added 2026-04-20.

## Spec

- [ ] **Authorship provenance for the LLMO specification** (M): Establish durable, independently-verifiable proof that Nic Chavez of Diverse.org authored the LLMO specification, dated to its actual publication. Planned approach: (1) GPG-sign commits on the spec repo with a key published on keybase.io, keys.openpgp.org, and a personal domain; (2) OpenTimestamps-anchor the SHA-256 of the v0.1 spec document to commit the content's existence to the Bitcoin blockchain. Both are standard practice in open-source and cryptographic communities. Added 2026-04-20.

## Governance

- [ ] **Process LIP to formalize core claim type proposal submission mechanics** (M). Deferred from Priority 5b (PR to be populated post-merge, 2026-04-21). Substantive change to the LIP process; requires the 14-day substantive-change governance window, which is why it was deferred from 5b's editorial-only scope.

  **Scope of the Process LIP:**

  - Placeholder filename convention for pre-number PRs. Direction: follow the PEP/BIP precedent with a form like `lip-NEW-<slug>.mdx`; the editor renames to `lip-NNNN.mdx` at merge time. Specific regex still open.
  - CI workflow amendment to distinguish PR-branch state from main-branch state. Placeholder filenames permitted on PR branches during review, forbidden in `main`. Specific workflow structure (separate jobs, `github.ref` conditional, or path gate) still open.
  - New Invariant 7 in `scripts/validate-lip-registry.sh`: enforce no placeholder files in `main`. Whether Invariant 7 is strictly additive or replaces part of Invariant 2's filename-pattern check (`lip-????.mdx`) still open.
  - Updates to LIP-1 Section 4 adding an explicit core-proposal path alongside the existing extension path. LIP-1 currently says "a forthcoming Process LIP will formalize the submission mechanics"; the Process LIP supersedes that clause with concrete mechanics.

  **Decided during 5b design session:**

  - Placeholder convention follows PEP/BIP precedent (`lip-NEW-<slug>.mdx`), editor renames at merge. Chosen over a bespoke ceremony.
  - The Process LIP is Process-type (not Standards Track), per LIP-1 §2.
  - The 14-day governance window is mandatory and not shortcuttable by claiming "editorial."

  **Explicitly rejected:**

  - A nonce-at-submission-renames-file-at-merge ceremony ("Option Y" number-assignment design floated during the 5b design session). Added complexity without clear benefit over the simpler PEP-style placeholder-then-rename flow.

  **Open questions:**

  - Exact placeholder filename regex.
  - CI workflow structure for PR-vs-main discrimination.
  - Whether Invariant 7 is additive or replaces part of Invariant 2.
  - Whether the Process LIP also revises LIP-1 Section 9 (numbering) to explicitly address the PR-branch-placeholder case.

  **Dependencies and references:**

  - Priority 5b PR: to be populated post-merge.
  - LIP-1 Section 4 (submission process for Standards Track LIPs): https://llmo.org/spec/lips/lip-0001
  - Governance page, Decision process section (14-day substantive-change window): https://llmo.org/about/governance

  Added 2026-04-21.

- [ ] **Migrate rename automation from GITHUB_TOKEN to dedicated GitHub App** (M). Deferred from Priority 6 Part A (PR to be populated post-merge). The rename automation workflow (`.github/workflows/rename-lip-placeholder.yml`) currently runs under GITHUB_TOKEN with a generic bot author identity. LIP-2 Section 10 specifies a dedicated GitHub App (`llmo-editor-bot`) with signed commits and restricted permissions. Migration steps: register the GitHub App under Diverse.org, configure restricted permissions and webhook scope, generate signing key, store as `LIP_BOT_SIGNING_KEY` secret, update workflow to use the App's installation token. Added 2026-04-21.

## Process

- [ ] **Cross-repo paired-PR workflow** (M): When `openllmo/llmo.org` modifies the JSON Schema or any test vector, a paired PR must land in `openllmo/llmo-validator` updating the inlined copy. Add this explicitly to `CONTRIBUTING.md` as a checklist item for schema/test-vector PRs. Added 2026-04-20.

## Resolved

_Move items here when completed or dropped, with date and resolution note._

---

*Last updated: 2026-04-20*
