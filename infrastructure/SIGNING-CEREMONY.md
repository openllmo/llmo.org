# llmo.json signing ceremony

This document captures the procedure for signing Diverse.org's `llmo.json` under the LLMO v0.1 spec. The ceremony must be re-performed every ~90 days, when the document's `valid_until` date approaches.

## Key custody

Private key file (current ceremony): `~/llmo-key-ceremony-2026-04-26/private-jwk-diverse-2026-01.json`

This file MUST be:

- Backed up to operator's password manager (1Password) immediately after generation.
- Restricted to `chmod 600`.
- Never committed to any repository.
- Never shared via email, chat, or unencrypted channels.

Future plan: migrate to AWS KMS for hardware-backed key custody once Diverse.org's AWS account is provisioned. v0.1 launch uses a local file with password-manager backup as the practical custody mechanism.

## Key identity

- **Algorithm:** ES256 (ECDSA on P-256 with SHA-256)
- **Key ID:** `diverse-2026-01`
- **Generated:** 2026-04-26
- **Public JWKS:** published at `https://llmo.org/.well-known/llmo-keys.json`

When generating the next key (likely `diverse-2026-02` or `diverse-2027-01`), include both keys in the JWKS for a transition period so consumers caching the old `kid` can still verify until they re-fetch.

### Public key SHA-256 fingerprint

Anyone verifying signed `llmo.json` files can match this fingerprint against the JWKS served at `llmo.org/.well-known/llmo-keys.json`:

```
e10dee7e0b32406d0222af90e44973aeae65823cd07313f2ce0e6125abbfacba
```

Computed over the canonical JSON serialization of the public JWK (`crv`, `kid`, `kty`, `x`, `y`, sorted keys, no whitespace).

## Signing procedure (re-running the ceremony)

1. Open Claude Code in this repo.
2. Refer to this document.
3. Working directory: `~/llmo-key-ceremony-YYYY-MM-DD/` (a new dated dir for each ceremony).
4. Copy the existing `private-jwk-diverse-2026-01.json` from the password manager into the new ceremony dir, OR generate a new keypair if rotating.
5. Update `llmo-payload.json` with new `valid_from`, `valid_until`, and any changed claims (board roster, products, etc.).
6. Increment `document_id` (e.g., `2026-q3-routine`).
7. Run `sign.py`. Run `verify.py`. Confirm verification passes against the public JWKS only.
8. Copy `llmo-signed.json` to `static/.well-known/llmo.json` in the repo.
9. Commit and push. Cloudflare Pages auto-deploys.
10. Verify live: `curl https://llmo.org/.well-known/llmo.json | jq` and run the verify script against the live URL.
11. Validate against https://llmo.org/validator/.

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
~/llmo-key-ceremony-2026-04-26/
├── private-jwk-diverse-2026-01.json   (chmod 600; backed up to password manager)
├── public-jwk-diverse-2026-01.json    (public; identical content to JWKS entry)
├── jwks.json                          (public; copied to static/.well-known/llmo-keys.json)
├── llmo-payload.json                  (unsigned; the document being signed)
├── llmo-signed.json                   (signed; copied to static/.well-known/llmo.json)
├── sign.py                            (the signing script)
└── verify.py                          (the public-only verification script)
```

The ceremony directory lives outside the repository to keep the private key out of `git` accidentally. Only `jwks.json` and `llmo-signed.json` are copied into the repo.

## Re-anchoring constraint

Editing `static/.well-known/llmo.json` after publication invalidates the signature. Re-signing requires the private key. Any changes to the document must go through the ceremony, not through hand-editing.

## Ceremony log

- **2026-04-26 v1** (`~/llmo-key-ceremony-2026-04-26/`): initial signing. Failed Standard tier S3 (`primary_domain="diverse.org"` did not match the serving domain `llmo.org`) and S4 (chairman `verification` URL pointed at `github.com`, a third-party domain not in the owned set). Document at this version was published briefly under commit 6778b88 but failed validator checks.
- **2026-04-26 v2** (`~/llmo-key-ceremony-2026-04-26-v2/`): re-signed with corrected payload. `primary_domain="llmo.org"`; aliases now `["diverse.org", "kbp.org", "emerging.org"]`. Chairman `verification` URL removed pending `https://diverse.org/about/leadership` (Priority 14c). Same key (`kid: diverse-2026-01`), same `valid_from`/`valid_until` window. Canonicalized payload size: 1778 bytes (was 1826 in v1).
- **2026-04-30 v3** (`~/llmo-key-ceremony-2026-04-30/`): re-signed to align with v0.1.2 spec changes. `document_id="2026-q2-revision-1"`. Validity window unchanged (2026-04-26 → 2026-07-26). Changes: kbp.org removed from `entity.aliases` (now `["diverse.org", "emerging.org"]`); KBP product entry removed from `products-current` (LLMO and Emerging.org Podcast remain); `personnel.spokespeople` chairman entry gains `verification: "https://github.com/thegigachav"`; disavowal `unaffiliated_domain` detail string updated to v0.1.2 impersonation-defense wording per §3.5. Same key (`diverse-2026-01`), same validity window. Canonical payload size: 1850 bytes.

When re-signing in 90 days for the next quarterly window, copy the v2 ceremony's `sign.py`/`verify.py` (already retargeted to `*-v2`) into a new dated ceremony directory, retarget the `CEREMONY_DIR` constant once more, and update `valid_from`/`valid_until` and `document_id` in the new payload.
