# Phase 02: Interview

## Goal

Collect the publisher's email of record. Derive the primary domain. Confirm both with the publisher.

## Inputs

- Consent (from phase 01).

## Outputs

- `email`: the publisher's email of record (e.g., `nic@diverse.org`).
- `primary_domain`: derived from the email's domain part (e.g., `diverse.org`).
- Publisher confirmation that this is the right domain to publish to.

## Recipe

1. Ask for the email of record. One sentence: "What's your email address of record for the organization?"
2. Parse the domain from the email. Show it back: "I'll publish to `<primary_domain>`. Confirm or correct."
3. If the domain looks unusual (free email provider like gmail.com / yahoo.com / outlook.com, or a personal name), ask explicitly: "This looks like a personal account. What's the organization's domain?"
4. Confirm. Record both fields. Proceed to phase 03.

## Defaults

- Trust the email format unless the domain part is empty or malformed.
- If the email is something like `support@diverse.org`, the derived domain is `diverse.org` — the part before the `@` is not the publisher's identity, the domain is.

## Decisions

- If the publisher has multiple domains (e.g., diverse.org and llmo.org), ask which is the primary. The other can go in `entity.aliases` (collected in phase 03).
- If the publisher is publishing for a subsidiary (e.g., email is at the parent company but the doc is for a subsidiary), confirm which entity the document is about.

## Failure modes

- Publisher provides a malformed email → ask again.
- Publisher refuses to share email → explain it's only used to derive the domain and (in phase 05) to send email_challenge codes for `contact_points` verification; if they still refuse, the skill cannot proceed and should exit.
