# llmo.json signing ceremony

This document captures the procedure for signing llmo.org's `/.well-known/llmo.json` under the LLMO v0.1 spec. The ceremony must be re-performed every ~90 days, when the document's `valid_until` date approaches.

The LLMO protocol is stewarded by Nicholas Chavez as an individual ([ADR-0014](/adr/0014-single-steward-individual/)); the entity named in the signed document is `Nicholas Chavez`. Previously the document named `Diverse.org, Inc.` and was signed under `diverse-2026-01` / `diverse-2026-02` keys; those keys are retired and the new keys are issued under a non-entity-tied `kid` prefix.

## Key custody

Private key file (current ceremony): `~/llmo-key-ceremony-2026-05-01/private-jwk-diverse-2026-01.json`

This file MUST be:

- Backed up to operator's password manager (1Password) immediately after generation.
- Restricted to `chmod 600`.
- Never committed to any repository.
- Never shared via email, chat, or unencrypted channels.

Future plan: migrate to AWS KMS or an equivalent hardware-backed key custody provider once the steward's AWS account is provisioned. v0.1 launch uses a local file with password-manager backup as the practical custody mechanism.

## Key identity

- **Algorithm:** ES256 (ECDSA on P-256 with SHA-256)
- **Active `kid`:** `llmo-steward-2026-10` (generated 2026-10-22 during the ADR-0014/0015 transition ceremony; see "Ceremony log" below)
- **Retired `kid`s (kept in JWKS during transition):** `diverse-2026-01`, `diverse-2026-02` (associated with the former Diverse.org-named entity; retired as of 2026-10-22 per ADR-0014)
- **Public JWKS:** published at `https://llmo.org/.well-known/llmo-keys.json`

Rotation convention: when generating the next key, include both the new and the previous key in the JWKS for a transition period so consumers caching the old `kid` can still verify until they re-fetch. After one full validity window has elapsed with no verifications against the retired `kid`, remove it from the JWKS.

### Public key SHA-256 fingerprints

Anyone verifying signed `llmo.json` files can match these fingerprints against the entries carried in the JWKS at `llmo.org/.well-known/llmo-keys.json`:

```
d077c92f05eda4a9665e6468969f24ec1129236c078f2807e863fc977c8b6c5f   # llmo-steward-2026-10 (active)
e10dee7e0b32406d0222af90e44973aeae65823cd07313f2ce0e6125abbfacba   # diverse-2026-01 (retired)
```

Computed over the canonical JSON serialization of the public JWK (`crv`, `kid`, `kty`, `x`, `y`, sorted keys, no whitespace).

## Signing procedure (re-running the ceremony)

1. Open Claude Code in this repo.
2. Refer to this document.
3. Working directory: `~/llmo-key-ceremony-YYYY-MM-DD/` (a new dated dir for each ceremony).
4. Copy the active private JWK (currently to be `private-jwk-llmo-steward-2026-10.json` after the ADR-0014 transition) from the password manager into the new ceremony dir, OR generate a new keypair if rotating. For the ADR-0014 transition ceremony, generate a new keypair under a non-Diverse `kid` and retire the former `diverse-2026-01` / `diverse-2026-02` private keys from active use (keep public keys in JWKS for the transition window).
5. Update `llmo-payload.json` with new `valid_from`, `valid_until`, and any changed claims (board roster, products, etc.). If the ceremony includes per-claim signing, set `TARGETS_FOR_PER_CLAIM_SIGNING` in `sign.py` with the target `claim_id`s (per spec §4.3 / §5.3 X6).
6. Increment `document_id` (e.g., `2026-q3-routine`).
7. Run `sign.py` (per-claim signing pass runs first if any targets are listed, then document-level signing covers the augmented payload). Run `verify.py` (verifies per-claim signatures first, then document-level). Confirm verification passes against the public JWKS only.
8. Copy `llmo-signed.json` to `static/.well-known/llmo.json` in the repo.
9. Commit and push. Cloudflare Pages auto-deploys.
10. Verify live: `curl https://llmo.org/.well-known/llmo.json | jq` and run the verify script against the live URL.
11. Validate against https://llmo.org/validator/. Confirm Strict tier including X6 PASS for any per-claim signatures.

## Validity windows

- **v0.1 launch:** 90-day windows (quarterly cadence).
- Future v0.2+ may revise this. The spec defines validity but not re-signing cadence; the org's policy can be tighter than the spec maximum.

## On the JCS canonicalization detail

The minimal JCS implementation in `sign.py` uses:

```python
json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
```

This is RFC 8785-compliant for payloads using only strings, integers, booleans, arrays, and objects (no floats, no special number cases). Our `llmo.json` conforms; if future payloads include floats, the JCS implementation must be replaced with a full RFC 8785 number formatter.

## Files in this ceremony

```
~/llmo-key-ceremony-YYYY-MM-DD/
├── private-jwk-<kid>.json             (chmod 600; backed up to password manager)
├── public-jwk-<kid>.json              (public; identical content to JWKS entry)
├── jwks.json                          (public; copied to static/.well-known/llmo-keys.json)
├── llmo-payload.json                  (unsigned; the document being signed)
├── llmo-signed.json                   (signed; copied to static/.well-known/llmo.json)
├── sign.py                            (the signing script)
└── verify.py                          (the public-only verification script)
```

For the ADR-0014 transition ceremony, `<kid>` is `llmo-steward-2026-10`. For historical reference, the prior ceremonies used `diverse-2026-01` and `diverse-2026-02`.

The ceremony directory lives outside the repository to keep the private key out of `git` accidentally. Only `jwks.json` and `llmo-signed.json` are copied into the repo.

## Re-anchoring constraint

Editing `static/.well-known/llmo.json` after publication invalidates the signature. Re-signing requires the private key. Any changes to the document must go through the ceremony, not through hand-editing.

## Ceremony log

- **2026-04-26 v1** (`~/llmo-key-ceremony-2026-04-26/`): initial signing. Failed Standard tier S3 (`primary_domain="diverse.org"` did not match the serving domain `llmo.org`) and S4 (chairman `verification` URL pointed at `github.com`, a third-party domain not in the owned set). Document at this version was published briefly under commit 6778b88 but failed validator checks.
- **2026-04-26 v2** (`~/llmo-key-ceremony-2026-04-26-v2/`): re-signed with corrected payload. `primary_domain="llmo.org"`; aliases now `["diverse.org", "kbp.org", "emerging.org"]`. Chairman `verification` URL removed pending `https://diverse.org/about/leadership` (Priority 14c). Same key (`kid: diverse-2026-01`), same `valid_from`/`valid_until` window. Canonicalized payload size: 1778 bytes (was 1826 in v1).
- **2026-04-30 v3** (`~/llmo-key-ceremony-2026-04-30/`): re-signed to align with v0.1.2 spec changes. `document_id="2026-q2-revision-1"`. Validity window unchanged (2026-04-26 → 2026-07-26). Changes: kbp.org removed from `entity.aliases` (now `["diverse.org", "emerging.org"]`); KBP product entry removed from `products-current` (LLMO and Emerging.org Podcast remain); `personnel.spokespeople` chairman entry gains `verification: "https://github.com/thegigachav"`; disavowal `unaffiliated_domain` detail string updated to v0.1.2 impersonation-defense wording per §3.5. Same key (`diverse-2026-01`), same validity window. Canonical payload size: 1850 bytes.
- **v4 (2026-05-05)** (`~/llmo-key-ceremony-2026-05-01/`): out-of-cadence ceremony driven by v0.1.5 spec changes. `document_id="2026-q2-revision-2"`, `valid_from="2026-05-01"`, `valid_until="2026-07-26"` (preserves v3 cadence). The validity window's `valid_from` is intentionally backdated to the start of the month, four days before the ceremony executed; this is permitted under §3.3 and means the document is more conservative about its own freshness, not less. The ceremony directory name `~/llmo-key-ceremony-2026-05-01/` reflects the date the ceremony was originally planned to start; the actual signing executed 2026-05-05. `disavowal-affiliations` claim gains a per-claim signature, demonstrating the new X6 strict-tier rule end-to-end against the live document. Same key as v1-v3 (no rotation). Canonical payload sizes: 2032 bytes (document-level), 442 bytes (disavowal claim per-claim signature).

### v5 (ADR-0014/0015 transition, 2026-10-22) (`~/llmo-key-ceremony-2026-10/`)

Executed as part of the ADR-0014 + ADR-0015 stewardship withdrawal. The prior document's `valid_until` had already expired on 2026-07-26 (overdue), so the ceremony also restored Strict-tier conformance.

- **New keypair** generated under `kid: "llmo-steward-2026-10"` (ES256 on P-256). Public key fingerprint `d077c92f05eda4a9665e6468969f24ec1129236c078f2807e863fc977c8b6c5f`. Private key held at `~/llmo-key-ceremony-2026-10/private-jwk-llmo-steward-2026-10.json` (chmod 600) and must be backed up to the operator's password manager.
- **Retired keys** `diverse-2026-01` and `diverse-2026-02` remain in `static/.well-known/llmo-keys.json` for the transition window. Their private counterparts are no longer used for signing. After one full validity cycle (post 2027-01-20) with no verifications against the retired `kid`s observed, prune them from the JWKS.
- **New entity block.** `entity.name = "Nicholas Chavez"`, `entity.primary_domain = "llmo.org"`. No `legal_identifiers` (no 501(c)(3) EIN or state registration under individual stewardship). No `aliases` naming diverse.org / emerging.org.
- **`supersedes` chain.** Top-level `supersedes: ["2026-q2-revision-4"]` records the retirement of the prior Diverse.org-named document.
- **Claims.** `identity`, `canonical_urls`, `official_channels`, `product_facts` (LLMO spec + validator + CLI), `personnel` (single `steward` entry naming Nicholas Chavez), `disavowal` (impersonation-defense entry disavowing third-party claims that LLMO is stewarded by Diverse.org or any other named entity).
- No per-claim signing in this cut. Any sensitive claim worth a per-claim signature is instead expressed in the document-level signature.
- `document_id = "2026-q4-revision-1"`, `valid_from = 2026-10-22T00:00:00Z`, `valid_until = 2027-01-20T00:00:00Z` (90-day window).
- Canonical payload size: 1693 bytes (document-level).
- Signed artifact deployed to `static/.well-known/llmo.json`; updated JWKS deployed to `static/.well-known/llmo-keys.json`.
- Verified against the public JWKS using only public key material (`verify.py`) before commit.

When re-signing in 90 days for the next quarterly window, copy this ceremony's `sign.py`/`verify.py` into a new dated ceremony directory, retarget the `CEREMONY_DIR` constant, and update `valid_from`/`valid_until` and `document_id` in the new payload.
