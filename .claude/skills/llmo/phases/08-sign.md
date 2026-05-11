# Phase 08: Sign

## Goal

Sign the confirmed payload with the publisher's private key. Produce a signed `llmo.json` that passes `llmo verify` locally. Compute the `dns_corroboration` hash if the publisher opted into phase 06.

## Inputs

- Confirmed `llmo-payload.json` (from phase 05, possibly updated in phase 06).
- Publisher's private key, retrieved from the custody backend they chose in phase 07.
- `llmo-keys.json` (public JWKS) from phase 07.

## Outputs

- `llmo-signed.json` in the working directory: the signed document, ready for deployment.
- (If phase 06 was opted in) An updated TXT record value for `_llmo-corroboration.<primary_domain>` containing the hash of the signed document with `signature` stripped.

## Recipe

1. Ask the publisher to retrieve the private key from their custody backend. The skill provides the retrieval instructions for the option they chose in phase 07 (1Password: "open the secure note named `LLMO ES256 signing key — <kid>` and copy the private key contents"; AWS Secrets Manager: "fetch via `aws secretsmanager get-secret-value`"; etc.).
2. Have the publisher save the private key to a temporary local file in the working directory (e.g., `private-jwk-<kid>.json` or `private-<kid>.pem`). `chmod 600`. **The skill never reads the private key file contents; it only invokes the CLI on the path.**
3. Run `llmo sign llmo-payload.json --key <path-to-private-key> --kid <kid> --output llmo-signed.json`.
4. Verify the signed document locally against the public JWKS in the working directory:
   ```
   llmo verify llmo-signed.json --jwks llmo-keys.json
   ```
   Expected output: tier `strict` (or `standard` if the publisher opted out of signing the entire document; but in this phase we are signing, so strict).
5. If verification fails, do NOT proceed. Diagnose:
   - `signature valid: INVALID` → probably a key/payload mismatch; the kid in the protected header doesn't match a key in the JWKS, or the canonicalization is non-RFC-8785 (publisher's locally-built CLI uses a stale `canonicalize` package).
   - `signature valid: unverified` → JWKS not found or kid not found; verify both files exist and the kid strings match.
   - `tier: minimal` → schema validation failed; check the payload's structure against the v0.1.8 schema (the skill prints AJV's specific error path).
6. On verification PASS, **immediately**:
   - **Delete the local private key file** by passing the literal filename string that was emitted by `llmo keygen` in phase 07 (i.e. the same string used as `--key` in step 3 of this phase). Do **not** reconstruct the filename by re-templating `<kid>` or by globbing. Never invoke `rm` with a wildcard (`rm *.pem`, `rm llmo-private-*.pem`), with a relative path containing `..`, or with any path that was not previously written by the skill in this session. Confirm deletion by checking `ls <path>` returns no-such-file; if `ls` shows the file still present, do not proceed and surface the failure to the publisher.
   - Instruct the publisher: "The signed document is at `llmo-signed.json`. The private key has been removed from the working directory. The next time you sign (next quarter), retrieve it again from <custody location>."
7. If phase 06 was opted in, compute the `dns_corroboration` hash now:
   ```
   jq -c 'del(.signature)' llmo-signed.json | \
     openssl dgst -sha256 -binary | \
     basenc --base64url -w0 | tr -d '='
   ```
   Show the resulting hash to the publisher. The TXT record value is:
   ```
   v=1; alg=sha-256; hash=<that-value>
   ```
   Walk the publisher through updating the TXT record they set up in phase 06 (replace the placeholder value with this real hash). Wait for DNS propagation (or proceed and verify in phase 10).
8. Confirm `llmo-signed.json` exists and verifies. Move on to phase 09.

## CLI calls

- `llmo sign llmo-payload.json --key <path> --kid <kid> --output llmo-signed.json`.
- `llmo verify llmo-signed.json --jwks llmo-keys.json` (for local verification).
- `jq`, `openssl dgst`, `basenc` (POSIX or coreutils) for `dns_corroboration` hash computation.
- `rm <private-key-path>` for cleanup.

## Defaults

- Document-level signature only on first publish. Per-claim signatures are a power-user feature; offered in phase 04 if the publisher wants finer-grained attribution.
- Hash algorithm for `dns_corroboration`: sha-256.

## Decisions

- **Per-claim signing.** If the publisher elected per-claim signing for one or more claims (collected in phase 04), the `llmo sign` call uses `--claim <claim_id>` flags per the CLI's documented per-claim flow. The skill walks through each per-claim sign sequentially; each per-claim signature uses a key (often the same one, possibly a different kid for organizational-function attribution per spec §4.4).
- **Key never read by skill.** The skill's contract is that it invokes `llmo sign` with a path to the key. It does not open the file. This keeps the trust boundary explicit and matches the existing signing-ceremony procedure documented in `infrastructure/SIGNING-CEREMONY.md` on llmo.org.

## Failure modes

- **`llmo sign` returns a non-zero exit code.** Read the error; common causes: malformed key, kid mismatch, schema-invalid payload. Diagnose with the specific error; do not retry blindly.
- **Local verify fails after a successful sign.** The most common cause is a JCS canonicalization implementation mismatch between sign and verify paths. Confirm both are running the same `llmo` CLI version. If they are and verification still fails, the document or key is corrupt; regenerate from the most recent confirmed payload.
- **Publisher leaves the private key in the working directory.** The skill MUST delete it on success. Confirm deletion (`ls <path>` returns "no such file") before declaring the phase complete.
