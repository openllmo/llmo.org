# Phase 06: DNS corroboration (optional)

## Goal

If the publisher wants the v0.1.8 `dns_corroboration` field populated, walk them through publishing a DNS TXT record holding a hash of the canonical signature-stripped document. This is an out-of-band integrity check a consumer can perform without trusting the JWKS infrastructure.

## Inputs

- Confirmed `llmo-payload.json` (from phase 05).
- The publisher's DNS provider (Cloudflare, Route53, Google DNS, Namecheap, GoDaddy, etc.).

## Outputs

- A TXT record live at `_llmo-corroboration.<primary_domain>` containing the corroboration value.
- `llmo-payload.json` updated with `dns_corroboration: { txt_record: "_llmo-corroboration.<primary_domain>", hash_alg: "sha-256" }`.

## Wire format (this phase defines it for v0)

The TXT record value is a semicolon-separated list of `key=value` pairs:

```
v=1; alg=sha-256; hash=<base64url-no-padding>
```

- `v`: version (always `1` for now).
- `alg`: hash algorithm (`sha-256`, `sha-384`, or `sha-512`; matches the `hash_alg` enum in the v0.1.8 schema's `dns_corroboration` field).
- `hash`: base64url-encoded (no padding) digest of the JCS-canonicalized document with its top-level `signature` field removed. **Computed at phase 08 time, AFTER signing, against the signed document with signature stripped.** (Stripping signature avoids the chicken-and-egg: the hash must match the served document's pre-signature canonical form.)

A consumer corroborates by:
1. Fetching `https://<domain>/.well-known/llmo.json`.
2. JCS-canonicalizing it with the top-level `signature` field removed.
3. Hashing per the declared `alg`.
4. Base64url-encoding (no padding) and comparing to the TXT record's `hash` value.

If they match, the document served at the well-known location is byte-for-byte the same one whose hash the publisher asserted via DNS — a second independent surface attesting to the same content. This catches CDN content rewriting, file substitution at the hosting layer, and similar attacks that would not break the JWS signature (because they happen after publication).

## Recipe

1. Ask: "Do you want to publish a `dns_corroboration` TXT record? It's optional. The benefit: any consumer can confirm the file at your `/.well-known/` URL hasn't been altered by your CDN or hosting platform, without trusting the JWKS chain. The cost: one TXT record to set up and update each rotation."
2. If no, skip the phase. Remove the `dns_corroboration` field from the payload if it was speculatively included.
3. If yes:
   - Note: the actual hash will be computed in phase 08 (after signing). For now, plan the TXT record placement.
   - Add `dns_corroboration: { txt_record: "_llmo-corroboration.<primary_domain>", hash_alg: "sha-256" }` to the payload.
   - Identify the publisher's DNS provider. Branch instructions:
     - **Cloudflare:** Dashboard → DNS → Records → Add record. Type: TXT. Name: `_llmo-corroboration` (Cloudflare auto-appends the domain). Content: (provided after phase 08). TTL: Auto.
     - **Route53:** Hosted zones → `<domain>` → Create record. Record name: `_llmo-corroboration.<domain>`. Record type: TXT. Value: (provided after phase 08). TTL: 300.
     - **Google Domains / Cloud DNS:** Similar pattern.
     - **Namecheap / GoDaddy / Hover / Porkbun:** Domain advanced DNS → Add TXT record at host `_llmo-corroboration`.
     - **Other / self-hosted (BIND, etc.):** Add to zone file: `_llmo-corroboration.<domain>. IN TXT "v=1; alg=sha-256; hash=<value>"`.
   - Confirm with the publisher that they have admin access to add records. If not, identify who does and pause.
4. Return to this phase after phase 08 (signing) to plug in the actual hash value. (The orchestrator handles this loop-back; this phase file just describes the placeholder setup.)
5. After the publisher inserts the TXT record post-phase-08, verify:
   ```
   dig +short TXT _llmo-corroboration.<primary_domain>
   ```
   Confirm the value matches what the publisher inserted. Note DNS propagation can take up to TTL seconds.

## CLI calls

- `dig` (or `nslookup` as fallback) for TXT record verification.
- The `llmo` CLI does not currently have a `corroboration` subcommand; the skill computes the hash inline using Node.js or a one-line `openssl dgst -sha256 -binary <(jq -c 'del(.signature)' llmo-signed.json) | basenc --base64url -w0 | tr -d '='` shell pipeline.

## Defaults

- `hash_alg: "sha-256"`. Other values (`sha-384`, `sha-512`) are permitted by the schema; sha-256 is the default unless the publisher has a specific reason.
- TXT record TTL: whatever the provider's default is (usually 300-3600 seconds). Lower TTL means faster propagation of future rotations.

## Decisions

- **Skip by default.** Most publishers will not enable `dns_corroboration` on first deploy. The doc-level signature is sufficient for the protocol's trust model. DNS corroboration is for publishers who care about CDN-substitution attacks specifically.
- **Wire format ownership.** This phase file defines the v=1 wire format. Document the choice in `provenance_markers` on the `dns_corroboration` field, and file a project issue or LIP to formalize the wire format in a future patch.
- **Hash update cadence.** Every time the publisher re-signs (quarterly), the hash changes. Update the TXT record in the same rotation; otherwise the corroboration check fails and consumers see the discrepancy.

## Failure modes

- **Publisher has no DNS admin access.** They identify whoever does and either pause or skip the phase.
- **Provider doesn't support TXT records at underscore-prefixed names.** Rare but happens with some legacy providers. Skip the phase; document in the doc's `provenance_markers` that DNS corroboration was attempted but the provider blocked it.
- **TXT record not propagating after a reasonable wait** (5-10 minutes for most providers). Continue without verification; flag in phase 10's report so the publisher can re-check after the TTL settles.
