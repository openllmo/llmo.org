# Phase 04: Review draft

## Goal

Walk the publisher through the draft `llmo-payload.json` claim by claim. Accept corrections. Add or remove claims at their direction. End the phase with a draft both parties are confident in.

## Inputs

- `llmo-payload.json` (from phase 03).
- The "fields needing review" list (also from phase 03).

## Outputs

- Confirmed `llmo-payload.json`, ready for phase 05.
- A flag for each `contact_points` entry indicating whether the publisher wants email_challenge verification in phase 05.

## Recipe

1. Summarize the draft in compact form, not raw JSON. One bullet per claim, naming the type and the headline values. Example:
   - "**identity**: founded 2024-05, headquartered in Santa Clara CA, US, described as 'California 501(c)(3) nonprofit stewarding open protocols for organizational identity in the AI era.'"
   - "**canonical_urls**: homepage https://diverse.org, docs https://llmo.org/spec, security https://diverse.org/.well-known/security.txt."
   - "**categories**: primary https://schema.org/NGO, NAICS 813990."
2. For each claim, ask one of: "yes (keep as drafted) / edit / remove." Accept natural-language corrections ("change the founded year to 2023" or "remove the location, we don't have a physical HQ").
3. After every claim has been confirmed, ask about claims the skill could not derive:
   - **`personnel`**: "Do you want to declare spokespeople — leadership, press contacts, technical leads — and the URLs that corroborate their roles?" Only ask once; if yes, walk through entries.
   - **`disavowal`**: "Are there domains, accounts, or attributions you publicly repudiate? Often skipped on first publish."
   - **`supersedes`**: "Are there prior URLs or documents you want to mark as no longer authoritative? Often skipped on first publish."
   - **`contact_points`** verification preference: for each entry already drafted, ask "Verify <address> by email_challenge in the next step, or leave as unverified?"
4. If the publisher requests a claim type that doesn't exist in v0.1.8, route them to the namespaced extension form (`<their-namespace>.custom_claim`) and capture the value.
5. Re-serialize `llmo-payload.json` with corrections applied. Update `provenance_markers` on edited claims to add `human-reviewed:<YYYY-MM-DD>`.
6. Show the final structure to the publisher (compact again). Confirm "ready to verify and sign?"

## CLI calls

- None directly. The skill edits `llmo-payload.json` in place using the Edit/Write tools.

## Defaults

- Leave `confidence: authoritative` on every claim unless the publisher explicitly downgrades. Provisional/advisory are exceptional.
- If the publisher adds claims that include URLs, validate those URLs resolve before accepting them.
- For `contact_points` entries the publisher does not want verified, leave `verification_status: unverified` and omit `verification_method`, `verification_proof`, `verified_at`.

## Decisions

- **Disagreement with public-source data.** If a public source (their website, Wikidata) says one thing and the publisher says another, the publisher wins. Update `provenance_markers` to reflect `publisher-corrected:<YYYY-MM-DD>` so the discrepancy is recorded.
- **Confidence calibration.** If a fact looks volatile (current product version, pricing) and the publisher's document validity is 90 days, suggest `confidence: advisory` for that claim per spec §3.7.
- **Privacy.** If the publisher wants to remove a field that public sources surfaced (e.g., they don't want their HQ address in the doc even though schema.org markup contains it), remove without question.

## Failure modes

- **Publisher rejects most of the draft.** Stop and restart phase 03 with the publisher's clarifications as additional context.
- **Publisher requests a feature that requires a v0.2 capability.** Honestly say so and point at the LIP process (https://llmo.org/spec/lips/lip-0001/).
- **Publisher is unsure about a specific claim.** Default to leaving it out. The doc is a quarterly artifact; future iterations can add what's currently missing.
