---
title: Test Vectors (v0.1)
linkTitle: Test Vectors
description: Reference test vectors for implementers of the LLMO v0.1 signing and canonicalization requirements.
date: 2026-04-17
---

This page describes the test vectors for implementers of the LLMO specification. Vectors exercise the signing and canonicalization requirements of [§4](/spec/v0.1#4-trust-model) of the spec: JWS with ES256 over a JCS-canonicalized payload ([RFC 7515](https://www.rfc-editor.org/rfc/rfc7515), [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)).

## Entity convention

All test vectors use a fictional entity with the codename **JungleCat**:

- **Name:** JungleCat, Inc.
- **Primary domain:** `junglecat.example.com`

The `.example.com` subdomain is reserved by [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606) and is guaranteed never to resolve on the public internet. This makes it safe to use as a static fixture: no implementer will ever fetch a real document from this domain, and no legitimate organization can claim it.

## Document ID convention

Test vector documents use `document_id` values of the form `test-vector-v0.1-<tier>-<sequence>`, where `<tier>` is `minimal`, `standard`, or `strict`, and `<sequence>` is a zero-padded three-digit number. Additional vectors added to this directory follow the same pattern with the next sequence number.

## Validity window

Test vectors use a fixed 180-day validity window, matching the Standard-tier cap in §5.2 exactly:

- `valid_from`: `2026-04-20T00:00:00Z`
- `valid_until`: `2026-10-17T00:00:00Z`

> **Info:** Test vectors are static fixtures. After `valid_until`, a conforming validator SHOULD flag these documents as expired. This is expected behavior and a useful conformance check: a validator that does not flag an expired document is incorrect.

## Coverage matrix

The vector set targets every spec rule v0.1 defines. Two reference implementations evaluate vectors: the in-browser validator at [`/validator/`](/validator/) (source: `static/js/validator.js`) and the [`llmo` CLI](https://www.npmjs.com/package/llmo). The two diverge on which rules they enforce; the table records the actual coverage rather than the spec aspiration. Drift cells are followed up under [Drift findings](#drift-findings).

| Rule | Section | validator.js | CLI | Positive vector | Negative vector(s) |
|---|---|---|---|---|---|
| M3 schema validity | §3.1 | yes | yes | all positives | `negative-schema-malformed-claim-type.json`, `negative-schema-malformed-founded.json`, `negative-schema-bad-llmo-version.json` |
| M5 window <= 365 days | §5.1 | yes | yes | all positives | `negative-m5-window-over-365.json`, `edge-validity-366-days.json` |
| S1 has canonical_urls | §5.2 | yes | yes | `unsigned-standard.json` | `negative-s1-missing-canonical-urls.json` |
| S2 has official_channels | §5.2 | yes | yes | `unsigned-standard.json` | `negative-s2-missing-official-channels.json` |
| S3 primary_domain matches serving | §5.2 | yes (URL mode) | yes (URL mode) | `unsigned-standard.json` (URL mode) | none (paste-mode-only set) |
| S4 URL ownership | §5.2 | yes | yes | `unsigned-standard.json` | `negative-s4-third-party-canonical-url.json`, `negative-s4-third-party-product-url.json`, `negative-s4-third-party-supersedes-url.json` |
| S5 window <= 180 days | §5.2 | yes | yes | `unsigned-standard.json` | `negative-s5-window-181-days.json` |
| S6 disavowal/supersedes scope | §5.2 | no | no | `edge-disavowal-impersonation-defense.json` | `negative-s6-disavowal-third-party.json` |
| X1 signature structurally valid | §5.3, §4.3 | yes | collapsed into "signature valid" | `signed-strict.json`, `signed-strict-es384.json`, `signed-strict-eddsa.json` | `negative-x1-bad-alg.json`, `negative-x1-missing-kid.json`, `negative-x1-malformed-protected.json` |
| X1 §4.3.1 detail (b64:false, crit) | §4.3.1 | yes | yes | n/a | `negative-x1-detached-payload-b64-false.json`, `negative-x1-crit-non-empty.json` |
| X2 JWKS retrievable | §5.3 | URL mode only | URL mode only | (live deploy) | (live deploy) |
| X3 JWKS Cache-Control <= 86400 | §5.3 | URL mode only | URL mode only | (live deploy) | (live deploy) |
| X4 canonical_urls reference | §5.3 | yes | yes | `signed-strict.json` | `negative-x4-no-owned-canonical-url.json` |
| X5 document signature verifies | §5.3, §4.3 | yes (with JWKS) | yes (with JWKS) | `signed-strict.json` | `negative-x5-corrupted-signature.json` |
| X6 per-claim signatures verify | §5.3 | yes (with JWKS) | yes (with JWKS) | `signed-strict.json` (no per-claim sigs, trivially passes) | `negative-x6-bad-claim-signature.json` |
| W1 window 181-365 days warning | §5.4 | yes | not emitted | none (warning is conditional) | `warning-w1-200-day-window.json`, `edge-validity-365-days.json` |
| W2 spokesperson missing verification | §5.4 | yes | not emitted | `edge-spokesperson-with-verification.json` (no W2) | `warning-w2-spokesperson-no-verification.json` |

A standalone Standard-tier positive vector is not added: per [§5](/spec/v0.1#5-conformance-levels), Strict ⊂ Standard ⊂ Minimal, so each Strict vector is also Standard-conforming, and each `signed-strict-*.json` exercises the Standard-tier rules in addition to the Strict-tier rules. The unsigned variant is `unsigned-standard.json`.

A reproducible verification harness lives at [`scripts/test-vectors/verify-vectors.mjs`](https://github.com/openllmo/llmo.org/blob/main/scripts/test-vectors/verify-vectors.mjs) (CLI behavior) and [`scripts/test-vectors/verify-schema.mjs`](https://github.com/openllmo/llmo.org/blob/main/scripts/test-vectors/verify-schema.mjs) (canonical-schema validation). Both run as `node scripts/test-vectors/<file>` from the repo root and exit non-zero on any drift from the documented expectations.

## Files

### Positive vectors

#### `unsigned-minimal.json`

A minimally conforming `llmo.json`. Exercises the minimal tier ([§5.1](/spec/v0.1#5-1-minimal-conformance)): required top-level fields, no claims required, no signature.

Raw: [`/spec/v0.1/test-vectors/unsigned-minimal.json`](/spec/v0.1/test-vectors/unsigned-minimal.json)

#### `unsigned-standard.json`

A standard-conforming `llmo.json`. Exercises the standard tier ([§5.2](/spec/v0.1#5-2-standard-conformance)): minimal plus at least one `canonical_urls` claim and at least one `official_channels` claim. No signature.

Raw: [`/spec/v0.1/test-vectors/unsigned-standard.json`](/spec/v0.1/test-vectors/unsigned-standard.json)

#### `signed-strict.json`

A strictly conforming `llmo.json`. Exercises the strict tier ([§5.3](/spec/v0.1#5-3-strict-conformance)): standard plus a valid document-level ES256 JWS signature.

Raw: [`/spec/v0.1/test-vectors/signed-strict.json`](/spec/v0.1/test-vectors/signed-strict.json)

#### `signed-strict-key.json`

The JWKS containing the public key that verifies `signed-strict.json`. The `kid` is the [RFC 7638](https://www.rfc-editor.org/rfc/rfc7638) JWK thumbprint of the public key and matches the `kid` in the JWS protected header of `signed-strict.json`.

The corresponding private key was generated ephemerally during test vector production and was not retained. The public key here is the only material required to verify the signed vector.

> **Warning:** The keys in this JWKS are test-only. They MUST NOT be used in production.

Raw: [`/spec/v0.1/test-vectors/signed-strict-key.json`](/spec/v0.1/test-vectors/signed-strict-key.json)

#### `signed-strict-payload.json`

The exact UTF-8 bytes of the JCS-canonicalized payload that was signed (that is, the JWS signing input per RFC 7515 §5.1). This file has no trailing newline. Implementers use it to validate their JCS implementation independent of their JWS implementation.

Raw: [`/spec/v0.1/test-vectors/signed-strict-payload.json`](/spec/v0.1/test-vectors/signed-strict-payload.json)

> **Note:** The file is served with a `.json` extension. The content is a valid canonical JSON object by construction (that is what JCS produces), so the `.json` extension is accurate. Implementers compare the file byte-for-byte; the extension does not change the comparison.

#### `signed-strict-es384.json`, `signed-strict-es384-key.json`, `signed-strict-es384-payload.json`

A second strict-tier vector signed with ES384 (ECDSA over P-384, SHA-384) instead of ES256. Exercises the same strict-tier rules as `signed-strict.json` but with the second algorithm permitted by [§4.2](/spec/v0.1#4-2-signature-algorithms). `document_id` is `test-vector-v0.1-strict-002`. The JWKS, payload, and verification procedure follow the same conventions as the ES256 vector. Test-only key, MUST NOT be used in production.

Raw: [`signed-strict-es384.json`](/spec/v0.1/test-vectors/signed-strict-es384.json), [`signed-strict-es384-key.json`](/spec/v0.1/test-vectors/signed-strict-es384-key.json), [`signed-strict-es384-payload.json`](/spec/v0.1/test-vectors/signed-strict-es384-payload.json)

#### `signed-strict-eddsa.json`, `signed-strict-eddsa-key.json`, `signed-strict-eddsa-payload.json`

A third strict-tier vector signed with EdDSA (Ed25519). Exercises the third algorithm permitted by [§4.2](/spec/v0.1#4-2-signature-algorithms). `document_id` is `test-vector-v0.1-strict-003`. The JWK uses `kty: "OKP"` and `crv: "Ed25519"` (no `y` field, unlike the EC P-256 / P-384 vectors). Signature length is 64 bytes (raw Ed25519, not r||s). Test-only key, MUST NOT be used in production.

Raw: [`signed-strict-eddsa.json`](/spec/v0.1/test-vectors/signed-strict-eddsa.json), [`signed-strict-eddsa-key.json`](/spec/v0.1/test-vectors/signed-strict-eddsa-key.json), [`signed-strict-eddsa-payload.json`](/spec/v0.1/test-vectors/signed-strict-eddsa-payload.json)

### Negative vectors

These vectors exercise specific failure modes. Each vector identifies the rule it targets in its filename. Naming convention: `negative-<rule>-<descriptor>.json`. Each vector is documented with its expected validator output: in-browser validator first, [`llmo` CLI](https://www.npmjs.com/package/llmo) second.

#### Standard-tier negatives

##### `negative-s1-missing-canonical-urls.json`

A document with no `canonical_urls` claim. Validator reports S1 FAIL; CLI reports tier `minimal` with rule `has canonical_urls claim`. Targets [§5.2 S1](/spec/v0.1#5-2-standard-conformance).

##### `negative-s2-missing-official-channels.json`

A document with no `official_channels` claim. Validator reports S2 FAIL; CLI reports tier `minimal` with rule `has official_channels claim`. Targets [§5.2 S2](/spec/v0.1#5-2-standard-conformance).

##### `negative-s4-third-party-canonical-url.json`

`canonical_urls.docs` resolves to `https://docs.thirdparty.example.org/junglecat`, off the publisher's owned domain set. `canonical_urls.*` is not in the §5.2 third-party-allowed list. Validator reports S4 FAIL; CLI reports tier `minimal` with rule `all claim URLs resolve to owned domain or are third-party pointers`.

##### `negative-s4-third-party-product-url.json`

A `product_facts` claim with `products[0].url = https://marketplace.thirdparty.example.org/...`. Like `canonical_urls.*`, `product_facts.products[].url` is not in the §5.2 third-party-allowed list. Both validator and CLI report S4 FAIL; CLI tier drops to `minimal`.

##### `negative-s4-third-party-supersedes-url.json`

A `supersedes` claim with `superseded[0].url` on a third-party domain. `supersedes.superseded[].url` is not in the §5.2 third-party-allowed list. Both validator and CLI report S4 FAIL; CLI tier drops to `minimal`.

##### `negative-s5-window-181-days.json`

`valid_from` to `valid_until` is exactly 181 days, one day past the §5.2 S5 cap. Both validator and CLI report S5 FAIL and tier `minimal`. Note: this vector also triggers W1 (the warning fires for any window in 181 to 365 days; see `warning-w1-200-day-window.json` for an isolated W1 demo).

##### `negative-s6-disavowal-third-party.json`

A `disavowal` claim targeting a competitor's product on `https://competitor.example.org/`. The disavowal is neither a publisher self-statement nor an impersonation defense, putting it outside the §5.2 S6 scope. Neither validator nor CLI enforces S6 in v0.1.5; the vector exercises spec text and is filed as drift.

#### Strict-tier negatives

##### `negative-x1-bad-alg.json`

JWS protected header declares `alg: "RS256"`, outside the §4.2 allowed set (ES256, ES384, EdDSA). Validator reports X1 FAIL with the specific alg message; CLI collapses X1 and X5 into a single `signature valid` failure and reports tier `standard`.

##### `negative-x1-missing-kid.json`

JWS protected header decodes to `{"alg":"ES256"}` with no `kid`. Validator reports X1 FAIL ("missing kid"); CLI reports `signature valid` failure and tier `standard`.

##### `negative-x1-malformed-protected.json`

`signature.protected` is base64url-valid but does not decode to JSON (the bytes spell `not-actually-json-content`). Validator reports X1 FAIL ("does not decode to valid JSON"); CLI reports `signature valid` failure and tier `standard`.

##### `negative-x1-detached-payload-b64-false.json`

JWS protected header includes `b64: false` and `crit: ["b64"]`, the RFC 7797 detached-payload mode that [§4.3.1](/spec/v0.1#4-3-1-jws-payload-encoding) explicitly prohibits for v0.1. Validator reports X1 FAIL with the b64:false-specific message; CLI rejects via `lib/jws.ts` and reports `signature valid` failure with tier `standard`.

##### `negative-x1-crit-non-empty.json`

JWS protected header includes a non-empty `crit` array (`crit: ["unknown-ext"]`). [§4.3.1](/spec/v0.1#4-3-1-jws-payload-encoding) requires verifiers to reject any JWS whose `crit` parameter is non-empty for v0.1. Validator reports X1 FAIL with the crit-non-empty message; CLI rejects via `lib/jws.ts` and reports `signature valid` failure with tier `standard`.

##### `negative-x4-no-owned-canonical-url.json`

A signed document whose `canonical_urls` claim has an empty `statement` object. The doc passes S1 (claim is present) and S4 (no URLs to validate) but fails X4 (no canonical_urls URL on the owned domain). Validator reports X4 FAIL; CLI reports a strict-tier failure with rule `canonical_urls claim has owned-domain URL` (alongside the `signature valid` failure for the unverifiable placeholder signature). Tier drops to `standard`.

##### `negative-x5-corrupted-signature.json`

A clone of `signed-strict.json` with the first base64url character of the document-level signature flipped from `j` to `k`. The protected header and JWKS reference are unchanged. Verifies against the existing `signed-strict-key.json` JWKS but fails cryptographically: validator reports X5 FAIL, CLI reports `signature valid` failure with `signatureValid: false`. Tier drops to `standard`.

##### `negative-x6-bad-claim-signature.json` and `negative-x6-bad-claim-signature-key.json`

A standard-conforming document with a `disavowal` claim carrying a per-claim ES256 signature. The per-claim signature byte was corrupted (first character `s` to `t`) before the document-level signature was applied, so the document-level signature verifies (X5 PASS) while the per-claim signature does not (X6 FAIL). Tier drops to `standard`. The accompanying JWKS holds the public key for both signatures.

#### Schema and minimal-tier negatives

##### `negative-schema-malformed-claim-type.json`

Includes a claim with `type: "noNamespace"`, which matches neither the eight reserved core types nor the namespaced extension pattern (per [§3.6](/spec/v0.1#3-6-extension-claims) and the v0.1.4 schema fix). Schema validation against [`/spec/v0.1/schema.json`](/spec/v0.1/schema.json) fails. CLI reports tier `invalid`.

##### `negative-schema-malformed-founded.json`

`statement_identity.founded` is set to `"yesterday"`. The v0.1.4 schema fix added a pattern (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`); `"yesterday"` violates it. Both the canonical schema and the CLI's vendored schema reject this vector; the CLI re-vendored in cli PR #1 (2026-05-07) and reports tier `invalid`. The [verify-schema.mjs harness](https://github.com/openllmo/llmo.org/blob/main/scripts/test-vectors/verify-schema.mjs) also fails the vector against the canonical schema.

##### `negative-schema-bad-llmo-version.json`

`llmo_version` is `"0.2"`, violating the schema `const: "0.1"`. Both schema and CLI catch this; CLI reports tier `invalid`.

##### `negative-m5-window-over-365.json`

A 400-day validity window (2026-04-20 to 2027-05-25). Schema does not constrain window length; the M5 tier rule does (§5.1: window MUST NOT exceed 365 days). CLI reports tier `invalid` with rule `window <= 365 days`.

### Warning-triggering vectors

These vectors are conformant but trigger a discouraged-practice warning in the validator. Warnings are surfaced separately from tier evaluation per [§5.4](/spec/v0.1#5-4-validator-behavior).

#### `warning-w1-200-day-window.json`

A 200-day validity window. The window exceeds the 180-day Standard cap (S5 FAIL, doc tier is Minimal) but is within the 365-day Minimal cap, so the validator emits W1. The CLI does not emit warnings; it reports the S5/M5 outcome only.

#### `warning-w2-spokesperson-no-verification.json`

A standard-conforming document with a `personnel.spokespeople[0]` entry missing the `verification` URL. The document remains Standard-tier conformant; the validator emits W2 advising publishers to add a verification URL. The CLI does not emit W2.

### Edge-case vectors

These vectors exercise boundary conditions in the spec. Each is documented with the boundary it tests and its expected outcome.

#### `edge-validity-365-days.json`

Validity window is exactly 365 days, the upper bound of M5. M5 PASS, S5 FAIL (>180), W1 emitted. Tier `minimal`.

#### `edge-validity-366-days.json`

Validity window is 366 days, one day past M5. M5 FAIL. Tier `invalid`. Documents the M5 boundary on the failing side.

#### `edge-claim-type-namespaced.json`

A standard-conforming document containing an extension claim with `type: "junglecat.internal_compliance"`, exercising the [§3.6](/spec/v0.1#3-6-extension-claims) namespaced pattern. Schema validates the type via the second branch of the v0.1.4 `oneOf`. The validator and CLI both ignore the unknown extension type (per the §3.6 forward-compatibility rule); tier `standard`.

#### `edge-disavowal-impersonation-defense.json`

A `disavowal` claim with `what: "unaffiliated_domain"` targeting a domain shaped to imply affiliation with the publisher. The disavowal is in scope per [§3.5](/spec/v0.1#3-5-core-claim-types) and S6 (impersonation defense). Tier `standard`.

#### `edge-spokesperson-with-verification.json`

A `personnel.spokespeople[0]` entry with `verification: "https://github.com/junglecat-ceo"`, a third-party URL explicitly permitted by [§5.2 S4](/spec/v0.1#5-2-standard-conformance) (`personnel.spokespeople[].verification` is in the third-party-allowed set). Tier `standard`. No W2 because verification is present.

## Drift findings

The vector set surfaced four classes of drift between spec text and reference implementations. Each is filed in the project [BACKLOG](https://github.com/openllmo/llmo.org/blob/main/infrastructure/BACKLOG.md). Vectors covering drift cases are kept in the set so the drift is detectable by anyone running the harness; if the implementations are later patched to match spec, the harness expectations update.

1. **S6 (disavowal/supersedes scope) is unimplemented in both validator.js and the CLI.** Vectors: `negative-s6-disavowal-third-party.json`, and `edge-disavowal-impersonation-defense.json` as a positive control. Spec rule landed in v0.1.2; reference implementations were not updated.

2. **§4.3.1 `b64:false` and non-empty `crit` (resolved).** Vectors: `negative-x1-detached-payload-b64-false.json`, `negative-x1-crit-non-empty.json`. Spec text under [§4.3.1](/spec/v0.1#4-3-1-jws-payload-encoding) is normative. The CLI enforces this in `src/lib/jws.ts`; the validator now enforces it in the X1 structural check (PR `fix/validator-jws-rfc7797`). Vectors retained so the harness can detect any future regression.

3. **CLI does not enforce S4 (URL ownership) or X4 (canonical_urls reference) (resolved).** Vectors: the three `negative-s4-*.json` and `negative-x4-no-owned-canonical-url.json`. Both rules were noted as "informational" in `src/lib/tier.ts`; validator.js already enforced them. The CLI now ports the validator's S4 (`collectClaimUrls` + third-party-allowed field list + owned-domain check) and X4 (canonical_urls must have at least one owned-domain URL) into `src/lib/tier.ts` (cli PR #5, merge SHA `b407061fad9af9533bda0a917b27a8906c6cf0da`). Vectors retained so the harness can detect any future regression.

4. **CLI vendored schema lags canonical schema (resolved).** Vector: `negative-schema-malformed-founded.json`. The v0.1.4 schema additions (`founded` pattern, `claim.type` `oneOf`) were missing from `cli/src/schema/v0.1.json`; canonical-schema validation via `verify-schema.mjs` rejected the vector while CLI accepted it. The CLI re-vendored the schema in cli PR #1 (2026-05-07); both the canonical schema and the CLI vendored schema now reject `"yesterday"`. Vector retained so the harness can detect any future regression.



## Verifying the signed vector

1. Fetch the JWKS: `signed-strict-key.json`.
2. Locate the key by matching the `kid` in the JWS protected header of `signed-strict.json` to the `kid` in the JWKS entry.
3. Remove the `signature` field from `signed-strict.json`. Preserve all other fields and their order as provided.
4. Canonicalize the remaining document per RFC 8785 (JCS).
5. Verify the ES256 signature from the `signature` field over the canonical bytes using the public key from the JWKS.

A conforming implementation MUST verify the signature successfully at step 5.

## Verifying a JCS implementation independently

1. Read `signed-strict.json`.
2. Remove the `signature` field.
3. Canonicalize the remainder using the implementation under test.
4. Compare the output byte-for-byte against `signed-strict-payload.json`.

The two must be identical. If they differ, the implementation is not RFC 8785 conformant.

## Versioning

These vectors correspond to LLMO v0.1 (`llmo_version: "0.1"`). Future specification versions may introduce new vectors under sibling directories (e.g., `/spec/v0.2/test-vectors/`). The vectors in this directory are stable and will not be modified after publication. Corrections, if required, are published as sibling files with a new sequence number and documented in the [changelog](/spec/changelog).
