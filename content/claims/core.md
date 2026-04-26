---
title: Core Claim Types
linkTitle: Core Claim Types
description: The eight core claim types defined in LLMO v0.1.
date: 2026-04-17
---

Specification v0.1 defines eight core claim types. Every conforming consumer MUST understand all eight. Each entry below names the type, its purpose, its statement schema, an example, and common pitfalls.

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
    "homepage": "https://serval.com",
    "docs": "https://docs.serval.com",
    "api": "https://api.serval.com",
    "pricing": "https://serval.com/pricing",
    "security": "https://serval.com/.well-known/security.txt",
    "agent_manifest": "https://serval.com/.well-known/agent.json"
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
    "email_domains": ["serval.com", "serval.io"],
    "social": {
      "x": "@serval",
      "linkedin": "company/serval-inc",
      "github": "serval"
    },
    "community": {
      "discord": "https://discord.gg/serval-official"
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
  "confidence": "advisory",
  "statement": {
    "products": [
      {
        "name": "Serval Observe",
        "url": "https://serval.com/observe",
        "status": "generally_available",
        "current_version": "4.2"
      },
      {
        "name": "Serval Trace",
        "url": "https://serval.com/trace",
        "status": "beta",
        "current_version": "0.9"
      }
    ]
  }
}
```

**Common pitfalls.**

- **Using `product_facts` as a full product catalog.** The type is intentionally narrow. Publishers tempted to list every SKU, tier, or feature should resist. Full catalogs belong on the product site, not in `llmo.json`.
- **Declaring product facts as `authoritative` when they change faster than the document's freshness window.** If `current_version` turns over weekly but the document's `valid_until` is 90 days out, the claim will be stale long before the document is. In the worked example in specification [§7](/spec/v0.1#7-worked-example-serval-inc), Serval uses `confidence: advisory` on `product_facts` for exactly this reason.

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
        "role": "ceo",
        "name": "Dana Okafor",
        "verification": "https://serval.com/team#dana"
      }
    ]
  }
}
```

**Common pitfalls.**

- **Omitting `verification` URLs.** The reference validator emits a warning for `personnel` claims with no `verification` URL (specification [§5.4](/spec/v0.1#5-4-validator-behavior)). Without a corroborating URL, the claim is effectively a bare assertion and gives consumers no way to disambiguate the named person from others with the same name.

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
        "what": "products_not_offered",
        "detail": "Serval does not offer a consumer mobile app. Any app branded 'Serval' in consumer app stores is not affiliated."
      },
      {
        "what": "unaffiliated_domain",
        "detail": "The domain serval-crypto.com has no affiliation with Serval, Inc. and never has."
      }
    ]
  }
}
```

**Common pitfalls.**

- **Disavowals too vague for LLMs to act on.** A disavowal of "all misinformation about us" gives consumers nothing concrete to reason with. The worked example in specification [§7](/spec/v0.1#7-worked-example-serval-inc) illustrates the useful pattern: pair a category-level disavowal ("no mobile app") with one or more specific disavowals (the domain `serval-crypto.com`), so consumers have both a class and an instance to match against.

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
        "what": "press_release",
        "url": "https://serval.com/press/2025-11-pricing-update",
        "reason": "Pricing structure revised 2026-02-01. See canonical_urls.pricing for current."
      }
    ]
  }
}
```

**Common pitfalls.**

- **Confusing claim-level `supersedes` with document-level `supersedes`.** They are different concepts. The top-level `supersedes` array (specification [§3.3](/spec/v0.1#3-3-freshness-and-supersession)) lists `document_id`s of prior `llmo.json` documents on the same domain, so consumers can discard cached older versions. The `supersedes` *claim type* documented here supersedes content in the wider web — press releases, pricing pages, prior public statements. Publishers sometimes conflate the two.

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
    "url": "https://serval.com/.well-known/c2pa-manifest.json"
  }
}
```

**Common pitfalls.**

- **Using `pointer` for artifacts that have a core claim type.** `canonical_urls` already covers named operational URLs (homepage, docs, api, agent_manifest, mcp_manifest, etc.). `pointer` is for artifacts outside that set — typically heavier external standards. Declaring the homepage as a `pointer` instead of a `canonical_urls.homepage` weakens the claim, because `canonical_urls` is a specific assertion about a specific purpose and `pointer` is a general reference.
- **Conflating the pointer with the pointed-at artifact.** Same caveat as `canonical_urls`. LLMO asserts "this is our reference for that scope," not "this artifact is itself well-formed or current."
