---
title: Changelog
description: Version history for the LLMO specification.
use_lastmod: true
---

## About this changelog

This changelog records substantive and editorial changes to the LLMO specification. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with release sections grouped by patch version per the [versioning policy](/spec/versioning).

During v0.1 pre-release, changes are author-decided and no governance window applies. From v0.2 forward, changes follow the LIP process and the editor applies editorial revisions per the [governance page](/about/governance).

## [Unreleased]

## [0.1.10] - 2026-05-19

v0.1.10 adds a resolver-side fallback location for publishers whose primary-domain serving topology is owned by a hosted-platform edge (Shopify, BigCommerce, Wix, Squarespace, and similar SaaS commerce platforms; certain CMS platforms with restrictive `/.well-known/` policies). The signed document is unchanged; the addition is purely additive per [ADR-0006](/adr/0006-version-bump-and-release-cut/). Rationale, considered alternatives, and security analysis recorded in [ADR-0013](/adr/0013-resolver-fallback-for-saas-hosted-publishers/). Accepted under [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/) pre-launch authorship privilege; no LIP filed.

### Added

- **§2.6 Resolver fallback for SaaS-hosted publishers** specifying the fixed-subdomain fallback `https://llmo.<primary_domain>/.well-known/llmo.json` as a single non-heuristic alternate location. Consumers SHOULD attempt the fallback when, and only when, the primary path is structurally absent (HTTP 404, DNS NXDOMAIN, or TCP connection refused on port 443). Primary path remains authoritative when it returns a usable response; resolvers SHOULD negative-cache the primary's absence-class result for a bounded window (recommended default: 5 minutes) to bound lookup amplification.
- **§8.13 Reservation of the `_llmo.<primary_domain>` DNS namespace for future discovery** added as an Open Question for Future Versions. The reservation is namespace-only; v0.1 does not pre-specify record shape or value format. One particular TXT-URL shape was considered for v0.1.10 and not adopted, with reasoning recorded in [ADR-0013](/adr/0013-resolver-fallback-for-saas-hosted-publishers/). Future versions are free to define a different shape at this namespace without being constrained by the considered-and-not-adopted shape.

### Changed

- **§2.1 Location** amended: organizations whose primary-domain serving topology does not permit publication under `/.well-known/` MAY satisfy the location MUST by serving the file at the §2.6 fallback location instead.
- **§2.5 Discovery failure** rewritten to distinguish absence-class failures (HTTP 404, DNS NXDOMAIN, TCP connection refused on 443), which trigger the §2.6 fallback, from presence-with-failure modes (5xx, 4xx other than 404, TLS handshake errors, response timeouts, 200 with malformed content), which do not. Reinforces the prohibition on heuristic discovery beyond the single fixed-subdomain fallback.
- **§5.2 rule S3** expanded: `entity.primary_domain` matches the domain serving the file, or the file is served at `llmo.<entity.primary_domain>` under the §2.6 fallback. The expansion is strictly broader; documents conforming to S3 under v0.1.0 through v0.1.9 continue to conform unchanged.

### Migration

- No publisher action required. Publishers currently serving at `https://<primary_domain>/.well-known/llmo.json` continue to conform exactly as before. Publishers blocked from primary-path serving by their hosting platform now have a defined fallback location with documented resolver behavior; rollout of llmo.com-side infrastructure for that population proceeds in the llmo.com repo.
- Resolver implementers SHOULD update to attempt the §2.6 fallback when the primary path returns 404, NXDOMAIN, or connection refused. Resolvers that do not implement the fallback remain conformant under the SHOULD-class language; documents at fallback-only publishers are discoverable to resolvers that have adopted the SHOULD-clause, and that population grows as the spec is adopted.
- No schema change. `static/spec/v0.1/schema.json` is untouched; rule S3 changes are spec-text-only since S3 binds the serving domain to a document field, not to a schema constraint.

## [0.1.9] - 2026-05-12

v0.1.9 lands two normative changes accepted on the same day under editor authorship privilege during the pre-announcement Goldilocks period (see [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/)): [LIP-4](/spec/lips/lip-0004/) introduces a Key Transparency registry as a Strict-tier requirement (rule X7) with a 14-day grace period from this release date before enforcement begins; [LIP-5](/spec/lips/lip-0005/) adds a normative `category` discriminator to the `disavowal` claim type's `disavowed[]` items and binds rule S6 to a closed two-value enum, closing the documentation-versus-enforcement gap deferred since v0.1.5.

Both LIPs transitioned Draft → Final on 2026-05-12 with the LIP-1 §10 14-day governance window observed informally and the LIP-4 §5 X7 grace period revised from 90 days to 14 days. Per ADR-0012, full window observance resumes for substantive normative changes after the v0.1 public announcement.

### Added

- **[LIP-4](/spec/lips/lip-0004/) Final** introduces a Key Transparency (KT) registry: a public, append-only log of `(domain, kid, jwk_thumbprint, doc_url, doc_id, observed_at)` records, each a compact JWS signed by the publisher's private key with the public JWK inline in the protected header per RFC 7515 §4.1.3. SHA-384 thumbprints per RFC 7638 throughout for ~128-bit post-quantum collision resistance under Grover. Rule **X7** (KT registry inclusion required for Strict tier) added to spec §5.3. The registry is hash-committed via periodic signed snapshots so the historical record of registered keys survives any future signature-algorithm break. Reference implementation runs at `https://llmo.org/kt/v1/`.
- **[LIP-5](/spec/lips/lip-0005/) Final** adds a normative `category` field to entries in `disavowal.disavowed[]` arrays. The field is a closed enum: `self_statement` (publisher disavows own past content) or `impersonation_defense` (publisher disavows third party falsely representing affiliation). `statement_disavowal.disavowed[].items.required` now contains `["what", "detail", "category"]`. Spec §3.5 documents the per-value semantic.
- **Implementer-facing endpoint spec** at `/spec/v0.1/kt-registry-endpoints/` documenting every endpoint of the KT registry API: `POST /kt/v1/entries`, `GET /kt/v1/entries`, `GET /kt/v1/entries/{id}`, `GET /kt/v1/log.jsonl`, `GET /kt/v1/snapshot/latest`, `GET /kt/v1/snapshot/{id}`. Plus D1 schema, KV namespace, federation considerations.
- **Test vector suite** for LIP-4 entries at `/spec/v0.1/test-vectors/kt/`: 3 positive (one per supported algorithm) and 10 negative (one per defined registry error code). Generator at `scripts/test-vectors/generate-kt-vectors.mjs`.

### Changed

- **§3.5 `disavowal` claim type** documents the new `category` discriminator with definitions for `self_statement` and `impersonation_defense`. Worked example updated to include the field on both entries.
- **§5.2 rule S6** updated with the binding rule text. Documents whose disavowal entries are missing the field or carry an out-of-enum value MUST NOT be evaluated at Standard tier or higher; the document evaluates at Minimal tier with note `s6_disavowal_out_of_scope`.
- **§5.4 deferral note** for S6 informational-only status (in force v0.1.5 through v0.1.8) closed. Reference validators bind S6 to tier outcome starting with v0.1.9; CLI gains the same binding in `llmo@0.1.13`.
- **`static/spec/v0.1/schema.json`** in-place patch: `statement_disavowal.disavowed[]` items add `category` to `required` and enum-restrict the value. Schema `$id` unchanged (in-place v0.1.x patch convention per [ADR-0006](/adr/0006-version-bump-and-release-cut/)).

### Migration

- Documents conforming to v0.1.0 through v0.1.8 that include a `disavowal` claim without `category` fields on each `disavowed[]` entry fail M3 schema validation against the v0.1.9 schema. Affected publishers add the field with the appropriate enum value. Pre-launch the only such document is the steward's own at llmo.org, updated in the same release window.
- Strict-tier consumers begin enforcing X7 starting 2026-05-26 (14 days after this release). During the grace period the `kt_uninlogged` note is surfaced advisorily but does not downgrade tier.
- Documents with no disavowal claim and a registered signing key are unaffected.

## [0.1.8] - 2026-05-11

v0.1.8 (in progress, additive) introduces six new core claim types (`contact_points`, `categories`, `locations`, `hours`, `attributes`, `operational_status`), five new top-level optional fields (`revocation_registry`, `dns_corroboration`, `publication_history`, `delegates_to`, `delegated_from`), `provenance_markers` on the claim envelope, and structured verification forms on `entity.external_ids` plus a new `irs_ein` well-known key. Every conforming v0.1 document validates unchanged. Schema `$id` and `llmo_version` are unchanged.

### Added
- Five new top-level optional fields in `static/spec/v0.1/schema.json` and documented in §3.1: `revocation_registry` (URL pointer to `/.well-known/llmo-revocations.json`; registry wire format deferred), `dns_corroboration` (`{txt_record, hash_alg}` for out-of-band integrity corroboration; hash algorithm values `sha-256`, `sha-384`, `sha-512`), `publication_history` (URL pointer to a third-party append-only log; interchange format deferred), `delegates_to` and `delegated_from` (arrays of domain strings establishing the delegation graph; asserted but not yet evaluated as a trust primitive).
- Six new core claim types in §3.5 and the schema's `claim.type` `oneOf` core branch: `contact_points` (typed contact addresses with verification metadata; schema enforces required `verification_proof` and `verified_at` when `verification_status` is `verified` via `if`/`then`), `categories` (schema.org Organization subtype URIs plus NAICS codes), `locations` (postal address, WGS84 coordinates, service area with `oneOf` of radius / polygon / bounding_box / named_places, business_type enum, per-location `publisher_id`), `hours` (regular weekly schedule keyed by day-of-week, calendar exceptions, named alternate sub-schedules; `24:00` permitted as a close time only; `is_overnight` flag for periods spanning midnight), `attributes` (open map drawing canonical names from the controlled vocabulary at `/glossary/#attributes`), `operational_status` (open / opening_soon / temporarily_closed / permanently_closed; schema enforces required `effective_date` when status is not `open`).
- Optional `provenance_markers` field on the claim envelope (§3.4): array of advisory string markers recording how the builder agent derived each claim. Inside the signed payload. Consumers MAY use as confidence or freshness signal; MUST NOT treat as authoritative. See [ADR-0007](/adr/0007-claude-as-builder/). Distinct from the `media_provenance` scope on `pointer` claims, which is C2PA-attested media origin.
- `entity.name` accepts an array of `{name, locale, primary}` entries for internationalized names alongside the v0.1 single-string form. Schema enforces exactly one `primary: true` via `contains` with `minContains: 1, maxContains: 1`. Locale is RFC 5646.
- `entity.external_ids` per documented well-known key accepts a structured `{value, verification_method, verification_proof, verified_at}` object alongside the v0.1 plain-string form. Verification method enum: `domain_proof`, `signed_attestation`, `registry_lookup`, `none`. Proof and timestamp required when method is not `none` (schema-enforced via `if`/`then`). Custom keys via `additionalProperties` also accept the structured form.
- New `entity.external_ids` well-known key: `irs_ein` (U.S. Internal Revenue Service Employer Identification Number) with pattern `^[0-9]{2}-[0-9]{7}$`. Existing well-known keys `wikidata`, `duns`, `lei`, `did` gain the structured form with per-key value patterns preserved.
- Four new `canonical_urls` well-known keys: `appointment`, `menu`, `reservations`, `order`. `additionalProperties` remains open.
- `product_facts` per-product entries extended with `kind` (enum `product` or `service`, default `product`), `price` (`oneOf` of `{amount, currency}` with ISO 4217 alphabetic currency code, or symbolic value `free` / `varies` / `call_for_quote`), `description` (max 2048 chars), `category` (schema.org type URI).
- `identity` statement extended with `price_range` integer 1 to 4 mapping to $, $$, $$$, $$$$. Spec text adds SHOULD-level soft cap of approximately 500 characters on `description` for LLM consumption efficiency; schema hard cap of 2048 unchanged.
- New §3.8 documenting six reserved top-level namespaces (`posts`, `reviews`, `qa`, `media_pointers`, `advertising_extensions`, `consumer_metadata`). Reservation lives in spec prose only; schema top level remains `additionalProperties: true` with no enforcement. Publishers MUST NOT populate these keys in v0.1.8.
- Wire-format compatibility note in §3.8: v0.1.8 is purely additive over v0.1; every conforming v0.1 document validates against the v0.1.8 schema unchanged. Schema `$id` remains `https://llmo.org/spec/v0.1/schema.json` per the in-place patch convention documented in ADR-0006. `llmo_version` remains `const: "0.1"` for the lifetime of the v0.1 minor version.

### Changed
- Schema-first encoding of three conditional constraints that earlier versions would have punted to validator code: `contact_points` entry `if {verification_status: verified} then required: [verification_proof, verified_at]`; `operational_status` `if {status: not open} then required: [effective_date]`; `entity.name` array form `contains {primary: true}` with `minContains: 1, maxContains: 1`. Schema is the source of truth; CLI and validator.js inherit these checks via schema validation rather than reimplementing.
- Eight new entries in the schema's `$defs` map: `locale_name`, `structured_external_id`, `day_schedule`, plus the six new `statement_*` types for the new core claim types. Eight new branches in `claim.allOf` mapping each new claim type to its statement schema.

### Migration notes
- **Publishers:** nothing required. Populate the new optional fields when convenient. The Claude builder skill / GH action (see ADR-0007) will populate them automatically on the publisher's behalf, including `provenance_markers` (the agent's per-claim audit trail), location entries, hours, attributes, and the structured `external_ids` verification form.
- **Validators and consumers:** updating the schema reference is a no-op since the canonical URL is unchanged. The new conditional-required constraints (verified contact points; non-open operational status; entity.name array primary count) fire automatically through schema validation. Reserved-namespace keys are ignored at the schema level (top-level `additionalProperties: true` remains); future patch versions may give them meaning.
- **CLI vendored schema sync:** the CLI's vendored copy of `schema.json` should be refreshed in a paired PR in the `openllmo/cli` repo after v0.1.8 lands. This is downstream work tracked separately.
- **Cryptographic layer:** untouched. ES256, ES384, EdDSA; JCS (RFC 8785); JWS (RFC 7515); JWKS at `/.well-known/llmo-keys.json` are all unchanged.

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
