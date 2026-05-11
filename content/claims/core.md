---
title: Core Claim Types
linkTitle: Core Claim Types
description: The fourteen core claim types defined in LLMO v0.1 (eight from v0.1; six added in v0.1.8).
date: 2026-04-17
use_lastmod: true
---

Specification v0.1 defines fourteen core claim types as of v0.1.8: eight from the original v0.1 release (`identity`, `canonical_urls`, `official_channels`, `product_facts`, `personnel`, `disavowal`, `supersedes`, `pointer`) plus six added in v0.1.8 (`contact_points`, `categories`, `locations`, `hours`, `attributes`, `operational_status`). Every conforming consumer MUST understand all fourteen. Each entry below names the type, its purpose, its statement schema, an example, and common pitfalls.

The authoritative definitions live in specification [§3.5](/spec/v0.1#3-5-core-claim-types). This page summarizes and adds implementation notes.

---

## `identity`

**Purpose.** Asserts core identity facts about the entity beyond what is already in the top-level `entity` block. Useful for distinguishing similarly-named organizations and for providing LLMs with attribution context.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `founded` | string | no | RFC 3339 date, year, or year-month. |
| `headquarters` | string | no | Free-form location string. |
| `description` | string | no | One-line description of the entity. Max 2048 characters. |

**Example.**

```json
{
  "type": "identity",
  "statement": {
    "founded": "2019-06",
    "headquarters": "San Francisco, CA, US",
    "description": "Enterprise observability for AI workloads."
  }
}
```

---

## `canonical_urls`

**Purpose.** Asserts which URLs are authoritative for which purposes. The single most important claim type. Consumers MUST treat URLs declared here as preferred over URLs discovered elsewhere.

**Statement schema.** All keys are optional strings in URI form. The well-known keys are `homepage`, `docs`, `api`, `status`, `support`, `pricing`, `security`, `agent_manifest`, `mcp_manifest`. Additional keys are permitted; unknown keys SHOULD be treated as entity-specific URL declarations.

**Example.**

```json
{
  "type": "canonical_urls",
  "statement": {
    "homepage": "https://diverse.org",
    "docs": "https://llmo.org/spec",
    "security": "https://diverse.org/.well-known/security.txt",
    "agent_manifest": "https://diverse.org/.well-known/agent.json"
  }
}
```

**Common pitfalls.**

- **Conflating the pointer with the pointed-at artifact.** LLMO vouches for the pointer, not the content of what it points at. If `agent_manifest` points at an `agent.json`, LLMO asserts "this is our agent.json," not "this agent.json is itself well-formed or safe." Consumers should not read authority over the pointed content into a `canonical_urls` claim.

---

## `official_channels`

**Purpose.** Asserts which social accounts, email domains, and messaging presences are operated by the entity. Directly aids impersonation detection.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `email_domains` | array of domain strings | no | Domains from which the entity sends email. |
| `social` | object | no | Map of platform name to account handle or path. |
| `community` | object | no | Map of community name to URL (e.g., Discord, Slack). |

**Example.**

```json
{
  "type": "official_channels",
  "statement": {
    "email_domains": ["diverse.org", "llmo.org"],
    "social": {
      "github": "openllmo"
    }
  }
}
```

---

## `product_facts`

**Purpose.** Asserts currently-true facts about the organization's products. Intentionally narrow; full product catalogs belong elsewhere.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `products` | array of product objects | yes | Each product has at minimum a `name`. |

Each product object may contain `name` (required), `url`, `status` (one of `generally_available`, `beta`, `alpha`, `preview`, `deprecated`, `end_of_life`), and `current_version`.

**Example.**

```json
{
  "type": "product_facts",
  "statement": {
    "products": [
      {
        "name": "LLMO Protocol Specification",
        "url": "https://llmo.org"
      },
      {
        "name": "Example Product",
        "url": "https://example.org/product"
      },
      {
        "name": "Emerging.org Podcast",
        "url": "https://emerging.org"
      }
    ]
  }
}
```

**Common pitfalls.**

- **Using `product_facts` as a full product catalog.** The type is intentionally narrow. Publishers tempted to list every SKU, tier, or feature should resist. Full catalogs belong on the product site, not in `llmo.json`.
- **Declaring product facts as `authoritative` when they change faster than the document's freshness window.** If `current_version` turns over weekly but the document's `valid_until` is 90 days out, the claim will be stale long before the document is. Publishers whose product facts move faster than their document cadence SHOULD use `confidence: advisory` on `product_facts`; consumers weight these claims accordingly per §3.7.

---

## `personnel`

**Purpose.** Asserts which individuals hold public-facing roles and are authorized to speak for the organization in those roles. Narrow and optional; most organizations will not use this.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `spokespeople` | array of spokesperson objects | yes | Each spokesperson has at minimum a `role` and `name`. |

Each spokesperson object may contain `role` (required), `name` (required), and `verification` (a URL that independently corroborates the role, such as a team page).

**Example.**

```json
{
  "type": "personnel",
  "statement": {
    "spokespeople": [
      {
        "role": "chairman",
        "name": "Nic Chavez",
        "verification": "https://github.com/thegigachav"
      }
    ]
  }
}
```

**Common pitfalls.**

- **Omitting `verification` URLs.** The reference validator emits a warning for `personnel` claims with no `verification` URL (specification [§5.4](/spec/v0.1#5-4-validator-behavior)). Without a corroborating URL, the claim is effectively a bare assertion and gives consumers no way to disambiguate the named person from others with the same name.

**Per-claim signing.** Personnel claims may carry their own signature per spec [§4.3](/spec/v0.1#43-document-level-vs-claim-level-signing) when an organization wants HR-asserted personnel facts to be cryptographically distinct from operational claims signed by ops or engineering. The per-claim signature uses any `kid` resolvable in the publisher's JWKS. Per-claim signatures are evaluated under the X6 strict-tier rule ([§5.3](/spec/v0.1#53-strict-conformance)).

---

## `disavowal`

**Purpose.** Explicitly repudiates claims, attributions, or associations the organization considers false or no longer accurate. First-class claim because no existing standard carries this semantic.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `disavowed` | array of disavowed objects | yes | At least one entry. |

Each disavowed object requires `what` (a short category or label) and `detail` (free-form explanation, max 2048 characters), and may carry an optional `url` for the specific content being disavowed.

**Example.**

```json
{
  "type": "disavowal",
  "statement": {
    "disavowed": [
      {
        "what": "commercial_subsidiary",
        "detail": "Diverse.org has no commercial subsidiary. Any entity claiming to be a Diverse.org commercial arm is not affiliated."
      },
      {
        "what": "unaffiliated_domain",
        "detail": "The domain diverse-org.example.com is shaped to imply affiliation with Diverse.org but has no such affiliation. This is an impersonation defense per §3.5."
      }
    ]
  }
}
```

**Common pitfalls.**

- **Disavowals too vague for LLMs to act on.** A disavowal of "all misinformation about us" gives consumers nothing concrete to reason with. The useful pattern is to pair a category-level disavowal (e.g., "no commercial subsidiary") with one or more specific disavowals (e.g., the unaffiliated domain `diverse-org.example.com`), so consumers have both a class and an instance to match against. The worked example in specification [§7](/spec/v0.1#7-worked-example-diverse-org-inc) demonstrates this.

**Per-claim signing.** Disavowal claims are a strong candidate for per-claim signing per spec [§4.3](/spec/v0.1#43-document-level-vs-claim-level-signing), since they are often the most security-sensitive assertions in a document and may be cryptographically attested by a different organizational function (e.g., legal) than the rest of the document. The [§7 worked example](/spec/v0.1#7-worked-example-diverse-org-inc) demonstrates this pattern. Per-claim signatures are evaluated under the X6 strict-tier rule ([§5.3](/spec/v0.1#53-strict-conformance)).

---

## `supersedes` (claim-level)

**Purpose.** Declares that a prior public statement, URL, or document in the wider web is no longer authoritative. Distinct from document-level `supersedes`, which refers to a prior `llmo.json` document on the same domain.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `superseded` | array of superseded objects | yes | At least one entry. |

Each superseded object requires `what` (a short category or label) and `reason` (free-form explanation, max 2048 characters), and may carry an optional `url` for the specific content being superseded.

**Example.**

```json
{
  "type": "supersedes",
  "statement": {
    "superseded": [
      {
        "what": "draft_announcement",
        "url": "https://diverse.org/announce/2026-04-protocol-draft",
        "reason": "Initial protocol announcement was revised when v0.1 was published. See canonical_urls.docs for current."
      }
    ]
  }
}
```

**Common pitfalls.**

- **Confusing claim-level `supersedes` with document-level `supersedes`.** They are different concepts. The top-level `supersedes` array (specification [§3.3](/spec/v0.1#3-3-freshness-and-supersession)) lists `document_id`s of prior `llmo.json` documents on the same domain, so consumers can discard cached older versions. The `supersedes` *claim type* documented here supersedes content in the wider web: press releases, pricing pages, prior public statements. Publishers sometimes conflate the two.

---

## `pointer`

**Purpose.** A typed reference to an external artifact the organization endorses as authoritative for some scope. Used for pointing at heavier standards (e.g., C2PA manifests).

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `scope` | string | yes | What the pointed artifact is authoritative for (e.g., `media_provenance`). |
| `standard` | string | no | The name of the standard the artifact conforms to (e.g., `C2PA`). |
| `url` | string (URI) | yes | The URL of the pointed artifact. |

**Example.**

```json
{
  "type": "pointer",
  "statement": {
    "scope": "media_provenance",
    "standard": "C2PA",
    "url": "https://diverse.org/.well-known/c2pa-manifest.json"
  }
}
```

**Common pitfalls.**

- **Using `pointer` for artifacts that have a core claim type.** `canonical_urls` already covers named operational URLs (homepage, docs, api, agent_manifest, mcp_manifest, etc.). `pointer` is for artifacts outside that set, typically heavier external standards. Declaring the homepage as a `pointer` instead of a `canonical_urls.homepage` weakens the claim, because `canonical_urls` is a specific assertion about a specific purpose and `pointer` is a general reference.
- **Conflating the pointer with the pointed-at artifact.** Same caveat as `canonical_urls`. LLMO asserts "this is our reference for that scope," not "this artifact is itself well-formed or current."

---

## `contact_points` (v0.1.8)

**Purpose.** Asserts typed contact addresses for specific organizational functions (security, abuse, press, legal, support, billing, phone, messaging), with optional verification metadata recording how each address was confirmed.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `points` | array of point objects | yes | At least one entry. |

Each point object requires `type` (enum: `billing`, `security`, `abuse`, `legal`, `press`, `support`, `phone`, `messaging`) and `address` (the contact value). Optional: `verification_method` (enum: `email_challenge`, `dns_txt`, `signed_response`, `none`), `verification_status` (enum: `verified`, `pending`, `unverified`), `verification_proof`, `verified_at` (RFC 3339).

When `verification_status` is `verified`, both `verification_proof` and `verified_at` are required (schema-enforced via `if`/`then`).

**Example.**

```json
{
  "type": "contact_points",
  "statement": {
    "points": [
      {
        "type": "security",
        "address": "security@diverse.org",
        "verification_method": "email_challenge",
        "verification_status": "verified",
        "verified_at": "2026-05-01T00:00:00Z",
        "verification_proof": "<challenge-response-token>"
      }
    ]
  }
}
```

**Common pitfalls.**

- **Marking an address `verified` without proof.** Schema validation rejects this directly. Either supply the proof and timestamp, or use `verification_status: pending` or `unverified` until you can.
- **Conflating `contact_points.address` with `official_channels.email_domains`.** The latter declares which domains your organization sends mail from (for impersonation defense); the former declares specific addresses for specific purposes. Both are useful; they answer different questions.

---

## `categories` (v0.1.8)

**Purpose.** Asserts the organization's primary and secondary categories using schema.org Organization subtype URIs plus optional NAICS codes.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `primary` | string (URI) | yes | A schema.org Organization subtype URI (e.g., `https://schema.org/Restaurant`). |
| `secondary` | array of URIs | no | Additional schema.org subtype URIs. |
| `naics` | array of strings | no | NAICS codes (2-6 digit numeric strings). |

**Example.**

```json
{
  "type": "categories",
  "statement": {
    "primary": "https://schema.org/SoftwareApplication",
    "secondary": ["https://schema.org/WebApplication"],
    "naics": ["541511"]
  }
}
```

**Common pitfalls.**

- **Using trademarked third-party taxonomies (GMB categories, Yelp categories, Apple categories).** v0.1.8 deliberately constrains the controlled category vocabulary to schema.org plus NAICS. Publishers who need finer-grained or industry-specific categorization use the namespaced extension form per [§3.6](/spec/v0.1#3-6-extension-claims), e.g., `"myco.business_subtype": "..."`. Trademark avoidance and schema-not-a-catalog discipline are the rationale.

---

## `locations` (v0.1.8)

**Purpose.** Asserts physical locations or service areas where the organization operates. Each entry may include postal address, geographic coordinates, service-area definition, business type, and a per-location publisher identifier for cross-system routing.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `locations` | array of location objects | yes | At least one entry. |

Each location object may contain `postal_address` (object with `country` ISO 3166-1 alpha-2 and optional `region`, `locality`, `administrative_division_2`, `postal_code`, `address_lines`), `coordinates` (`{latitude, longitude}` in WGS84), `service_area` (`oneOf` of `{radius_km, center}`, `{polygon}`, `{bounding_box}`, or `{named_places}`), `business_type` (enum: `customer_location`, `business_location`, `both`), and `publisher_id` (publisher's per-location identifier, distinct from any document-level identifier).

**Example.**

```json
{
  "type": "locations",
  "statement": {
    "locations": [
      {
        "postal_address": {
          "country": "US",
          "region": "CA",
          "locality": "Santa Clara",
          "postal_code": "95054",
          "address_lines": ["2445 Augustine Dr Ste 150"]
        },
        "coordinates": { "latitude": 37.3737, "longitude": -121.9700 },
        "business_type": "business_location"
      }
    ]
  }
}
```

**Common pitfalls.**

- **Coordinates outside WGS84 bounds.** Schema rejects latitude outside [-90, 90] or longitude outside [-180, 180].
- **Mixing `service_area` branches.** The `service_area` field is a strict `oneOf`: exactly one of `radius_km+center`, `polygon`, `bounding_box`, or `named_places`. A location with both a radius and a polygon is non-conforming; declare two locations or pick one representation.
- **Conflating per-location `publisher_id` with the claim-envelope `publisher_id` (does not exist in v0.1.8).** `publisher_id` exists ONLY as a per-location field on `locations` entries, not on the claim envelope. The agent's per-claim audit trail lives on `provenance_markers` (§3.4), not in any envelope-level publisher identifier.

---

## `hours` (v0.1.8)

**Purpose.** Asserts opening hours: a regular weekly schedule, calendar exceptions (holidays, closures, special schedules), and named alternate sub-schedules (drive-through, kitchen, brunch).

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `regular` | object | no | Weekly schedule keyed by day-of-week (`monday` through `sunday`). |
| `exceptions` | array | no | Per-date overrides. |
| `alternate` | object | no | Named sub-schedules with the same weekly structure as `regular`. |

Each day in `regular` (and in each alternate sub-schedule) is an array of `{open, close, is_overnight}` periods. Multiple periods per day are permitted (split shifts). Times are 24-hour `HH:MM`. The `close` field additionally accepts `24:00` to indicate an end-of-day boundary; `open` does not. `is_overnight: true` marks periods spanning midnight (close < open numerically, e.g., open `22:00` close `02:00`).

Exception entries are `{date, periods, closed}` where `date` is RFC 3339 full-date (`YYYY-MM-DD`).

**Example.**

```json
{
  "type": "hours",
  "statement": {
    "regular": {
      "monday": [{ "open": "09:00", "close": "17:00" }],
      "friday": [
        { "open": "09:00", "close": "17:00" },
        { "open": "22:00", "close": "02:00", "is_overnight": true }
      ]
    },
    "exceptions": [
      { "date": "2026-12-25", "closed": true }
    ]
  }
}
```

**Common pitfalls.**

- **`open: "24:00"`.** Not permitted; only `close: "24:00"` is. Use `00:00` if you mean midnight as an open time.
- **Forgetting `is_overnight: true` on midnight-spanning periods.** A period with `open: "22:00"` and `close: "02:00"` is ambiguous without the flag (some consumers would treat it as zero-hours or as a configuration error). Set `is_overnight: true` whenever close < open numerically.
- **Mixing daily exceptions with alternate sub-schedules.** Christmas closure is an `exception` (per-date override). A drive-through that operates on a different weekly schedule than the main location is an `alternate` (named sub-schedule with its own weekly structure). The two surfaces answer different questions.

---

## `attributes` (v0.1.8)

**Purpose.** Asserts entity attributes drawn from the controlled vocabulary at [/glossary/#attributes](/glossary/#attributes). The vocabulary is the builder agent's normalization layer per [ADR-0007](/adr/0007-claude-as-builder/): canonical names ensure that "free wifi available," "wireless internet," and "guest network" all normalize to the same `wifi: true` so consumers can answer entity queries reliably across publishers.

**Statement schema.** Open map of attribute name to typed value. Values are one of: boolean, string (from an enum where applicable), array of strings. Each canonical name in the vocabulary carries a declared type.

Names SHOULD come from the canonical list at `/glossary/#attributes` (24 entries as of v0.1.8: boolean attributes including `wifi`, `accepts_credit_cards`, `delivery`, etc.; enum attributes including `parking`, `alcohol_served`, `dress_code`; array attributes including `payment_methods`, `spoken_languages`, `accessibility_features`). Names not in the canonical list MUST use the namespaced extension form per [§3.6](/spec/v0.1#3-6-extension-claims), e.g., `"myco.signature_dish": "fish_tacos"`.

**Example.**

```json
{
  "type": "attributes",
  "statement": {
    "wifi": true,
    "parking": "lot",
    "payment_methods": ["visa", "mastercard", "cash"],
    "spoken_languages": ["en", "es-MX"],
    "myco.has_drive_through": true
  }
}
```

**Common pitfalls.**

- **Inventing canonical names that aren't in the vocabulary.** Names not in `/glossary/#attributes` MUST be namespaced (the dot is the rule per §3.6). A bare attribute name like `has_outdoor_seating` (not in the canonical list) is non-conforming; use `outdoor_seating` (canonical) instead, or namespace it (`myco.has_outdoor_seating`) if your variant is meaningfully different.
- **Using attribute values outside the declared enum set.** For attributes with controlled values (e.g., `parking` accepts `none`, `street`, `lot`, `garage`, `valet`, `validated`, `free`), values outside the set are publisher-invented and should be namespaced or upstreamed to the vocabulary.
- **Conflating `attributes.price_range_tier` with `identity.price_range`.** v0.1.8 defines both: the categorical `price_range_tier` (`economy`, `mid`, `upscale`, `luxury`) on `attributes` and the numeric `price_range` (1-4 mapping to $-$$$$) on `identity`. They complement each other; publishers may declare both, one, or neither.

---

## `operational_status` (v0.1.8)

**Purpose.** Asserts the entity's current operational status: open, opening soon, temporarily closed, or permanently closed. Useful for entities undergoing renovation, opening new locations, or having ceased operations.

**Statement schema.**

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string (enum) | yes | One of `open`, `permanently_closed`, `temporarily_closed`, `opening_soon`. |
| `effective_date` | string (RFC 3339 date) | conditional | Required when `status` is not `open` (schema-enforced via `if`/`then`). |
| `reason` | string | no | Free-text reason; max 2048 characters. |

**Example.**

```json
{
  "type": "operational_status",
  "statement": {
    "status": "opening_soon",
    "effective_date": "2026-06-01",
    "reason": "Renovation complete; reopening to the public."
  }
}
```

**Common pitfalls.**

- **Non-open status without `effective_date`.** Schema rejects this. Either supply the date the status takes effect, or use `status: open` if the entity is currently operational.
- **Stale `permanently_closed` entries.** A `permanently_closed` claim with `effective_date` two years ago is technically correct but may surprise consumers expecting recent context. Some publishers prefer to retire `llmo.json` entirely (let `valid_until` expire) for definitively closed entities; that's a publisher policy call.
