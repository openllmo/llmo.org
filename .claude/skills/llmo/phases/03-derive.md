# Phase 03: Derive

## Goal

Query public sources to populate as many v0.1.8 fields as possible without asking the publisher. Build a draft `llmo-payload.json` in the working directory. Tag every claim with `provenance_markers` recording which source contributed each field.

## Inputs

- `email`, `primary_domain` (from phase 02).

## Outputs

- `llmo-payload.json` in the working directory, structurally valid against the v0.1.8 schema, populated with whatever public sources support.
- A list of fields the skill could not derive and will need to ask about in phase 04.

## Sources to query (in priority order)

1. **The publisher's website** (`https://<primary_domain>`):
   - HTML `<title>` and `<meta>` tags → likely `entity.name` and `identity.description`.
   - schema.org JSON-LD or microdata in the homepage source → `entity.name`, `entity.legal_identifiers`, `categories.primary` (Organization subtype URI), `locations` (PostalAddress), `hours` (OpeningHoursSpecification), `contact_points`.
   - Navigation / footer links → candidates for `canonical_urls.docs`, `canonical_urls.support`, `canonical_urls.pricing`, `canonical_urls.security`.
   - `/.well-known/security.txt` (if present) → security contact address.
2. **Wikidata** (search for the entity name):
   - Wikidata QID → `entity.external_ids.wikidata`.
   - Country of incorporation, founding date, headquarters → cross-validation for `identity.founded` and `entity.legal_identifiers.jurisdiction`.
3. **US business registries** (if US-based, inferred from website or schema.org country):
   - IRS Pub 78 / Tax Exempt Organization Search → `entity.external_ids.irs_ein` (with `verification_method: registry_lookup` and proof = the registry URL).
   - State Secretary of State filings → corroboration of `entity.legal_identifiers`.
4. **DUNS / LEI registries** (if findable):
   - DUNS lookup → `entity.external_ids.duns`.
   - LEI search at gleif.org → `entity.external_ids.lei`.
5. **schema.org categorization heuristics**:
   - Based on the publisher's website content and any schema.org markup, propose `categories.primary` from the schema.org Organization subtype hierarchy.
   - Match keywords in the publisher's content to NAICS codes for `categories.naics`.

## What to populate

Default v0.1.8 fields you populate from public sources alone:

- `llmo_version: "0.1"` (constant per ADR-0006).
- `document_id` (compute deterministically; see SKILL.md defaults).
- `valid_from`, `valid_until` (today UTC, today + 90 days UTC).
- `entity`: `name`, `primary_domain`, `aliases` (if multiple domains found), `legal_identifiers` (jurisdiction, registration_number if found), `external_ids` (wikidata, duns, lei, irs_ein as discoverable).
- `claims`:
  - `identity` (founded, headquarters, description, price_range if a Restaurant or Hotel).
  - `canonical_urls` (homepage minimum; docs, support, pricing, security if discoverable).
  - `official_channels` (email_domains derived from email + any aliases; social handles if findable).
  - `categories` (primary from schema.org markup or inference; secondary; NAICS if inferable).
  - `locations` (if any postal address discoverable).
  - `hours` (if any OpeningHoursSpecification or hours-of-operation page).
  - `contact_points` (with `verification_status: unverified` initially; phase 05 verifies).
  - `operational_status: open` (default).
- For each claim, populate `provenance_markers` with an array like `["source:publisher-website", "source:wikidata:Q12345", "auto-derived:2026-05-11"]` recording exactly which sources contributed.

## What to leave for phase 04 (publisher review)

- Any claim you found multiple conflicting sources for.
- Anything where the publisher is the only authority (e.g., spokespeople in `personnel`).
- Any claim that's plausible but only one weak source supports.

## CLI calls

- `llmo init --non-interactive --name "<entity.name>" --domain "<primary_domain>" --validity-days 90 --include-claims canonical_urls,official_channels` (as of CLI v0.1.8). This scaffolds a starter document; you then expand it with the v0.1.8 fields by editing `llmo-payload.json` directly.

## Decisions

- If you can't find the publisher's website at all, ask them for the URL.
- If schema.org markup is absent, do a best-effort categorization from page content and flag it for review in phase 04.

## Failure modes

- Publisher's domain doesn't resolve → ask them to confirm the domain.
- Website blocks crawlers → fall back to a minimal draft and ask more questions in phase 04.
- Wikidata returns multiple matching entities → ask the publisher to disambiguate.
