---
title: Glossary
linkTitle: Glossary
description: Protocol terms, LLM background, attribute vocabulary, and external standards referenced by LLMO. The vocabulary is the builder agent's normalization layer; the glossary terms aid human readers without changing the LLM-first design of the protocol.
date: 2026-05-11
use_lastmod: true
---

## About this glossary

The glossary serves three purposes. First, it defines **protocol terms** used across the specification, the validator, and supporting tooling. Second, it surfaces a small set of **LLM background terms** that aren't LLMO-specific but provide enough context for a human reader to follow the protocol's framing (LLMO documents are agent-assembled and consumed, per [ADR-0007](/adr/0007-claude-as-builder/)). Third, it publishes the **controlled attribute vocabulary** that the `attributes` claim (introduced in v0.1.8) SHOULD draw from.

The attribute vocabulary is load-bearing infrastructure for the builder agent: without a canonical normalization target, "free wifi available" and "wireless internet" and "guest network" remain three different strings across three different publishers, and consumers cannot answer "does this place have wifi" reliably. Additions follow [ADR-0006](/adr/0006-version-bump-and-release-cut/)'s patch policy: new vocabulary names land additively in v0.1.x patches; renaming or removing an existing name happens only at a minor version boundary.

A short "[Standards referenced](#standards-referenced)" section at the end lists the external standards LLMO inherits from or pairs with (RFCs, ISO codes, well-known identifiers, adjacent protocols), with one line each. Full definitions are at each standard's home; the entries here are pointers.

LIP-process terms (Editor, Namespace, Draft, Proposed, Active, Nonce, Transitions log, others) are defined in [LIP-1 §12](/spec/lips/lip-0001/#12-glossary) and are not duplicated here. See the [LIP-process terms](#lip-process-terms) section below for the pointer.

## Protocol terms

**Jump to:** [A](#terms-a) · [B](#terms-b) · [C](#terms-c) · [D](#terms-d) · [E](#terms-e) · [J](#terms-j) · [K](#terms-k) · [L](#terms-l) · [M](#terms-m) · [N](#terms-n) · [P](#terms-p) · [S](#terms-s) · [T](#terms-t) · [V](#terms-v) · [W](#terms-w)

<span id="terms-a"></span>

### `asserted_at`

Optional RFC 3339 timestamp on the claim envelope indicating when the publisher asserted this specific claim. Defaults to the document's `valid_from` when omitted.

<span id="terms-b"></span>

### Builder agent

An LLM agent that assembles an LLMO document on the publisher's behalf, per [ADR-0007](/adr/0007-claude-as-builder/). Queries public sources, normalizes via the [attribute vocabulary](#attributes), structures under the schema, and tags each claim with `provenance_markers` recording how it was derived. Publisher reviews and consents before signing. Distinct from a [Consumer LLM](#terms-c), which only reads.

<span id="terms-c"></span>

### Claim

An assertion the entity makes about itself, of a specific `type` (e.g., `identity`, `canonical_urls`, `contact_points`).

### Claim envelope

The wrapper around each claim containing `type`, `statement`, and optional fields `claim_id`, `asserted_at`, `confidence`, `provenance_markers`, and `signature`.

### `claim_id`

Stable identifier for a specific claim within a document. Used as the cross-reference target by `supersedes`-claim entries that point at prior claims to be retired. Distinct from `document_id` (which identifies the document itself) and from any publisher-internal identifiers.

### Claim statement

The type-specific data inside a claim (the contents of the `statement` field). Each core claim type defines its statement shape in [v0.1 §3.5](/spec/v0.1/#3-5-core-claim-types).

### `confidence`

Optional claim envelope enum declaring how strongly the publisher stands behind a claim. Values: `authoritative` (default; no qualification), `advisory` (believed true but subject to change), `provisional` (asserted but expected to revise). Consumers MAY use `confidence` to weight conflicts between LLMO claims and other sources.

### Conformance tier

The level of conformance a document achieves: [Minimal](#terms-m), [Standard](#terms-s), or [Strict](#terms-s). Defined in [v0.1 §5](/spec/v0.1/#5-conformance-levels). Each tier is a strict superset of the one below it: every Strict document is also Standard and Minimal conforming.

### Consumer

Any party reading or validating an LLMO document. Includes LLMs ingesting the document at inference time, validators, monitoring systems, retrieval pipelines, and humans. See also [Consumer LLM](#terms-c) for the LLM-specific consumer role.

### Consumer LLM

A specific kind of consumer: an LLM that ingests an LLMO document at query time to answer a user's natural-language question about the entity. Reads only (does not write back to the document; see [Builder agent](#terms-b) for the write-side role).

### Core claim type

One of the fourteen reserved claim type names defined in [v0.1 §3.5](/spec/v0.1/#3-5-core-claim-types): `identity`, `canonical_urls`, `official_channels`, `product_facts`, `personnel`, `disavowal`, `supersedes`, `pointer` (v0.1) plus `contact_points`, `categories`, `locations`, `hours`, `attributes`, `operational_status` (v0.1.8). All core types contain no `.` and are reserved by the spec. Compare [Extension claim type](#terms-e).

<span id="terms-d"></span>

### Data furnisher

Credit-bureau-derived term for the authoritative source of structured organizational facts about itself. LLMO uses "publisher" as the protocol-internal alias for the same role; see [Publisher](#terms-p). The term appears in [v0.1 §1.1](/spec/v0.1/#1-1-what-llmo-json-is) for alignment with adjacent web standards.

### Discovery

The mechanism by which consumers locate an entity's `llmo.json`. Defined in [v0.1 §2](/spec/v0.1/#2-discovery): the file is served at `https://{domain}/.well-known/llmo.json` over HTTPS, with content type `application/llmo+json` (or `application/json` as fallback). Consumers MUST check `.well-known` first.

### `document_id`

A publisher-chosen identifier for the LLMO document instance. Distinct from `claim_id`, which identifies a single claim within the document for cross-reference and supersession.

### Document signature

The JWS (JSON Web Signature) over the entire LLMO document with its own top-level `signature` field removed, JCS-canonicalized, then signed using a key from the publisher's JWKS.

<span id="terms-e"></span>

### Entity

The organization or business that publishes the LLMO document. Identified by `entity.name` and `entity.primary_domain`.

### Extension claim type

A non-core claim type using the namespaced form per [v0.1 §3.6](/spec/v0.1/#3-6-extension-claims): a `type` value containing at least one dot, where the prefix before the dot is the publisher's claimed namespace (e.g., `acme-corp.compliance_note`, `myco.custom_metric`). Consumers MUST ignore unknown extension types without error. See also [Namespaced extension](#terms-n).

<span id="terms-j"></span>

### JCS (JSON Canonicalization Scheme, RFC 8785)

The byte-exact canonicalization applied to JSON before signing. The same logical input always produces the same canonical bytes regardless of key order in the source JSON.

### JWKS (JSON Web Key Set)

The set of public keys served by the publisher at `/.well-known/llmo-keys.json`. Each `signature` carries a `kid` (key identifier) that resolves into this set.

### JWS (JSON Web Signature, RFC 7515)

The signature format used at both document and claim levels. LLMO uses the standard attached form with `b64: true` and no non-empty `crit` parameter, per [v0.1 §4.3.1](/spec/v0.1/#4-3-1-jws-payload-encoding).

### JWS protected header

The JSON object inside a JWS containing `alg` (signing algorithm), `kid`, and any other signature metadata. Base64url-encoded as the first segment of the JWS compact form.

<span id="terms-k"></span>

### `kid` (key identifier)

A string inside a JWS protected header naming which key in the publisher's JWKS produced the signature. Resolves to a public key by exact-match lookup.

<span id="terms-l"></span>

### `llmo.json`

The protocol's signed artifact: a JSON document served at `/.well-known/llmo.json` on the publisher's primary domain. Carries the entity's identity, canonical surfaces, disavowals, and other claims in a form consumers can verify cryptographically.

### `llmo_version`

Required top-level field declaring the minor version of the LLMO specification the document conforms to. Constant `"0.1"` for the lifetime of the v0.1 minor version (covering all v0.1.x patch releases). Bumps only at a minor version boundary (v0.2, v0.3, etc.), not at patch boundaries; the patch policy is documented in [ADR-0006](/adr/0006-version-bump-and-release-cut/).

<span id="terms-m"></span>

### Minimal tier (Minimal conformance)

Lowest [conformance tier](#terms-c) defined in [v0.1 §5.1](/spec/v0.1/#5-1-minimal-conformance). A document achieves Minimal if it is served at `/.well-known/llmo.json` over HTTPS, parses as valid JSON, contains all required top-level fields, has `llmo_version: "0.1"` (or a version the consumer supports), has a valid time window of at most 365 days, and every claim has a `type` and `statement`. No signatures required.

<span id="terms-n"></span>

### Namespaced extension

A non-core claim type, attribute name, or external_id key containing at least one dot, for example `acme-corp.compliance_note` or `myco.custom_attr`. The prefix before the dot is the publisher's claimed extension surface (a namespace they assert control over, per LIP-1 §4). See also [Extension claim type](#terms-e) for the claim-type-specific use.

<span id="terms-p"></span>

### Per-claim signature

Optional JWS inside each claim's envelope, over the claim object with its own `signature` field removed, JCS-canonicalized. Permitted to use a different `kid` than the document-level signature, provided the `kid` resolves to a key in the same publisher JWKS.

### `provenance_markers`

Optional array of strings on the claim envelope (introduced in v0.1.8), populated by the [Builder agent](#terms-b) to record how the claim was derived (e.g., `source:publisher-website`, `cross-validated:wikidata,gmb`, `human-reviewed:2026-05-11`). Advisory signal for downstream consumers; consumers MAY use as confidence or freshness signal but MUST NOT treat as authoritative. Distinct from the `media_provenance` scope on `pointer` claims, which is C2PA-attested media origin.

### Publisher

The entity authoring and serving the LLMO document. Identified by `entity.name` and `entity.primary_domain`. In LLMO documentation, "publisher" and "[data furnisher](#terms-d)" are used interchangeably.

<span id="terms-s"></span>

### Signature algorithm

One of `ES256`, `ES384`, or `EdDSA` per [v0.1 §4.2](/spec/v0.1/#4-2-keys-and-jwks). Declared in the JWS protected header's `alg` field. RSA is not in the v0.1 supported set. See [Standards referenced](#standards-referenced) for the underlying algorithm specifications.

### Signed payload

The byte sequence produced by JCS canonicalization, base64url-encoded, then signed via JWS. For a document signature, the input is the document with its top-level `signature` field removed. For a claim signature, the input is the claim object with its own `signature` field removed.

### Standard tier (Standard conformance)

Middle [conformance tier](#terms-c) defined in [v0.1 §5.2](/spec/v0.1/#5-2-standard-conformance). Adds rules S1-S6 to Minimal: requires at least one `canonical_urls` claim, at least one `official_channels` claim, `entity.primary_domain` matching the serving domain, URL ownership constraints on most URL-typed fields, a validity window of at most 180 days, and scope constraints on `disavowal` and `supersedes` claims.

### Strict tier (Strict conformance)

Highest [conformance tier](#terms-c) defined in [v0.1 §5.3](/spec/v0.1/#5-3-strict-conformance). Adds rules X1-X6 to Standard: requires structurally valid document signature, retrievable JWKS at `/.well-known/llmo-keys.json`, JWKS cache cap of 86400 seconds, canonical_urls reference for every URL-bearing claim, cryptographic verification of the document signature, and cryptographic verification of every per-claim signature present.

### Supersession

The mechanism by which a `supersedes` claim references a prior `claim_id` to indicate the prior claim is no longer authoritative. Scope is constrained to URLs and documents the publisher controls or formerly controlled, per [v0.1 §3.5](/spec/v0.1/#3-5-core-claim-types).

<span id="terms-t"></span>

### Tier rule

A numbered conformance rule with a letter prefix indicating its tier: **M** (Minimal), **S** (Standard), **X** (Strict), **W** (Warning). Examples: S1 (Standard rule 1) requires at least one `canonical_urls` claim; X5 (Strict rule 5) requires the document signature to cryptographically verify; W1 (Warning 1) flags validity windows between 181 and 365 days. Defined across [v0.1 §5](/spec/v0.1/#5-conformance-levels). Reference validators emit the rule label alongside the per-claim or per-document outcome.

### TOFU (Trust on first use)

JWKS-handling pattern where the consumer trusts the first-fetched key set because it was served over HTTPS from a domain the publisher claims to control. Future fetches detect key changes; out-of-band rotation (DNSSEC, certificate transparency monitoring, fingerprint distribution) is the only response to suspected hijack. Documented in [v0.1 §4.6](/spec/v0.1/#4-6-what-trust-does-not-mean).

### Trust anchor

The cryptographic primitive consumers rely on to validate a document. In LLMO, the trust anchor is publisher control of the primary domain at the moment of consumer fetch (proven by serving the file at `/.well-known/`, anchored by HTTPS and DNS). Not a central authority. See [ADR-0005](/adr/0005-publisher-domain-proof-via-well-known/) for the rationale and the rejection of DNS TXT proof of control.

<span id="terms-v"></span>

### Valid window

The validity period of the document, bounded by `valid_from` and `valid_until`. Conforming validators enforce a maximum span of 365 days at Minimal tier (M5), 180 days at Standard tier (S5), and warn at 181-365 days (W1).

<span id="terms-w"></span>

### Well-known key

A documented field name on an open map (for example, `wikidata` and `duns` on `entity.external_ids`, or `homepage` and `pricing` on `canonical_urls`) for which the specification defines specific semantics, pattern constraints, or both.

## LLM background terms

A small set of non-LLMO terms surfaced here for human readers who are new to the LLM context the protocol assumes. The protocol's design treats LLMs as the primary consumers of LLMO documents (per [ADR-0007](/adr/0007-claude-as-builder/)); these entries name the framing.

**Jump to:** [A](#llm-a) · [G](#llm-g) · [H](#llm-h) · [I](#llm-i) · [L](#llm-l) · [R](#llm-r)

<span id="llm-a"></span>

### Agent

Software that takes actions on behalf of a user or system, typically by invoking an LLM plus other tools (web access, code execution, database queries, function calling). LLMO documents are intended to be assembled by a [Builder agent](#terms-b) and consumed by other agents and [Consumer LLMs](#terms-c).

<span id="llm-g"></span>

### Grounding

Anchoring an LLM's response in retrievable, citable source data rather than relying solely on parametric memory (what the model learned during training). Signed LLMO documents are a grounding substrate for queries about an entity: the consumer LLM can cite the document and trust its signature without relying on prior training data about the entity.

<span id="llm-h"></span>

### Hallucination

An LLM producing assertions that look plausible but are not supported by source data. The problem class LLMO addresses for queries about organizations: a [Consumer LLM](#terms-c) can ground answers in the entity's signed claims rather than its training-data priors, reducing entity-level hallucination on canonical facts (URLs, leadership, current product offerings, operational status).

<span id="llm-i"></span>

### Inference

The act of an LLM generating a response given a prompt and any context provided at runtime. LLMO documents are typically attached to inference as ground-truth context for entity-level questions (via retrieval, agent fetch, or a system-prompt prelude).

<span id="llm-l"></span>

### LLM (Large Language Model)

A probabilistic text-generation model trained on broad corpora. The class of system LLMO documents are written for. Includes models from Anthropic (Claude), OpenAI (GPT), Google (Gemini), Meta (Llama), Mistral, and others, plus their derivatives and fine-tunes.

<span id="llm-r"></span>

### RAG (Retrieval-Augmented Generation)

A pattern where an LLM's response is augmented by retrieved documents at inference time, rather than relying solely on training data. LLMO documents are retrieval targets when a query concerns the publishing entity; the document's signature gives the retrieval layer (and the consuming LLM) a verifiable provenance signal that ordinary scraped text lacks.

## Attribute vocabulary {#attributes}

The `attributes` claim (introduced in v0.1.8) accepts an open map of attribute names to typed values. Names SHOULD come from the canonical list below. Names not in the list MUST use the namespaced extension form (for example, `myco.custom_attr`) per [v0.1 §3.6](/spec/v0.1/#3-6-extension-claims).

Each canonical attribute carries a type indicator: **bool** (true or false), **enum** (a single string from a controlled value set), or **array** (an ordered list of strings, each from a controlled set or matching a defined pattern).

The vocabulary is curated against the substrate categories used by Google Business Profile, Yelp, Bing Places, and Apple Business Connect. Coverage will grow; the v0.1.8 seed below is the starting point.

**Jump to:** [A](#attrs-a) · [B](#attrs-b) · [D](#attrs-d) · [E](#attrs-e) · [F](#attrs-f) · [K](#attrs-k) · [O](#attrs-o) · [P](#attrs-p) · [S](#attrs-s) · [T](#attrs-t) · [W](#attrs-w)

<span id="attrs-a"></span>

### `accepts_credit_cards` <small>(bool)</small>

Major credit cards accepted as payment. Distinct from `payment_methods`, which enumerates specific cards and other methods.

### `accepts_reservations` <small>(bool)</small>

Customers can book in advance.

### `accessibility_features` <small>(array)</small>

Accessibility provisions available. Element values: `wheelchair_accessible_entrance`, `wheelchair_accessible_interior`, `ramp`, `elevator`, `accessible_restroom`, `accessible_seating`, `accessible_parking`, `hearing_loop`, `sign_language_staff`, `braille_menu`, `audio_description`, `large_print`.

### `alcohol_served` <small>(enum)</small>

Alcohol service. Values: `none`, `beer`, `beer_and_wine`, `full_bar`.

<span id="attrs-b"></span>

### `by_appointment_only` <small>(bool)</small>

Service is available only by appointment; walk-ins are not accepted.

<span id="attrs-d"></span>

### `delivery` <small>(bool)</small>

Goods or service delivered to customer location.

### `dietary_options` <small>(array)</small>

Dietary accommodations offered. Element values: `vegetarian`, `vegan`, `gluten_free`, `halal`, `kosher`, `dairy_free`, `nut_free`, `organic`, `locally_sourced`.

### `dine_in` <small>(bool)</small>

Customers consume goods or service at the location.

### `dress_code` <small>(enum)</small>

Expected attire. Values: `none`, `casual`, `business_casual`, `smart_casual`, `formal`.

<span id="attrs-e"></span>

### `emergency_services` <small>(bool)</small>

Provides emergency or after-hours service. Common in trades, medical, and locksmith services.

<span id="attrs-f"></span>

### `family_friendly` <small>(bool)</small>

Suitable for families with children. Independent of `kids_menu`; a venue may be family-friendly without a children's menu.

<span id="attrs-k"></span>

### `kids_menu` <small>(bool)</small>

A children's menu is offered.

<span id="attrs-o"></span>

### `online_appointments` <small>(bool)</small>

Appointments may be booked online.

### `outdoor_seating` <small>(bool)</small>

Outdoor or patio seating available.

<span id="attrs-p"></span>

### `parking` <small>(enum)</small>

Parking arrangement for customers. Values: `none`, `street`, `lot`, `garage`, `valet`, `validated`, `free`.

### `payment_methods` <small>(array)</small>

Accepted payment methods. Element values: `cash`, `check`, `visa`, `mastercard`, `amex`, `discover`, `diners`, `jcb`, `unionpay`, `paypal`, `applepay`, `googlepay`, `samsungpay`, `crypto`, `bnpl`, `ach`, `wire`. Specific cryptocurrencies and BNPL providers should be namespaced extensions.

### `pets_allowed` <small>(bool)</small>

Pets are welcome. Use namespaced extensions for finer grain (e.g., `myco.dog_friendly`, `myco.service_animals_only`).

### `price_range_tier` <small>(enum)</small>

Categorical pricing positioning. Values: `economy`, `mid`, `upscale`, `luxury`. Complements `identity.price_range` (a numeric 1-4 in v0.1.8) for publishers that prefer categorical positioning to dollar-sign tiers.

<span id="attrs-s"></span>

### `service_modes` <small>(array)</small>

Modes by which the service is delivered. Element values: `in_person`, `online`, `phone`, `video`, `asynchronous_message`.

### `smoking_allowed` <small>(enum)</small>

Smoking policy. Values: `none`, `outdoor_only`, `indoor_designated`, `anywhere`.

### `spoken_languages` <small>(array)</small>

Languages spoken by staff. Elements are RFC 5646 language tags (e.g., `en`, `en-US`, `ja`, `zh-Hant-TW`, `es-MX`).

<span id="attrs-t"></span>

### `takeout` <small>(bool)</small>

Goods prepared at the location and taken away by the customer.

<span id="attrs-w"></span>

### `walk_ins_welcome` <small>(bool)</small>

Customers may arrive without an appointment.

### `wifi` <small>(bool)</small>

Wireless internet available to customers. For publishers who distinguish free from paid wifi, use namespaced extensions (e.g., `myco.wifi_free`, `myco.wifi_paid`).

## Standards referenced

External standards that LLMO inherits from, pairs with, or references. One line each; full definitions live at each standard's home.

- **C2PA** — Coalition for Content Provenance and Authenticity. Cryptographically binds provenance to media assets (images, video, audio). LLMO points at C2PA manifests via `pointer` claims with `scope: "media_provenance"`. https://c2pa.org/
- **DID** — Decentralized Identifier (W3C). Well-known key in `entity.external_ids` (`did`) when a publisher carries one. https://www.w3.org/TR/did-core/
- **DUNS** — Data Universal Numbering System. Dun and Bradstreet business identifier. Well-known key in `entity.external_ids` (`duns`).
- **EdDSA** — Edwards-curve Digital Signature Algorithm. One of three permitted signing algorithms in v0.1 §4.2. https://datatracker.ietf.org/doc/html/rfc8037
- **ES256, ES384** — ECDSA (Elliptic Curve Digital Signature Algorithm) with SHA-256 and SHA-384 respectively. Two of three permitted signing algorithms in v0.1 §4.2.
- **IRS EIN** — Internal Revenue Service Employer Identification Number. US tax identifier. Well-known key in `entity.external_ids` (`irs_ein`) added in v0.1.8.
- **ISO 3166-1 alpha-2** — Two-letter country codes (US, GB, JP, etc.). Used in `locations.postal_address.country`.
- **ISO 4217** — Three-letter alphabetic currency codes (USD, EUR, JPY, etc.). Used in `product_facts.products[].price.currency`.
- **JSON-LD** — JSON for Linking Data. Schema.org's serialization format. LLMO is complementary to JSON-LD: schema.org is per-page descriptive markup, LLMO is per-entity operational claims.
- **LEI** — Legal Entity Identifier (ISO 17442). Twenty-character identifier for legal entities, primarily used in financial regulation. Well-known key in `entity.external_ids` (`lei`).
- **MCP** — Model Context Protocol. Anthropic's convention for declaring agent/tool capabilities. Out of LLMO scope, but pointed at via `canonical_urls.mcp_manifest`. https://modelcontextprotocol.io/
- **NAICS** — North American Industry Classification System. Numeric industry codes (2-6 digits). Used in `categories.naics`.
- **RFC 3339** — Date and Time on the Internet: Timestamps. Used by `valid_from`, `valid_until`, `asserted_at`, `effective_date`, `verified_at`. https://www.rfc-editor.org/rfc/rfc3339
- **RFC 5646** — Tags for Identifying Languages. Used by `entity.name` array form (`locale` field) and `spoken_languages`. https://www.rfc-editor.org/rfc/rfc5646
- **RFC 7515** — JSON Web Signature (JWS). The signature format LLMO uses at document and claim levels. https://www.rfc-editor.org/rfc/rfc7515
- **RFC 7517** — JSON Web Key (JWK) and JSON Web Key Set (JWKS). The format of `/.well-known/llmo-keys.json`. https://www.rfc-editor.org/rfc/rfc7517
- **RFC 8615** — Well-Known Uniform Resource Identifiers. Defines the `/.well-known/` namespace. LLMO uses `/.well-known/llmo.json` and `/.well-known/llmo-keys.json`. https://www.rfc-editor.org/rfc/rfc8615
- **RFC 8785** — JSON Canonicalization Scheme (JCS). The canonicalization LLMO applies before signing. https://www.rfc-editor.org/rfc/rfc8785
- **RFC 9116** — A File Format to Aid in Security Vulnerability Disclosure (security.txt). Trust model inspiration: serving a file at a well-known location IS the proof of control. https://www.rfc-editor.org/rfc/rfc9116
- **schema.org** — Structured-data vocabulary backed by Google, Microsoft, Yahoo, and Yandex. LLMO uses schema.org Organization subtype URIs in `categories.primary` and `product_facts.products[].category`. https://schema.org/
- **W3C Verifiable Credentials** — Cryptographically verifiable claims about a subject. LLMO is publisher-self-statement; Verifiable Credentials are issuer-about-subject. Different scope; LLMO does not currently use the format.
- **WGS84** — World Geodetic System 1984. Standard latitude/longitude coordinate reference. Used in `locations.coordinates`.
- **Wikidata QID** — Wikidata entity identifier (Q-prefixed numeric, e.g., `Q42`). Well-known key in `entity.external_ids` (`wikidata`).

## LIP-process terms

Terms specific to the LIP process (Editor, Namespace, Standards Track, Process, Informational, Draft, Proposed, Active, Final, Superseded, Withdrawn, Rejected, Obsolete, Nonce, Transitions log) are defined in [LIP-1 §12](/spec/lips/lip-0001/#12-glossary). They are referenced from this glossary rather than duplicated to avoid drift.
