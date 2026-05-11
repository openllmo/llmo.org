# Phase 05: Verify domain and contact points

## Goal

Prove the publisher controls each domain referenced by `contact_points` entries. One DNS TXT record per domain serves as both the domain-control proof (Google Workspace pattern) and the transitive proof that the publisher controls every email address at that domain. Mark verifiable entries `verified` with `verification_method: dns_txt`; leave addresses at unverifiable domains as `unverified`.

The skill does not deliver email and does not use `email_challenge` in v0. SMTP delivery from a local Claude Code session is not viable; pretending otherwise produces fabricable proofs. The schema's `verification_method` enum already includes `dns_txt`, which is the right tool here.

## Inputs

- Confirmed `llmo-payload.json` (from phase 04), containing one or more `contact_points` entries with email-shaped addresses (`type: support | security | abuse | legal | press | billing`).
- Working-directory state (`llmo-publish-<YYYY-MM-DD>/`). The skill checks for a previously-stored verification token (`verify-token.txt`) before minting a new one.

## Outputs

- `llmo-payload.json` updated in place with `verification_method`, `verification_status`, `verification_proof`, `verified_at` on each verifiable contact point.
- `verify-token.txt` in the working directory, containing the verification token(s) and the domain(s) they apply to, for reuse on next quarterly rotation.

## Recipe

1. Walk the `contact_points` array and collect the unique set of email-address domains. Example:
   - `security@llmo.org`, `press@llmo.org` → domain `llmo.org`
   - `contact@diverse.org` → domain `diverse.org`
   - `hello@somebodyelses.com` → domain `somebodyelses.com` (third-party — flag and skip later)

2. For each unique domain:

   1. Check `verify-token.txt` for an existing token. If present and the publisher confirms it's still valid (the TXT record is still in DNS), reuse it; skip to step 5.
   2. Otherwise mint a fresh 32-character base64url token. Example: `llmo-verify=KVXQ7N3MPA2JWLR4tF6sH9bZmYpQc1xVnEdR8aGuT3w`.
   3. Show the token to the publisher and instruct: "Add a DNS TXT record at `_llmo-verify.<domain>` with value `llmo-verify=<token>`. The skill will verify when it's propagated."
   4. Walk through DNS provider instructions (Cloudflare, Route53, Namecheap, GoDaddy, BIND, etc. — same provider-specific block as phase 06 reuses).
   5. Poll DNS until the record appears, with a reasonable timeout:
      ```
      dig +short TXT _llmo-verify.<domain>
      ```
      Expected: the value `llmo-verify=<token>` appears in the output (DNS returns TXT values quoted; strip quotes for comparison). Retry with backoff (start 30s, double each retry, cap at 300s, give up after 15 minutes total).
   6. On match: this domain is verified for the current session. Record `(domain, token, verified_at)` in `verify-token.txt`.

3. For each `contact_points` entry whose address is at a verified domain, update:
   - `verification_method: "dns_txt"`
   - `verification_status: "verified"`
   - `verification_proof: "<token>"` (the same token the publisher published in DNS; the spec's `verification_proof` is opaque, and storing the TXT value is the standard pattern)
   - `verified_at: "<RFC 3339 timestamp at which the dig succeeded>"`

4. For each `contact_points` entry whose address is at an **unverified** domain (publisher could not or chose not to add a TXT record), leave `verification_status: unverified` and omit `verification_method`, `verification_proof`, `verified_at`. The schema permits this state.

5. For each `contact_points` entry whose address is at a **third-party** domain the publisher does not control (e.g., a relay address at a service the publisher does not own): the publisher cannot prove control via DNS. Leave `verification_status: unverified` with a `provenance_markers` note recording why (`verification-skipped:third-party-domain`).

6. Confirm with the publisher: show the updated contact_points list with verified/unverified status per entry. Move on to phase 06.

## CLI calls

- `dig +short TXT _llmo-verify.<domain>` (preferred). On systems without `dig`, fall back to `nslookup -type=TXT _llmo-verify.<domain>` or a one-line `node -e "require('dns').promises.resolveTxt(...)..."` invocation.
- No SMTP, no `mail`, no `sendmail` invocations.

## Defaults

- Verification is opt-in per domain at first onboarding. If the publisher declines to add the TXT record, all entries at that domain remain `unverified` — honest about state. The skill does not block phase progression on this.
- The verification token is persistent across rotations (same domain → same token, reused). The publisher does not re-add the record at next quarterly sign; the skill just re-checks that it's still there.

## Decisions

- **`email_challenge` retired in v0.** Schema retains it as an enum value for future hosted-SMTP flows (the planned llmo.com web wizard, or future skill versions that have a delivery backend). The v0 Claude Code skill uses `dns_txt` exclusively.
- **Token persistence.** A token is born from the publisher's perspective when they first publish it in DNS. Next rotation, the same token still verifies. New tokens are minted only if the publisher rotates their own DNS (rare) or invokes the skill from a fresh working directory with no `verify-token.txt`.
- **One token per domain, not per address.** A single TXT record proves control of the domain, which transitively proves control of every email address at that domain. Adding a separate TXT per address would be busywork with no security benefit.
- **What about `phone` and `messaging` contact points?** Out of scope for the v0 skill's verification. SMS / WhatsApp / Telegram / Signal verification requires per-platform infrastructure. Leave those entries as `unverified` with a `provenance_markers` note.

## Failure modes

- **DNS not propagating.** Some providers and resolvers cache TXT lookups aggressively. If the record doesn't appear after 15 minutes of polling, give the publisher the option to: (a) wait longer and re-invoke `/llmo` later, (b) skip this domain's verification for now (entries stay `unverified`), (c) confirm the record was actually added (typo in the host name `_llmo-verify` is common).
- **Publisher doesn't have DNS admin access.** Same answer as phase 06: identify whoever does, or skip verification for that domain.
- **Provider doesn't accept underscore-prefixed records.** Rare. Some legacy providers strip `_` from the host name and substitute the apex. If `_llmo-verify.<domain>` won't resolve, fall back to a TXT record at `llmo-verify.<domain>` (no leading underscore) and document the deviation in the entry's `provenance_markers`.
- **Token leak.** A verification token is public in DNS by design; it carries no secret value. Leakage is not a concern. The token's purpose is to prove the publisher chose this specific value, not to keep it confidential.
