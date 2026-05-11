# Phase 07: Key generation and custody

## Goal

Generate an ES256 keypair for the publisher. Walk them through storing the private key securely. Produce the public JWKS file ready for deployment.

## Inputs

- Confirmed `llmo-payload.json` (from phase 05, optionally updated in phase 06).
- The publisher's chosen `kid` (key identifier) convention. Default: `<short-org-handle>-<YYYY>-01` where `<short-org-handle>` is a stable identifier the publisher controls (often the primary domain without TLD, e.g., `diverse-2026-01` for diverse.org).

## Outputs

- Private key file in the working directory: `llmo-private-<kid>.pem` (or `.json` JWK format, depending on CLI version).
- Public JWKS file: `llmo-keys.json` in the working directory.
- A clear understanding by the publisher of where the private key now lives and how to retrieve it next quarter.

## Recipe

1. Confirm the algorithm. Default: ES256. Offer ES384 or EdDSA if the publisher has a specific reason (regulated industry preferring P-384; preference for Ed25519). Otherwise ES256.
2. Confirm the `kid`. Suggest the default (`<short-handle>-<YYYY>-01`); accept the publisher's override if they have an existing convention.
3. Run `llmo keygen --alg ES256 --kid <kid>` in the working directory.
4. Confirm the two output files exist:
   - `llmo-private-<kid>.pem` (or equivalent format)
   - `llmo-keys.json` (the public JWKS)
5. Compute the public-key SHA-256 fingerprint and show it to the publisher. They can write this down as a recovery primitive; it lets them confirm next quarter that the same key is being used.
6. Walk through custody options. The publisher picks one:
   - **1Password (recommended for most).** Create a secure note titled `LLMO ES256 signing key — <kid>`. Paste the private key file contents. Save. The publisher uses 1Password's existing access controls (master password + 2FA + emergency kit) for the key's security.
   - **AWS Secrets Manager / GCP Secret Manager / Azure Key Vault.** For publishers already using these. Create a secret named e.g. `llmo/signing-key/<kid>`; paste the private key contents. The skill notes the ARN/resource ID for next-quarter retrieval.
   - **Hardware token (YubiKey HSM, Apple Secure Enclave via a tool like ssh-tpm-agent, etc.).** Advanced. Out of scope for the skill's direct support; the publisher does this themselves and confirms when done.
   - **GitHub Actions secret.** If the publisher plans to automate quarterly rotation via GitHub Actions, paste the private key into the repo's Settings → Secrets → Actions as `LLMO_SIGNING_KEY`. The Action loads it at sign time.
   - **Plain file with `chmod 600`** (NOT recommended unless the publisher's threat model is small and their device is encrypted). The skill discourages this option and asks the publisher to confirm they understand the risk.
7. After the publisher confirms the private key is stored, **delete** the local copy from the working directory. The skill should never hold the private key after this point.
   - Concretely: `rm llmo-private-<kid>.pem`. Confirm deletion.
   - The `llmo-keys.json` public file stays — it's part of the deployment artifact.
8. Confirm next-quarter retrieval. Ask: "Where will you look for this key on `<today + 80 days>` when it's time to re-sign?" Get a concrete answer (e.g., "1Password under 'LLMO ES256 signing key — diverse-2026-01'"). Record this in a local note (`llmo-key-custody-note.txt` in the working directory) so the publisher has a written reminder.

## CLI calls

- `llmo keygen --alg ES256 --kid <kid>`.
- Optionally `llmo doctor` to confirm the generated keypair is well-formed.
- `shasum -a 256 llmo-keys.json` (or equivalent) for the public-key fingerprint.

## Defaults

- Algorithm: ES256.
- `kid` format: `<short-org-handle>-<YYYY>-01`. The trailing `-01` lets future rotations use `-02`, etc., without colliding.
- Custody: 1Password recommended; AWS/GCP/Azure for org-scale publishers; plain file discouraged.

## Decisions

- **One key, multiple claims, or per-function keys?** v0.1 supports per-claim signatures with different `kid`s, all in the same JWKS. For a first publish, one key is sufficient. Per-function keys (HR signs `personnel`, legal signs `disavowal`) is a v0.2-class advanced pattern; route to the spec [§4.3](https://llmo.org/spec/v0.1/#4-3-document-level-vs-claim-level-signing) if the publisher asks.
- **Rotation cadence.** v0.1 says rotate at least annually. The skill defaults to quarterly re-signing with the same key (same kid). Key rotation (new kid) happens annually or on compromise.
- **Key recovery.** If the publisher loses the private key, the skill cannot help recover it; they must generate a new keypair, publish the new public JWKS at the same `/.well-known/llmo-keys.json` URL, re-sign with the new key, and the old `kid` should remain in the JWKS for 90 days per spec §4.2 for cached-document verification.

## Failure modes

- **Publisher cannot or will not store the private key securely.** Stop the skill. The protocol's Strict tier requires a private key the publisher controls; without secure custody, the doc cannot be signed responsibly. Recommend they pause and revisit when custody is solved.
- **`llmo keygen` fails** (Node version, missing dependency). Confirm `llmo --version` is 0.1.8+; if so, fall back to a manual OpenSSL `ecparam` keygen and document the manual key in JWK format.
- **The publisher's chosen custody backend is misconfigured** (e.g., AWS Secrets Manager IAM denied). Pause until fixed; do not proceed with sign while the key is in an unstable location.
