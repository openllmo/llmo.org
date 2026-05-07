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

## Files

### `unsigned-minimal.json`

A minimally conforming `llmo.json`. Exercises the minimal tier ([§5.1](/spec/v0.1#5-1-minimal-conformance)): required top-level fields, no claims required, no signature.

Raw: [`/spec/v0.1/test-vectors/unsigned-minimal.json`](/spec/v0.1/test-vectors/unsigned-minimal.json)

### `unsigned-standard.json`

A standard-conforming `llmo.json`. Exercises the standard tier ([§5.2](/spec/v0.1#5-2-standard-conformance)): minimal plus at least one `canonical_urls` claim and at least one `official_channels` claim. No signature.

Raw: [`/spec/v0.1/test-vectors/unsigned-standard.json`](/spec/v0.1/test-vectors/unsigned-standard.json)

### `signed-strict.json`

A strictly conforming `llmo.json`. Exercises the strict tier ([§5.3](/spec/v0.1#5-3-strict-conformance)): standard plus a valid document-level ES256 JWS signature.

Raw: [`/spec/v0.1/test-vectors/signed-strict.json`](/spec/v0.1/test-vectors/signed-strict.json)

### `signed-strict-key.json`

The JWKS containing the public key that verifies `signed-strict.json`. The `kid` is the [RFC 7638](https://www.rfc-editor.org/rfc/rfc7638) JWK thumbprint of the public key and matches the `kid` in the JWS protected header of `signed-strict.json`.

The corresponding private key was generated ephemerally during test vector production and was not retained. The public key here is the only material required to verify the signed vector.

> **Warning:** The keys in this JWKS are test-only. They MUST NOT be used in production.

Raw: [`/spec/v0.1/test-vectors/signed-strict-key.json`](/spec/v0.1/test-vectors/signed-strict-key.json)

### `signed-strict-payload.json`

The exact UTF-8 bytes of the JCS-canonicalized payload that was signed (that is, the JWS signing input per RFC 7515 §5.1). This file has no trailing newline. Implementers use it to validate their JCS implementation independent of their JWS implementation.

Raw: [`/spec/v0.1/test-vectors/signed-strict-payload.json`](/spec/v0.1/test-vectors/signed-strict-payload.json)

> **Note:** The file is served with a `.json` extension. The content is a valid canonical JSON object by construction (that is what JCS produces), so the `.json` extension is accurate. Implementers compare the file byte-for-byte; the extension does not change the comparison.

### `signed-strict-es384.json`, `signed-strict-es384-key.json`, `signed-strict-es384-payload.json`

A second strict-tier vector signed with ES384 (ECDSA over P-384, SHA-384) instead of ES256. Exercises the same strict-tier rules as `signed-strict.json` but with the second algorithm permitted by [§4.2](/spec/v0.1#4-2-signature-algorithms). `document_id` is `test-vector-v0.1-strict-002`. The JWKS, payload, and verification procedure follow the same conventions as the ES256 vector. Test-only key, MUST NOT be used in production.

Raw: [`signed-strict-es384.json`](/spec/v0.1/test-vectors/signed-strict-es384.json), [`signed-strict-es384-key.json`](/spec/v0.1/test-vectors/signed-strict-es384-key.json), [`signed-strict-es384-payload.json`](/spec/v0.1/test-vectors/signed-strict-es384-payload.json)

### `signed-strict-eddsa.json`, `signed-strict-eddsa-key.json`, `signed-strict-eddsa-payload.json`

A third strict-tier vector signed with EdDSA (Ed25519). Exercises the third algorithm permitted by [§4.2](/spec/v0.1#4-2-signature-algorithms). `document_id` is `test-vector-v0.1-strict-003`. The JWK uses `kty: "OKP"` and `crv: "Ed25519"` (no `y` field, unlike the EC P-256 / P-384 vectors). Signature length is 64 bytes (raw Ed25519, not r||s). Test-only key, MUST NOT be used in production.

Raw: [`signed-strict-eddsa.json`](/spec/v0.1/test-vectors/signed-strict-eddsa.json), [`signed-strict-eddsa-key.json`](/spec/v0.1/test-vectors/signed-strict-eddsa-key.json), [`signed-strict-eddsa-payload.json`](/spec/v0.1/test-vectors/signed-strict-eddsa-payload.json)

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
