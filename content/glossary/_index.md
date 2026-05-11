---
title: Glossary
linkTitle: Glossary
description: Protocol terms and attribute vocabulary for LLMO. The vocabulary is the builder agent's normalization layer; without a single canonical target, every agent reinvents normalization and the ecosystem fragments at the dialect level.
date: 2026-05-11
use_lastmod: true
---

## About this glossary

The glossary serves two purposes. First, it defines protocol terms used across the specification, the validator, and supporting tooling. Second, it publishes the **controlled attribute vocabulary** that the `attributes` claim (introduced in v0.1.8) SHOULD draw from. The vocabulary is load-bearing infrastructure for the builder agent: without a canonical normalization target, "free wifi available" and "wireless internet" and "guest network" remain three different strings across three different publishers, and consumers cannot answer "does this place have wifi" reliably.

This document is a seed. The protocol-terms section is reasonably stable; the attribute-vocabulary section will grow as the agent encounters publisher data that does not normalize cleanly into the current canonical names. Additions follow [ADR-0006](/adr/0006-version-bump-and-release-cut/)'s patch policy: new vocabulary names land additively in v0.1.x patches; renaming or removing an existing name happens only at a minor version boundary.

LIP-process terms (Editor, Namespace, Draft, Proposed, Active, Nonce, Transitions log, others) are defined in [LIP-1 §12](/spec/lips/lip-0001/#12-glossary) and are not duplicated here. See the [LIP-process terms](#lip-process-terms) section below for the pointer.

## Protocol terms

**Jump to:** [C](#terms-c) · [D](#terms-d) · [E](#terms-e) · [J](#terms-j) · [K](#terms-k) · [N](#terms-n) · [P](#terms-p) · [S](#terms-s) · [V](#terms-v) · [W](#terms-w)

<span id="terms-c"></span>

### Claim

An assertion the entity makes about itself, of a specific `type` (e.g., `identity`, `canonical_urls`, `contact_points`).

### Claim envelope

The wrapper around each claim containing `type`, `statement`, and optional fields `claim_id`, `asserted_at`, `confidence`, `provenance_markers`, and `signature`.

### Claim statement

The type-specific data inside a claim (the contents of the `statement` field). Each core claim type defines its statement shape in [v0.1 §3.5](/spec/v0.1/#3-5-core-claim-types).

<span id="terms-d"></span>

### `document_id`

A publisher-chosen identifier for the LLMO document instance. Distinct from `claim_id`, which identifies a single claim within the document for cross-reference and supersession.

### Document signature

The JWS (JSON Web Signature) over the entire LLMO document with its own top-level `signature` field removed, JCS-canonicalized, then signed using a key from the publisher's JWKS.

<span id="terms-e"></span>

### Entity

The organization or business that publishes the LLMO document. Identified by `entity.name` and `entity.primary_domain`.

<span id="terms-j"></span>

### JCS (JSON Canonicalization Scheme, RFC 8785)

The byte-exact canonicalization applied to JSON before signing. The same logical input always produces the same canonical bytes regardless of key order in the source JSON.

### JWKS (JSON Web Key Set)

The set of public keys served by the publisher at `/.well-known/llmo-keys.json`. Each `signature` carries a `kid` (key identifier) that resolves into this set.

### JWS (JSON Web Signature, RFC 7515)

The signature format used at both document and claim levels. LLMO uses the standard attached form with `b64: true` and no non-empty `crit` parameter, per [v0.1 §4.3.1](/spec/v0.1/#4-3-1).

### JWS protected header

The JSON object inside a JWS containing `alg` (signing algorithm), `kid`, and any other signature metadata. Base64url-encoded as the first segment of the JWS compact form.

<span id="terms-k"></span>

### `kid` (key identifier)

A string inside a JWS protected header naming which key in the publisher's JWKS produced the signature. Resolves to a public key by exact-match lookup.

<span id="terms-n"></span>

### Namespaced extension

A non-core claim type, attribute name, or external_id key containing at least one dot, for example `acme-corp.compliance_note` or `myco.custom_attr`. The prefix before the dot is the publisher's claimed extension surface (a namespace they assert control over, per LIP-1 §4).

<span id="terms-p"></span>

### Per-claim signature

Optional JWS inside each claim's envelope, over the claim object with its own `signature` field removed, JCS-canonicalized. Permitted to use a different `kid` than the document-level signature, provided the `kid` resolves to a key in the same publisher JWKS.

### `provenance_markers`

Optional array of strings on the claim envelope (introduced in v0.1.8), populated by the builder agent to record how the claim was derived (e.g., `source:publisher-website`, `cross-validated:wikidata,gmb`, `human-reviewed:2026-05-11`). Advisory signal for downstream consumers; consumers MAY use as confidence or freshness signal but MUST NOT treat as authoritative. Distinct from the `media_provenance` scope on `pointer` claims, which is C2PA-attested media origin.

<span id="terms-s"></span>

### Signed payload

The byte sequence produced by JCS canonicalization, base64url-encoded, then signed via JWS. For a document signature, the input is the document with its top-level `signature` field removed. For a claim signature, the input is the claim object with its own `signature` field removed.

### Supersession

The mechanism by which a `supersedes` claim references a prior `claim_id` to indicate the prior claim is no longer authoritative. Scope is constrained to URLs and documents the publisher controls or formerly controlled, per [v0.1 §3.5](/spec/v0.1/#3-5-core-claim-types).

<span id="terms-v"></span>

### Valid window

The validity period of the document, bounded by `valid_from` and `valid_until`. Conforming validators enforce a maximum span of 365 days at Standard tier (W1 warns at 181 to 365 days, S2 fails above 365 days).

<span id="terms-w"></span>

### Well-known key

A documented field name on an open map (for example, `wikidata` and `duns` on `entity.external_ids`, or `homepage` and `pricing` on `canonical_urls`) for which the specification defines specific semantics, pattern constraints, or both.

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

## LIP-process terms

Terms specific to the LIP process (Editor, Namespace, Standards Track, Process, Informational, Draft, Proposed, Active, Final, Superseded, Withdrawn, Rejected, Obsolete, Nonce, Transitions log) are defined in [LIP-1 §12](/spec/lips/lip-0001/#12-glossary). They are referenced from this glossary rather than duplicated to avoid drift.
