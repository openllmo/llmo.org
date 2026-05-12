---
title: "KT Registry Endpoints (v0.1)"
linkTitle: KT Endpoints
description: "Implementer reference for the LLMO Key Transparency registry HTTP API specified in LIP-4 §3.3."
date: 2026-05-12
weight: 7
---

Implementer-facing API reference for the LLMO Key Transparency (KT) registry. The protocol-level specification is in [LIP-4](/spec/lips/lip-0004/); this page is the concrete wire format and behavior contract that conforming registry implementations and consumers MUST agree on.

The reference operator is Diverse.org, hosting the canonical v0.1.x registry at `https://llmo.org/kt/v1/`. Future operators participating in v0.2 federation MUST serve the same wire format under their own base URL.

## Base path

All endpoints are served under `/kt/v1/`. The version segment (`v1`) reflects this LIP's API revision, not the LLMO spec version; a future LIP introducing a non-backward-compatible API change would increment to `/kt/v2/`.

All responses include CORS header `Access-Control-Allow-Origin: *`. The registry surfaces are public.

## Endpoints

### POST /kt/v1/entries

Submit a new KT entry.

**Request:**

```
POST /kt/v1/entries HTTP/1.1
Host: llmo.org
Content-Type: application/jose+json

<compact-JWS-string>
```

The request body is a compact-serialization JWS per RFC 7515, with the protected header and payload as specified in [LIP-4 §3.2](/spec/lips/lip-0004/#32-entry-format).

**Validation pipeline (registry MUST perform all in order):**

1. Body MUST be a syntactically valid compact JWS (three base64url segments separated by `.`).
2. Protected header MUST be a JSON object containing at minimum `alg`, `kid`, `typ`, and `jwk`.
3. `alg` MUST be one of the algorithms permitted by spec §4.2 (`ES256`, `ES384`, `EdDSA`).
4. `typ` MUST equal `llmo-kt-entry+jws`.
5. `jwk` MUST be a JSON Web Key containing only public-key parameters for the key type. Private-key parameters (`d` for EC keys, equivalent for other types) MUST be absent. Registry rejects with `400 jwk_contains_private_material` if present.
6. Payload MUST be a JSON object containing `domain`, `kid`, `jwk_thumbprint`, `doc_url`, `doc_id`, `observed_at`. Other fields are allowed and preserved verbatim.
7. `payload.kid` MUST equal `protected.kid`. Registry rejects with `400 kid_mismatch` if not.
8. `payload.jwk_thumbprint` MUST equal `base64url(SHA-384(JCS(protected.jwk)))` per LIP-4 §3.1. Registry rejects with `400 thumbprint_mismatch` if not.
9. JWS signature MUST verify against `protected.jwk` using `protected.alg`. Registry rejects with `400 signature_invalid` if not.
10. `payload.domain` MUST be a valid public hostname (RFC 1035 syntax, no IP literals, contains at least one dot). Registry rejects with `400 invalid_domain` otherwise.
11. `payload.observed_at` MUST be a valid RFC 3339 timestamp within ±5 minutes of the registry's clock at receipt time. Registry rejects with `400 timestamp_out_of_range` otherwise. This bound prevents both backdated entries and unbounded clock drift on the publisher side.
12. `payload.doc_url` MUST be a `https://` URL whose hostname equals `payload.domain` followed by `/.well-known/llmo.json`. Registry rejects with `400 doc_url_mismatch` otherwise.
13. Submitter source IP MUST be within rate limits (default 100 entries per hour per IP). Registry rejects with `429 rate_limited` otherwise.

If all checks pass, the registry assigns an `entry_id` (auto-incrementing integer starting at 1) and a `log_position` (equal to `entry_id` in single-operator v0.1.x), appends to the log, and returns:

**Success response:**

```
HTTP/1.1 201 Created
Content-Type: application/json
Location: /kt/v1/entries/<entry_id>

{
  "entry_id": 1234,
  "log_position": 1234,
  "appended_at": "2026-05-12T15:38:11Z",
  "receipt": "<compact-JWS-string>"
}
```

The `receipt` is a JWS signed by the registry's signing key with payload `{entry_id, log_position, appended_at, entry_jws_hash}`, where `entry_jws_hash = base64url(SHA-384(<compact-JWS-string>))`. The receipt is the registry's signed attestation that the submitted entry was accepted at the given position.

**Error response:**

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "<error_code>",
  "detail": "<human-readable explanation>"
}
```

Defined error codes: `malformed_jws`, `missing_protected_field`, `unsupported_alg`, `wrong_typ`, `jwk_contains_private_material`, `missing_payload_field`, `kid_mismatch`, `thumbprint_mismatch`, `signature_invalid`, `invalid_domain`, `timestamp_out_of_range`, `doc_url_mismatch`, `rate_limited`.

### GET /kt/v1/entries

Query entries for a given domain.

**Request:**

```
GET /kt/v1/entries?domain=<primary_domain>&limit=<n> HTTP/1.1
```

Query parameters:
- `domain` (required): the publisher's `primary_domain`. Lowercased before matching.
- `limit` (optional, default 10, max 100): maximum number of entries returned.

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

{
  "domain": "example.com",
  "entries": [
    {
      "entry_id": 1234,
      "log_position": 1234,
      "entry": "<compact-JWS-string>",
      "appended_at": "2026-05-12T15:38:11Z"
    }
  ],
  "total": 1
}
```

Entries are returned in descending `log_position` order (most recent first). The `entry` field is the original compact JWS submitted by the publisher; consumers re-verify against the inline `jwk` per LIP-4 §3.6.

If no entries exist for the domain: `entries: []`, `total: 0`, status `200 OK` (not 404, to distinguish from registry errors).

### GET /kt/v1/entries/{entry_id}

Fetch a single entry by its log index.

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=3600

{
  "entry_id": 1234,
  "log_position": 1234,
  "entry": "<compact-JWS-string>",
  "appended_at": "2026-05-12T15:38:11Z"
}
```

`404 Not Found` if `entry_id` does not exist or has been removed (entries are append-only and never removed; 404 indicates the ID was never assigned).

### GET /kt/v1/log.jsonl

Bulk download of the full append-only log.

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Cache-Control: max-age=300

<compact-JWS-of-entry-1>
<compact-JWS-of-entry-2>
...
<compact-JWS-of-entry-N>
```

One entry per line, in ascending `log_position` order. Each line is the original compact JWS submitted by the publisher. The bulk-download surface is intended for consumers who want to verify the registry independently or maintain a local mirror.

A consumer who has retained a prior snapshot may verify integrity by re-computing `SHA-384(<bytes-of-log.jsonl-prefix-up-to-snapshot-time>)` and comparing to the snapshot's `log_hash`. The flat log content at any prefix-time MUST match the corresponding snapshot.

### GET /kt/v1/snapshot/latest

Fetch the most recent signed snapshot of the log.

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/jose+json
Cache-Control: max-age=300

<compact-JWS-of-snapshot>
```

The JWS is signed by the registry's signing key. Decoded payload:

```json
{
  "snapshot_id": 1234,
  "log_size": 5678,
  "log_hash": "<base64url(SHA-384(log.jsonl-bytes-at-snapshot-time))>",
  "snapshot_at": "2026-05-12T02:00:00Z",
  "previous_snapshot_id": 1233,
  "previous_log_hash": "<base64url hash from the prior snapshot>"
}
```

For the very first snapshot: `previous_snapshot_id` and `previous_log_hash` are `null`.

### GET /kt/v1/snapshot/{snapshot_id}

Fetch a historical snapshot by ID. Response format identical to `/snapshot/latest`. `404 Not Found` if the ID does not exist.

## D1 schema (reference)

The reference registry uses Cloudflare D1 (serverless SQLite) for the dynamic query surfaces. The schema is:

```sql
CREATE TABLE entries (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_position INTEGER NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  kid TEXT NOT NULL,
  jwk_thumbprint TEXT NOT NULL,
  doc_url TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  appended_at TEXT NOT NULL,
  entry_jws TEXT NOT NULL,
  source_ip TEXT NOT NULL
);

CREATE INDEX idx_entries_domain ON entries(domain);
CREATE INDEX idx_entries_thumbprint ON entries(jwk_thumbprint);
CREATE INDEX idx_entries_appended ON entries(appended_at);

CREATE TABLE rate_limits (
  source_ip TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source_ip, window_start)
);
```

D1 is a query accelerator for the dynamic surfaces (`/entries`, `/entries/{id}`). The canonical record is the JSONL log file at `static/kt/v1/log.jsonl`, written by a scheduled flush from D1.

## KV namespace (reference)

The reference registry uses Cloudflare Workers KV for snapshot storage. Keys:

- `snapshot:latest` → the most recent signed snapshot JWS.
- `snapshot:<snapshot_id>` → a specific snapshot JWS by ID.
- `signing-key-meta` → JSON metadata about the registry's current signing key (kid, created_at, public JWK fingerprint).

The actual signing key (private material) lives in Workers Secrets, not in KV. KV stores only public-readable artifacts.

## Algorithms

- **JWK Thumbprint:** RFC 7638 with SHA-384.
- **Snapshot signing:** ES384 (reference). Spec permits any algorithm in spec §4.2.
- **Snapshot signing cadence:** every 24 hours at 02:00 UTC.

## Compliance test vectors

To be published at `/spec/v0.1/test-vectors/kt/` before LIP-4 transitions to Final. Vectors will cover:

- Canonical entry construction (publisher-side): given a kid + private key + payload fields, produce the entry JWS.
- Registry validation (positive): a syntactically valid entry passes all 13 validation steps.
- Registry validation (negative): one negative vector per defined error code.
- Snapshot construction: given a log content and previous snapshot, produce the next snapshot JWS.
- Consumer X7 evaluation: given a registry response and a fetched llmo.json, evaluate X7 PASS / FAIL.

## Federation considerations (v0.2)

This API is designed to be implementable by multiple independent operators. A future v0.2 LIP will introduce cross-witness signing: each operator periodically signs the others' snapshot roots, and the consumer-side X7 check requires inclusion in at least N of M conforming logs. The wire format above does not change for federation; the consumer's policy about which registries to query changes.

Operators participating in v0.2 federation MUST:

- Serve this API at a stable base URL.
- Sign their own snapshots with their own ES384 (or other §4.2-permitted) key, publishing the public JWK at a stable JWKS endpoint.
- Periodically cross-sign the most recent snapshot of every other federated operator. The cross-signing format and cadence will be defined in the v0.2 LIP.

For v0.1.x, federation is roadmap, not requirement. The Diverse.org-operated registry at `https://llmo.org/kt/v1/` is the canonical and only conforming registry.
