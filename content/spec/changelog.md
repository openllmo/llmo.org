---
title: Changelog
description: Version history for the LLMO specification.
use_lastmod: true
---

## About this changelog

This changelog records substantive and editorial changes to the LLMO specification. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with release sections grouped by patch version per the [versioning policy](/spec/versioning).

During v0.1 pre-release, changes are author-decided and no governance window applies. From v0.2 forward, changes follow the LIP process and the editor applies editorial revisions per the [governance page](/about/governance).

## [Unreleased]

## [0.1.7] - 2026-05-11

v0.1.7 bundles the comprehensive test-vector expansion from PR #74 and removes the in-spec changelog mirror that was creating drift. Every conformance rule v0.1 defines now has at least one exercising vector; the validator and CLI harnesses (`scripts/test-vectors/verify-vectors.mjs` and `scripts/test-vectors/verify-schema.mjs`) report 31/31 passing against the canonical schema. Four drift findings between reference implementations and spec text were surfaced and filed to BACKLOG. ES384 and EdDSA gain their first strict-tier vectors, closing the gap with §4.2's algorithm registry. Appendix B of `/spec/v0.1/` becomes a pointer to this changelog, eliminating the duplicate-source drift risk.

### Added
- Strict-tier test vectors for ES384 (`signed-strict-es384.json` and key/payload counterparts) and EdDSA (`signed-strict-eddsa.json` and key/payload counterparts) under `/spec/v0.1/test-vectors/`. The §4.2 algorithm registry permits ES256, ES384, and EdDSA; the test vector set previously covered only ES256. The new vectors complete coverage. `content/spec/v0.1/test-vectors.md` gains entries describing them.
- Comprehensive test-vector expansion under `/spec/v0.1/test-vectors/` covering every conformance rule v0.1 defines. New negative vectors for S1, S2, S4 (three failure modes), S5, S6, X1 (alg, kid, malformed protected header, b64:false, crit non-empty), X4, X5 (corrupted document signature), and X6 (corrupted per-claim signature); schema and minimal-tier negatives for malformed `claim.type`, malformed `founded` field, bad `llmo_version`, and over-365-day windows; warning vectors for W1 and W2; edge-case vectors at 365-day and 366-day window boundaries, namespaced extension claim types, the impersonation-defense disavowal scope, and spokesperson verification URLs. `content/spec/v0.1/test-vectors.md` gains a coverage matrix table mapping each rule to its enforcing implementations and exercising vectors, organized vector-file subsections (positive, negative-by-rule, warning, edge), and a Drift findings section documenting where validator.js and CLI behavior diverge from spec text. Two harnesses landed at `scripts/test-vectors/`: `verify-vectors.mjs` runs CLI verify against every vector and asserts expected tier and rule outcomes (31/31 passing); `verify-schema.mjs` validates each vector against the canonical `/spec/v0.1/schema.json` (31/31 passing). The expansion surfaced four drift findings, each filed as a separate BACKLOG item: §5.2 S6 unimplemented in both reference implementations, §4.3.1 b64/crit rejection unimplemented in both, CLI does not enforce S4 or X4, and the CLI vendored schema lags canonical.

### Changed
- Appendix B of the v0.1 specification document replaced with a pointer to this changelog. The standalone changelog at `/spec/changelog/` is the single source of truth for version history; the in-spec mirror was removed to eliminate drift.

## [0.1.6] - 2026-05-08

v0.1.6 bundles two changes surfaced by PR #74's test-vector expansion. The reference validator at /validator/ now enforces §4.3.1's prohibitions on detached-payload JWS (`b64: false` in the protected header) and non-empty `crit`; the CLI already enforced these, so v0.1.6 brings the two reference implementations into agreement on §4.3.1-malformed input. §5.4 gains a paragraph documenting that S6 (introduced in v0.1.5) is reported informationally by reference validators pending a schema discriminator for §3.5 disavowal categories. This is not a normative change to S6 itself: publishers remain subject to S6 as written in §5.2, and consumers remain entitled to treat S6 violations as out-of-conformance. Reference validator behavior is the only thing changing for S6, from "unimplemented" to "explicitly informational pending schema discriminator."

### Fixed
- Reference validator at /validator/ now enforces §4.3.1 prohibitions on detached-payload JWS (`b64: false` in protected header) and non-empty `crit` parameter. Previously the validator silently accepted these constructions; the CLI already rejected them. Two reference implementations now agree on §4.3.1-malformed input.

### Changed
- §5.4 gains a paragraph documenting that v0.1.5 reference validators report S6 informationally rather than as binding tier failure. Disavowal-half ambiguity (the §3.5 disavowal categories lack a schema discriminator) means binding enforcement is deferred to a future LIP-process clarification. The supersedes half is machine-checkable and may be enforced earlier in a future patch.

## [0.1.5] - 2026-05-05

Per-claim signature verification and rule labeling pass. Documents conforming to v0.1.4 with document-level signatures only continue to conform under v0.1.5; X6 evaluates as PASS trivially for documents with no per-claim signatures. The live `llmo.json` at `/.well-known/llmo.json` was re-signed in a parallel ceremony to gain a per-claim signature on its disavowal claim, exercising the new rule end-to-end.

### Added
- §5.3 X6 rule requiring all present per-claim signatures to cryptographically verify against keys in the publisher's JWKS. Per-claim signatures MAY use a different `kid` than the document-level signature, provided the `kid` resolves to a key in the same publisher JWKS.
- §5.4 W1 (validity window 181 to 365 days) and W2 (`personnel.spokespeople` entry without a `verification` URL) warning codes defined explicitly to match validator emission.
- §4.4 consumer verification algorithm gains a clarifying note on per-claim `kid` resolution.

### Changed
- §5.2 Standard tier bullets gain explicit S1 through S6 labels matching what conforming validators emit. Prior unlabeled bullets created cross-reference drift between spec text and validator output.
- §5.3 Strict tier bullets gain explicit X1 through X6 labels for the same reason.
- §5.3's prior single "valid document-level signature" bullet split into X1 (structural validity of the signature field including protected header decoding and `alg`/`kid` presence) and X5 (cryptographic verification of the signature against the publisher's JWKS).
- §7 worked example updated to show a per-claim signature on the disavowal claim, with corresponding annotation.

## [0.1.4] - 2026-05-01

Schema completeness pass closing prose-vs-schema drift identified by audit. No artifact changes required for the live llmo.json. Implementations validating against the updated schema will reject documents that previously passed schema validation but contained malformed types or non-date `founded` values.

### Fixed
- `static/spec/v0.1/schema.json`: `statement_identity.founded` gains a pattern constraint enforcing year (`YYYY`), year-month (`YYYY-MM`), or full RFC 3339 date (`YYYY-MM-DD`). The field previously accepted any string, including free-text values like "yesterday".
- `static/spec/v0.1/schema.json`: `claim.type` now uses a `oneOf` requiring either exact match against the eight reserved core types defined in §3.5 (`identity`, `canonical_urls`, `official_channels`, `product_facts`, `personnel`, `disavowal`, `supersedes`, `pointer`) or a namespaced pattern with at least one dot per §3.6. The prior bare pattern accepted arbitrary lowercase strings as types, letting documents with malformed types parse as schema-valid even though no validator branch handled them.

### Changed
- §3.6 prose tightened to make the bipartite "core or namespaced" claim type rule explicit.

## [0.1.3] - 2026-04-30

S4 (URL ownership) semantic alignment patch. No artifact changes required: the live llmo.json document is correct as-published.

### Fixed
- §5.2 S4 (URL ownership) no longer flags `personnel.spokespeople[].verification` as a violation. Verification URLs are third-party identity attestation by design; the §3.5 example explicitly showed `https://github.com/thegigachav` as the canonical pattern, but the original S4 rule incorrectly treated third-party attestation URLs as ownership violations.
- §5.2 S4 now correctly enforces ownership on `supersedes.superseded[].url` per v0.1.2's §3.5 Scope language. The validator previously marked the field as third-party-allowed and skipped the check.

### Changed
- §5.2 S4 wording rewritten to enumerate third-party-allowed fields explicitly: `pointer.url`, `disavowal.disavowed[].url`, `official_channels.community[].url`, and `personnel.spokespeople[].verification`.
- §7 worked example annotation on `personnel.spokespeople` updated to reflect the corrected rule.

## [0.1.2] - 2026-04-30

Security patch constraining disavowal and supersedes claim scope, plus consumer-side JWKS handling improvements. Documents valid under v0.1.1 that contain only self-targeting or impersonation-defense disavowal/supersedes claims remain valid under v0.1.2; documents that previously contained out-of-scope third-party disavowal/supersedes claims now fail Standard-tier conformance. No schema, document, or signing changes.

### Security
- §3.5 disavowal claim type constrained to publisher self-statements and impersonation defense. Third-party-targeting disavowals (claims about parties the publisher neither controls nor is being impersonated by) are out of conformance at Standard and Strict tiers.
- §3.5 supersedes claim type constrained to URLs and documents the publisher controls or formerly controlled. Third-party-targeting supersedes claims are out of conformance at Standard and Strict tiers.
- §5.2 gains a corresponding tier rule enforcing the scope constraints above.
- §4.6 trust-on-first-use semantics for JWKS made explicit: domain control is the trust anchor, and first-fetch JWKS is trusted because it was served over HTTPS from a domain the publisher claims to control.
- §4.7 (new) specifying consumer-side JWKS handling: caching cap of 24 hours matching §2.4, key change detection on unrecognized `kid`, and differential-fetch policy when sudden full key replacement is observed.

### Changed
- §4.6 advisory updated to direct consumers on handling out-of-scope claims encountered in nonconforming documents.
- §7 worked example annotation clarified: the `unaffiliated_domain` entry is impersonation defense, not unconstrained third-party disavowal.
- §8.10 rewritten to remove the prior vulnerability-disclosure framing. The residual reputation-layer work is now about scoring legitimate publishers, not mitigating closed attack vectors.

## [0.1.1] - 2026-04-27

Standard JWS clarification, RFC 7797 prohibition, and editorial cleanup folded forward from work landed 2026-04-22. On-disk shape of the `signature` field is unchanged; the live document at `https://llmo.org/.well-known/llmo.json` and the published test vectors at `/spec/v0.1/test-vectors/` were already in standard mode and remain conforming without modification.

### Added
- §4.3.1 (JWS payload encoding) specifying standard attached JWS per RFC 7515 as the required signing mode.
- §8.11 covering post-quantum cryptographic readiness as an open question for future versions. (#24)

### Changed
- §4.3 clarified to require standard attached JWS per RFC 7515.
- Prior §4.3.1 (Canonicalization) renumbered to §4.3.2.
- Prior §4.3.2 (Publisher guidance) renumbered to §4.3.3.
- §8 renamed from "Open Questions for v0.2" to "Open Questions for Future Versions"; version-specific commitments throughout the section retired. (#24)
- Em-dashes removed from specification text per authoring conventions in LIP-3. (#24)
- Adjacent anchor reference update in `claims.mdx`. (#24)
- `static/spec/v0.1/schema.json`: `signature.protected` description carries the `b64`/`crit` prohibition. `signature.protected` and `signature.signature` gain a `minLength: 16` floor.

### Security
- Detached-payload JWS (RFC 7797, `b64: false`) prohibited. Verifiers MUST reject documents whose protected header asserts `b64: false` or whose `crit` parameter is non-empty.

## [0.1.0] - 2026-04-17

Initial publication of the LLMO specification.

The v0.1 specification series is the active initial line. The specification text, schema, and test vectors at `/spec/v0.1/` may receive author-decided revisions during this period. When v0.1 is superseded by v0.2, the path will be frozen.
