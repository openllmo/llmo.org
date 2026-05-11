# Phase 05: Verify contact points (optional)

## Goal

For each `contact_points` entry the publisher wants verified (flagged in phase 04), perform an `email_challenge` and update the entry's `verification_status` accordingly. Leave entries the publisher did not flag as `unverified`.

## Inputs

- Confirmed `llmo-payload.json` (from phase 04).
- Per-entry verification preferences (from phase 04).

## Outputs

- `llmo-payload.json` updated in place with `verification_status: verified` plus `verification_method`, `verification_proof`, `verified_at` on entries that successfully completed the challenge.

## Recipe (v0: manual verification, no hosted SMTP)

For each `contact_points` entry the publisher wants verified (only `type: support`, `security`, `abuse`, `legal`, `press`, `billing` — email-shaped addresses; `phone` and `messaging` are out of scope for v0 email_challenge):

1. Generate a random 16-byte challenge code (base32 for human-readable). Example: `KVXQ-7N3M-PA2J-WLR4`.
2. Show the code to the publisher and instruct: "Send an email FROM `<address>` to `<their-own-other-email>` with the subject `LLMO challenge <code>`. Then tell me the message-id or paste a screenshot."
3. Ask the publisher for the message-id (the `Message-ID:` header value from the sent email). This is the proof artifact.
4. Validate the proof (basic shape check; the skill cannot verify SMTP delivery in v0).
5. On valid proof: update the entry:
   - `verification_method: "email_challenge"`
   - `verification_status: "verified"`
   - `verification_proof: "<challenge-code>:<message-id>"`
   - `verified_at: "<RFC 3339 timestamp>"`
6. On invalid proof or refusal: leave `verification_status: unverified`. Do not block phase progression.

## CLI calls

- None in v0. The skill uses the Write tool to update the payload file.

## Hosted-SMTP alternative (when llmo.com web wizard exists)

When Greyfront's hosted backend is available:
1. The wizard mints a challenge code per address.
2. Wizard backend sends an actual email FROM `verify@llmo.org` TO `<address>` containing the code.
3. Publisher receives the email, copies the code, pastes it into the wizard.
4. Backend compares the pasted code to the minted one; on match, marks verified.

The hosted version is materially better than the v0 self-verification because the proof is a wizard-mediated round-trip rather than a publisher-asserted message-id. Document this delta in the published doc's `provenance_markers` (`source:llmo-skill-v0-manual` vs `source:llmo-wizard-hosted-smtp`) so downstream consumers can weight accordingly.

## Defaults

- Verification is opt-in per entry. The default for any entry the publisher does not flag is `unverified` — honest about state, no over-claiming.
- Challenge code TTL is the current phase. The skill does not persist challenges across sessions.

## Decisions

- **What counts as proof in v0.** A publisher-pasted Message-ID header value, with the challenge code in the email subject line. Weak (the publisher can fabricate this), but better than nothing and clearly attributed via `provenance_markers`.
- **Phone / messaging types.** Leave as `unverified` in v0. Phone-based challenge codes (SMS, voice) require carrier infrastructure; messaging (Slack DM, WhatsApp, Telegram) varies per platform. Out of scope.
- **Re-verification cadence.** None enforced. A verified entry stays verified for the document's `valid_until`. Next quarterly rotation re-runs phase 05.

## Failure modes

- **Publisher can't access the mailbox.** Mark the entry `unverified` with `provenance_markers` noting `verification-deferred:no-mailbox-access`. Move on.
- **Publisher's email is hosted in a way that doesn't expose Message-ID** (some web mail clients hide headers). Provide alternate instructions for showing headers per common clients (Gmail, Outlook, Apple Mail) or accept a screenshot of the sent email's headers.
- **Publisher misuses the challenge code** (uses the same one for two addresses, etc.). Issue a fresh code per address; reject reuse.
