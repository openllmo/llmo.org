---
title: LLMO Specification v0.1
linkTitle: "v0.1 (current)"
description: The v0.1 specification for llmo.json.
date: 2026-04-17
---

**Status:** Draft
**Editor:** Nic Chavez (llmo.org)
**Published:** 2026-04-17
**Canonical URL:** https://llmo.org/spec/v0.1

---

## 1. Purpose and Scope

### 1.1 What `llmo.json` is

`llmo.json` is the **sovereign channel** an organization publishes to the machines that now mediate its reputation. It is a signed, time-bounded, machine-readable artifact served at a well-known location on the organization's primary domain. It carries the organization's own assertions about itself (identity, canonical surfaces, disavowals, supersessions) in a form that large language models, retrieval systems, and autonomous agents can consume directly and verify cryptographically.

This is a protocol for **machine-facing identity**. It governs the small, high-consequence surface where an organization speaks to automated systems in the first person: *these URLs are us, this person speaks for us, this attribution is false, this prior statement is superseded.* Declarative, not descriptive. Operational, not cataloging. Signable, not merely structured.

The file answers a narrow question with broad consequences: *when an automated system needs to know something load-bearing about this organization, what does the organization itself say is true, right now, in a form the system can verify?* Operational truth, in this spec, means facts that change over time and carry consequence when wrong: which URLs are canonical, who speaks for the organization, which products and pricing pages are current, which public claims the organization repudiates, which prior statements are superseded by newer ones.

### 1.2 What `llmo.json` is not

It is not a descriptive catalog of the organization in the style of schema.org. It is not a media-provenance format in the style of C2PA. It is not a capability manifest in the style of MCP or agent.json. It is not a security disclosure channel in the style of `security.txt`. It borrows discovery conventions from some of these and defers outright to others (see §6).

Specifically, `llmo.json` does not:

- Describe every fact about the organization. It carries a curated set.
- Replace structured data on individual web pages. Schema.org still wins for page-level markup.
- Describe API capabilities, tools, or invokable actions. Those belong in MCP manifests or `agent.json`.
- Sign or provenance-wrap media assets. That is C2PA's job.
- Serve as a legal contract. Claims are assertions of operational truth, not enforceable promises.

### 1.3 The problem LLMO solves

Organizations have no sovereign channel to the machines that now mediate their reputation.

When a large language model answers a question about an organization (what it does, what it charges, who speaks for it, what it has said and unsaid), the answer is synthesized from text the organization did not write, about the organization, filtered through ranking and retrieval systems the organization does not control. The organization's ability to correct, supersede, or repudiate any piece of that synthesis is effectively zero. There is no primary source the model knows to consult and trust above its aggregated priors.

Existing standards address adjacent problems and leave this one untouched:

- **schema.org/JSON-LD** markup lives on individual pages and describes those pages' contents. It has no concept of "this claim supersedes that one" or "we disavow this attribution." It is optimized for search indexing, not for trust.
- **C2PA** attaches provenance to media assets. It does not carry entity-level claims.
- **MCP** and **agent.json** describe what an agent can *do*, not what is *true* about the organization behind it.
- **`security.txt`** publishes contact information for security researchers at a well-known URI. It is a one-purpose file.
- **DNS TXT records** and **WHOIS** carry minimal structured identity but are not claim-bearing.

None of these give an organization a single verifiable place to say: *these are the URLs that are us. This is the price. This person does not speak for us. The press release from March is superseded by the one from April. The domain that looks like us is not us.*

That is the gap `llmo.json` fills, and the reason it matters more each quarter. The machines consuming the organization's reputation are no longer an auxiliary audience. For many organizations, they are already the primary one.

### 1.4 Non-goals for v0.1

- Discoverability without a domain. If an entity has no domain, v0.1 does not serve them.
- Multi-tenancy. A single `llmo.json` represents a single organizational entity. Complex corporate structures are handled via `supersedes` and `delegates_to` pointers, not by packing multiple entities into one file.
- Revocation infrastructure beyond signature expiration and document supersession. A full revocation registry is a v0.2 topic.

---

## 2. Discovery

### 2.1 Location

The primary location is:

```
https://{domain}/.well-known/llmo.json
```

The `.well-known` prefix follows [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615). A conforming organization MUST serve the file at this path on its primary domain.

Organizations MAY additionally serve the file at `https://{domain}/llmo.json` as a convenience, but consumers MUST check `.well-known` first and MUST prefer it when both exist. Rejected alternative: allowing arbitrary locations declared via `<link rel="llmo">` tags. This was rejected because it re-introduces the discovery ambiguity that the well-known convention exists to eliminate, and because LLMO files need to be reachable without HTML parsing.

### 2.2 Content type

The file MUST be served with:

```
Content-Type: application/llmo+json
```

Consumers MUST also accept `application/json` as a fallback, since many hosting providers restrict custom MIME types. When served as `application/json`, the consumer determines conformance by parsing the document and checking for the required top-level fields (§3.1).

### 2.3 HTTP behavior

- The file MUST be reachable via HTTPS. HTTP-only hosting is non-conforming.
- Redirects are permitted but MUST stay on the same registrable domain. A cross-domain redirect (e.g., from `diverse.org/.well-known/llmo.json` to `kbp.org/.well-known/llmo.json`) is non-conforming for v0.1. Organizations with split domains should publish at each domain and use the `aliases` field (§3.2) to cross-reference.
- CORS: the file SHOULD be served with `Access-Control-Allow-Origin: *`. Consumers that fetch via browser contexts will expect this.
- Compression: standard HTTP compression (gzip, br) is permitted and recommended.

### 2.4 Caching and freshness

The file is expected to be consulted frequently and to change occasionally. The spec defines two layers of freshness:

**HTTP-layer caching.** The server SHOULD set `Cache-Control: max-age=3600` or similar. Consumers SHOULD respect HTTP cache headers but MUST NOT cache for longer than 24 hours regardless of server directives.

**Document-layer freshness.** The `llmo.json` document itself carries a `valid_from` and `valid_until` field (§3.3). Consumers MUST treat a document as stale once `valid_until` has passed, even if HTTP cache headers say otherwise. A stale document SHOULD NOT be used to answer high-stakes queries; consumers SHOULD refetch.

### 2.5 Discovery failure

If `.well-known/llmo.json` returns 404, 403, or any non-2xx status, the consumer MUST treat the organization as having no LLMO record. Consumers MUST NOT fall back to heuristic discovery (e.g., guessing at `/llmo.json`, `/about/llmo.json`, etc.). Silent failure is preferable to false positives.

---

## 3. Core Schema

The file is a single JSON object. All fields use `snake_case`. Unknown fields MUST be ignored by consumers (forward-compatibility).

### 3.1 Required top-level fields

Every conforming `llmo.json` MUST contain:

| Field | Type | Description |
|---|---|---|
| `llmo_version` | string | Spec version this document conforms to. For this spec: `"0.1"`. |
| `entity` | object | Identity of the publishing organization (§3.2). |
| `claims` | array | Ordered array of claim objects (§3.4). May be empty but must be present. |
| `valid_from` | string | [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) timestamp. The document is authoritative from this moment. |
| `valid_until` | string | RFC 3339 timestamp. The document is stale after this moment. |
| `document_id` | string | Stable opaque identifier for this document, unique within the entity. Used for supersession. |

### 3.2 Entity identity

The `entity` object identifies who is publishing the file.

```json
{
  "entity": {
    "name": "Diverse.org, Inc.",
    "primary_domain": "diverse.org",
    "aliases": ["llmo.org", "kbp.org"],
    "legal_identifiers": {
      "jurisdiction": "US-CA",
      "registration_number": "99-2870125"
    }
  }
}
```

Organizations MAY include `external_ids` referencing Wikidata, DUNS, or other identifier registries when those identifiers exist. The field is optional; entities without registry presence simply omit it.

- `name` (required): human-readable entity name.
- `primary_domain` (required): the registrable domain at which this `llmo.json` is authoritative. MUST match the domain serving the file.
- `aliases` (optional): other domains owned by the entity. Each alias domain SHOULD serve its own `llmo.json` whose `primary_domain` points back to a single authoritative domain; consumers encountering an alias SHOULD prefer the authoritative document.
- `legal_identifiers` (optional): structured legal identity. Fields are jurisdiction-dependent.
- `external_ids` (optional): pointers into external identity systems (Wikidata, DUNS, LEI, DID, etc.).

v0.1 does not mandate any single external identifier scheme. Rejected alternative: requiring a Wikidata QID or a DID. Requiring Wikidata would disadvantage new or private organizations; requiring DIDs would impose unfamiliar infrastructure. `external_ids` stays optional and open.

### 3.3 Freshness and supersession

Every document is time-bounded and may explicitly supersede a prior document.

```json
{
  "valid_from": "2026-04-17T00:00:00Z",
  "valid_until": "2026-07-17T00:00:00Z",
  "document_id": "2026-04-q2-ops",
  "supersedes": ["2026-01-q1-ops"]
}
```

- `valid_from` and `valid_until` bound the document's authoritative window. The window MUST NOT exceed 365 days.
- `document_id` is a publisher-chosen stable identifier. It is opaque to consumers. Good practice: include a date or version token.
- `supersedes` (optional): array of `document_id` values from prior documents on the same domain. A consumer that sees a cached prior document and then encounters a newer document listing it in `supersedes` MUST discard the prior.

**Recommended cadence:** republish quarterly or on material change, whichever comes first. An organization that has not touched its `llmo.json` in over a year is a signal of abandonment to consumers.

### 3.4 Claims

The `claims` array is the substance of the document. Each claim is an object with at minimum a `type` and a `statement`.

```json
{
  "claims": [
    {
      "type": "canonical_urls",
      "statement": { ... },
      "asserted_at": "2026-04-17T00:00:00Z",
      "confidence": "authoritative"
    }
  ]
}
```

Common claim-level fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | yes | One of the core claim types (§3.5) or a namespaced extension type (§3.6). |
| `statement` | object | yes | Type-specific payload. |
| `asserted_at` | string | no | RFC 3339 timestamp of when this specific claim was asserted. Defaults to document `valid_from`. |
| `confidence` | string | no | One of `authoritative` (default), `advisory`, or `provisional`. See §3.7. |
| `claim_id` | string | no | Stable identifier for referencing this claim from elsewhere (e.g., from a `supersedes` within another claim). |
| `signature` | object | no | Per-claim JWS signature, when claim-level signing is used (§4). |

### 3.5 Core claim types

These types MUST be understood by any conforming consumer. Extension types (§3.6) MAY be ignored.

#### `identity`

Asserts core identity facts about the entity beyond what's in the `entity` block. Useful for distinguishing similarly-named organizations.

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

#### `canonical_urls`

The single most important claim type. Asserts which URLs are authoritative for which purposes. An LLM reasoning about an entity SHOULD prefer these URLs over anything it has scraped.

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

All keys are optional; orgs declare only the URLs they operate. Consumers MUST treat URLs declared here as preferred over URLs discovered elsewhere. Note that LLMO vouches for the pointer, not the content of the referenced artifact: if `agent_manifest` points at an agent.json, LLMO asserts "this is our agent.json," not "this agent.json is itself well-formed or safe."

#### `official_channels`

Asserts which social accounts, email domains, and messaging presences are operated by the entity. Directly aids impersonation detection.

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

#### `product_facts`

Asserts currently-true facts about the organization's products. Intentionally narrow; full product catalogs belong elsewhere.

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
        "name": "KBP",
        "url": "https://kbp.org"
      },
      {
        "name": "Emerging.org Podcast",
        "url": "https://emerging.org"
      }
    ]
  }
}
```

#### `personnel`

Asserts which individuals hold public-facing roles and are authorized to speak for the organization in those roles. Narrow and optional; most orgs will not use this.

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

#### `disavowal`

Explicitly repudiates claims, attributions, or associations the organization considers false or no longer accurate. This is a first-class claim because no existing standard carries this semantic.

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
        "detail": "The domain diverse-org.example.com has no affiliation with Diverse.org and never has."
      }
    ]
  }
}
```

#### `supersedes`

Declares that a prior public statement, URL, or document is no longer authoritative. Distinct from document-level `supersedes` (which refers to a prior `llmo.json`); this claim supersedes content in the wider web.

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

#### `pointer`

A typed reference to an external artifact the organization endorses as authoritative for some scope. Used for pointing at heavier standards.

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

### 3.6 Extension claims

Claims with a `type` containing a `.` are namespaced extensions. Example: `"type": "acme-corp.internal_compliance"`. Consumers MUST ignore unknown extension types without error. The LLMO registry at `llmo.org/claims/` will catalog widely-adopted extensions and may promote mature ones into core in later versions.

The `.` separator matches [schema.org](https://schema.org/), JSON-LD, and MIME-type conventions. Namespaces before the final `.` SHOULD be a short identifier the publisher controls, ideally matching a domain they own. Core claim types defined in this specification (`identity`, `canonical_urls`, `official_channels`, `product_facts`, `personnel`, `disavowal`, `supersedes`, `pointer`) contain no `.` and are reserved.

### 3.7 Confidence

Claims carry an optional `confidence` field:

- `authoritative` (default): the organization stands behind this claim without qualification.
- `advisory`: the organization believes this to be true but acknowledges rapid change. Consumers should weight accordingly.
- `provisional`: the claim is asserted but subject to imminent revision. Use sparingly.

Consumers MAY use confidence to resolve conflicts between LLMO claims and other sources: `authoritative` LLMO claims should beat scraped content; `provisional` claims need not.

---

## 4. Trust Model

### 4.1 Trust layers

LLMO defines two layers of trust. Every conforming document has the first; higher conformance levels require the second.

**Layer 1: Domain-bound trust.** The file is trusted to the extent that the domain serving it is trusted. HTTPS provides transport integrity; DNS and certificate chains provide the binding. A consumer that has verified the TLS connection to `diverse.org` and retrieved `.well-known/llmo.json` from that connection has domain-bound trust in the contents. This layer requires no publisher-side key management.

**Layer 2: Cryptographic trust.** The document or individual claims carry JWS signatures. Signatures are verifiable against public keys the publisher makes available at a well-known JWKS URI. Signatures survive caching, mirroring, and republication: an LLM that cached a `llmo.json` last month can still verify its signatures today.

### 4.2 Keys and JWKS

Publishers using Layer 2 MUST host a JWKS at:

```
https://{domain}/.well-known/llmo-keys.json
```

The JWKS follows [RFC 7517](https://www.rfc-editor.org/rfc/rfc7517). Keys MUST declare `use: "sig"`, an `alg` of `ES256`, `ES384`, or `EdDSA`, and a stable `kid`.

RSA is not in the v0.1 supported algorithm set. Rejected alternative: supporting RS256 for compatibility with legacy JWT infrastructure. Rejected because `llmo.json` is a greenfield artifact; there is no legacy to preserve, and RSA key sizes would inflate signature payloads unnecessarily.

Keys SHOULD rotate at least annually. Retired keys SHOULD remain in the JWKS for 90 days after rotation, marked with an `exp` claim on the key, to allow verification of recently-cached documents.

### 4.3 Document-level vs claim-level signing

Publishers may sign at two granularities:

**Document-level signing.** A single JWS covers the entire document (excluding the signature field itself). Placed at the top level as `signature`. The signing payload is the document with the `signature` key removed, canonicalized per §4.3.2.

**Claim-level signing.** Individual claims carry their own `signature` field covering the claim object (excluding the signature field). Useful when different claims are asserted by different organizational functions (e.g., legal signs `disavowal` claims; ops signs `canonical_urls`).

A document MAY use both. Claim-level signatures are evaluated per-claim; the document signature covers the wrapper.

#### 4.3.1 JWS payload encoding

Both document-level and claim-level signatures are **standard (attached) JWS** per [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515), not detached-payload JWS per [RFC 7797](https://www.rfc-editor.org/rfc/rfc7797). The protected header MUST NOT include `b64: false`; the `crit` parameter MUST NOT list `b64`. The `crit` parameter SHOULD be omitted entirely. Verifiers MUST reject any JWS whose `crit` parameter is non-empty for v0.1; future versions may define recognized critical extensions.

The bytes that are signed (the JWS payload, base64url-encoded inside the JWS structure) are the JCS-canonicalized bytes of the target object with its own `signature` field removed, as specified in §4.3.2. The on-disk `signature` field stores only the JWS protected header and the signature itself, in the flattened form:

```json
"signature": {
  "protected": "<base64url-encoded protected header>",
  "signature": "<base64url-encoded signature>"
}
```

Verifiers reconstruct the signed bytes by re-canonicalizing the document (or claim) with its `signature` field removed and base64url-encoding the result. Verifiers SHOULD construct a flattened JWS object with `payload` set to the base64url-encoded canonical bytes and the on-disk `protected` and `signature` fields, then pass it to a standard flattened-JWS verification routine. Verifiers MUST NOT accept signatures whose protected header asserts `b64: false`; such documents are non-conforming for v0.1.

Rationale: standard JWS has uniform, well-tested support across every major JOSE library, while detached-payload mode (RFC 7797) is a less-trodden code path whose `crit` handling is a frequent source of interop failure. The on-disk size is identical between the two modes (the JWS payload bytes are not stored in the `signature` field regardless), so the only consequence of this choice is which library entry points implementers call. v0.1 picks the entry point everyone already has tested.

Rejected alternative: detached-payload JWS (RFC 7797, `b64: false`) with the canonical JSON serving as both the document on disk and the JWS payload bytes. Rejected because the on-disk savings are zero (see above), the interop risk is real, and the `crit: ["b64"]` requirement adds a verification edge case that v0.1 verifiers would routinely mishandle.

#### 4.3.2 Canonicalization

Both document-level and claim-level signatures use **JWS with JCS (JSON Canonicalization Scheme, [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785))** over the target object with its own `signature` field removed.

Rationale for JCS at both granularities, rather than detached JWS over raw bytes:

- Publishers generate these files from templates, CI pipelines, WordPress plugins, and future tooling that none of us control. Any of these may re-serialize the JSON between signing and serving: reordering keys, normalizing whitespace, re-encoding Unicode. Detached JWS over raw bytes breaks under any such transformation. JCS survives it.
- CDNs, hosting providers, and edge runtimes routinely touch response bodies. JCS tolerates this; raw-byte signing does not.
- Using the same canonicalization at both granularities means verifiers implement one code path. Implementation complexity and bug surface drop meaningfully.
- JCS has well-specified libraries in every major language and has been deployed at scale in adjacent standards.

The cost is modest: JCS adds a canonicalization pass before sign and verify. For a `llmo.json` of typical size (single-digit KB), this is imperceptible.

**Reversibility.** If future measurement shows JCS overhead is meaningful at aggregate scale, v0.2 can introduce alternate canonicalization modes without breaking v0.1 verifiers. Signatures already carry their `alg` in the JOSE header; a future `cty` or custom header parameter can declare canonicalization variant. v0.1 verifiers will simply treat unknown variants as unverifiable and downgrade trust per §4.5.

#### 4.3.3 Publisher guidance: sign last, serve byte-stable

JCS protects against accidental transformation. Intentional transformation after signing is prohibited and will produce undetectable signature breakage. Publishers MUST:

- Sign the file as the final step before deployment. Not before minification. Not before templating expansion. Last.
- Serve the signed file byte-stable. No server-side reformatting, no minifier-in-the-CDN, no "helpful" prettifying by a reverse proxy.
- Treat the signed file as an opaque blob for caching and transport purposes. Gzip and Brotli transport compression are fine (they are reversed before parsing); content-level transformation is not.

A publisher who cannot guarantee byte-stable serving SHOULD NOT sign. An unsigned document at Layer 1 trust is preferable to a signed document whose signatures verifiers will routinely fail to validate.

### 4.4 Consumer verification algorithm

When a consumer fetches a `llmo.json`, it SHOULD:

1. Verify TLS and the domain binding. If this fails, reject.
2. Parse the document. If the document is malformed, reject.
3. Check `valid_from` and `valid_until`. If expired, mark as stale.
4. If a document-level `signature` is present, fetch the JWKS, verify. If verification fails, downgrade trust to Layer 1 only and log.
5. For each claim, if it carries its own `signature`, verify it. Unsigned claims in a document-signed document inherit the document signature.
6. Produce a per-claim trust assessment: `{claim, trust_level: "layer1" | "layer2", issues: [...]}`.

### 4.5 Behavior when signatures are absent or invalid

**Absent signatures.** The document is valid at Layer 1 trust only. Consumers MUST NOT treat the absence of a signature as evidence of inauthenticity. Most publishers in the v0.1 era will not sign.

**Invalid signatures.** An invalid signature is more suspicious than a missing one. Consumers SHOULD:
- Log the failure.
- Downgrade the affected scope (document or individual claim) to Layer 1 trust.
- NOT treat the entire document as poisoned: a broken signature on one claim does not invalidate other claims.

**Key not found in JWKS.** Treated as invalid signature.

### 4.6 What trust does *not* mean

A signed claim is not a guarantee of truth. It is a guarantee that *this specific organization, via this specific key, asserted this claim at this specific time*. Consumers that act on LLMO claims remain responsible for their actions. The spec provides attribution, not indemnification.

---

## 5. Conformance Levels

### 5.1 Minimal conformance

A `llmo.json` document is **minimally conforming** if:

- It is served at `/.well-known/llmo.json` over HTTPS.
- It parses as valid JSON.
- It contains all required top-level fields (§3.1).
- `llmo_version` is `"0.1"` or a version the consumer supports.
- `valid_from` precedes `valid_until`, and the window is ≤ 365 days.
- All claims have a `type` and `statement`.

Minimal conformance does not require any signatures or any specific claim types.

### 5.2 Standard conformance

A document is **standard conforming** if it meets minimal conformance plus:

- Contains at least one `canonical_urls` claim.
- Contains at least one `official_channels` claim.
- `entity.primary_domain` matches the domain serving the file.
- All URLs in claims resolve to the entity's primary domain or declared aliases, or are explicitly third-party pointers (e.g., in `pointer` claims or external social URLs).
- `valid_until` is no more than 180 days after `valid_from`.

Standard is the target for most publishers. It provides consumers with enough signal to meaningfully re-rank LLMO claims against scraped content.

### 5.3 Strict conformance

A document is **strictly conforming** if it meets standard conformance plus:

- Carries a valid document-level JWS signature.
- The signing key is retrievable at `/.well-known/llmo-keys.json` on the same domain.
- The JWKS itself is served with `Cache-Control: max-age ≤ 86400`.
- All claims carrying URLs include at least one `canonical_urls` reference demonstrating domain ownership of any URLs referenced.

Strict conformance is intended for organizations whose LLMO claims carry significant consequence: regulated industries, widely-impersonated brands, organizations whose statements are frequently mis-attributed.

### 5.4 Validator behavior

A reference validator at `llmo.org/validate` will check these tiers. It will report:

- Which tier the document achieves.
- For any missed tier, which specific checks failed.
- Warnings for practices that are conformant but discouraged (e.g., a `valid_until` 364 days out, a `personnel` claim with no `verification` URL).

---

## 6. Relationship to Adjacent Standards

LLMO deliberately stays narrow. This section maps the boundaries.

### 6.1 schema.org / JSON-LD

[Schema.org](https://schema.org/) markup is per-page and descriptive; LLMO is per-entity and operational. Schema.org tells a search engine "this page describes an Organization named Diverse.org, with this address." LLMO tells any machine consumer "these are the URLs we vouch for, this statement we repudiate, this document supersedes the last one."

Use both. An organization's homepage should carry schema.org markup; the organization should additionally publish `llmo.json`. When claims overlap (name, homepage URL), LLMO is authoritative by virtue of being single-sourced and signable; schema.org is authoritative for page-level facts that LLMO does not carry.

### 6.2 C2PA

[C2PA](https://c2pa.org/) cryptographically binds provenance to media assets (images, video, audio). LLMO does not. An organization publishing signed photography uses C2PA; the same organization can point to its C2PA policy via a `pointer` claim in `llmo.json` with `scope: "media_provenance"`.

The two standards compose cleanly: C2PA handles asset-level provenance; LLMO handles entity-level claims, including the claim "here is our C2PA manifest."

### 6.3 MCP and agent.json

Model Context Protocol and `agent.json` describe what an agent can *do*: capabilities, endpoints, invocation schemas. LLMO describes what is *true* about the organization behind an agent. An LLMO document can declare (via `canonical_urls.agent_manifest` or `canonical_urls.mcp_manifest`) which agent/MCP manifests are authoritative; the manifests themselves remain out of scope.

v0.1 deliberately does not specify agent capabilities inside `llmo.json`. This was evaluated and rejected in favor of pointer-only integration. Re-specifying capabilities would duplicate MCP badly; specifying them well would make LLMO a capability spec. The pointer model lets LLMO remain a declarative truth pack while composing with whichever agent spec wins.

### 6.4 security.txt (RFC 9116)

[`security.txt`](https://www.rfc-editor.org/rfc/rfc9116) is the direct stylistic ancestor of `llmo.json`: a well-known, human-readable file publishing narrow operational information. LLMO extends the pattern in three ways: it is structured (JSON, not key-value text), it carries time-bounded claims with supersession, and it supports cryptographic signing. An organization's `security.txt` remains authoritative for security disclosure; LLMO does not replicate its contents and SHOULD reference it via a `canonical_urls.security` pointer.

### 6.5 sitemap.xml and robots.txt

Orthogonal. Sitemaps describe URL inventory for crawlers; robots.txt describes crawling policy. Neither carries claims. LLMO does not replace either, and neither replaces LLMO.

### 6.6 DID and Verifiable Credentials

DIDs and VCs are a general-purpose decentralized identity and credential framework. LLMO could, in principle, be rebuilt on top of DIDs; v0.1 declines to require them for the same reason it declines to require Wikidata QIDs: imposing unfamiliar identity infrastructure would collapse adoption. The `external_ids` field leaves the door open for organizations that choose to publish a DID.

### 6.7 `.well-known/` conventions (RFC 8615)

LLMO uses `.well-known/` as intended: a stable, discoverable location for per-origin metadata. The file joins `security.txt`, `openid-configuration`, `acme-challenge`, and others. No conflict.

---

## 7. Worked Example: Diverse.org, Inc. {#7-worked-example-diverse-org-inc}

This section walks through a complete `llmo.json` for Diverse.org, Inc., the nonprofit that stewards this protocol. The example is real: the entity exists, the address is correct, the products are real initiatives, and an actual signed `llmo.json` corresponding to this example is published at `https://diverse.org/.well-known/llmo.json`. The example meets strict conformance.

```json
{
  "llmo_version": "0.1",
  "document_id": "2026-q2-initial",
  "valid_from": "2026-04-26T00:00:00Z",
  "valid_until": "2026-07-26T00:00:00Z",

  "entity": {
    "name": "Diverse.org, Inc.",
    "primary_domain": "llmo.org",
    "aliases": ["diverse.org", "kbp.org", "emerging.org"],
    "legal_identifiers": {
      "jurisdiction": "US-CA",
      "registration_number": "99-2870125"
    }
  },

  "claims": [
    {
      "claim_id": "identity-core",
      "type": "identity",
      "statement": {
        "founded": "2024-05",
        "headquarters": "2445 Augustine Dr Ste 150, Santa Clara, CA 95054-3032, US",
        "description": "California 501(c)(3) nonprofit. Stewardship of open protocols for organizational identity in the AI era."
      }
    },
    {
      "claim_id": "urls-canonical",
      "type": "canonical_urls",
      "statement": {
        "homepage": "https://diverse.org",
        "docs": "https://llmo.org/spec",
        "security": "https://diverse.org/.well-known/security.txt"
      }
    },
    {
      "claim_id": "channels-official",
      "type": "official_channels",
      "statement": {
        "email_domains": ["diverse.org", "llmo.org"],
        "social": {
          "github": "openllmo"
        }
      }
    },
    {
      "claim_id": "products-current",
      "type": "product_facts",
      "statement": {
        "products": [
          {
            "name": "LLMO Protocol Specification",
            "url": "https://llmo.org"
          },
          {
            "name": "KBP",
            "url": "https://kbp.org"
          },
          {
            "name": "Emerging.org Podcast",
            "url": "https://emerging.org"
          }
        ]
      }
    },
    {
      "claim_id": "personnel-leadership",
      "type": "personnel",
      "statement": {
        "spokespeople": [
          {
            "role": "chairman",
            "name": "Nic Chavez"
          },
          {
            "role": "director",
            "name": "Jack Dudley"
          },
          {
            "role": "secretary",
            "name": "Andrew Mark"
          }
        ]
      }
    },
    {
      "claim_id": "disavowal-affiliations",
      "type": "disavowal",
      "statement": {
        "disavowed": [
          {
            "what": "commercial_subsidiary",
            "detail": "Diverse.org has no commercial subsidiary. Any entity claiming to be a Diverse.org commercial arm is not affiliated."
          },
          {
            "what": "unaffiliated_domain",
            "detail": "The domain diverse-org.example.com has no affiliation with Diverse.org and never has."
          }
        ]
      }
    }
  ],

  "signature": {
    "protected": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRpdmVyc2UtMjAyNi0wMSJ9",
    "signature": "<placeholder; the published signed document at diverse.org will use a real ES256 signature over the JCS-canonicalized payload>"
  }
}
```

**Annotations on this example:**

- The entity declares three aliases (`diverse.org`, `kbp.org`, `emerging.org`) because Diverse.org operates these domains as additional surfaces. Each domain SHOULD serve its own `llmo.json` with `primary_domain` matching the serving domain and `aliases` listing the others. The document published at `https://llmo.org/.well-known/llmo.json` declares `primary_domain: "llmo.org"`; when `diverse.org` launches its own site, the document at `https://diverse.org/.well-known/llmo.json` will declare `primary_domain: "diverse.org"` with aliases pointing at `llmo.org` and the rest. The Standard-tier rule "`entity.primary_domain` matches the domain serving the file" enforces this symmetric structure.
- `legal_identifiers.registration_number` carries the federal IRS EIN (99-2870125). For US 501(c)(3) entities, the EIN is the most useful registration identifier to consumers; the jurisdiction (`US-CA`) records the state of incorporation.
- `identity.founded` is recorded at year-month granularity (2024-05); the spec also accepts year-only or full RFC 3339 date.
- `canonical_urls` is intentionally minimal: Diverse.org operates a homepage, points at the LLMO spec as its canonical documentation, and serves a security disclosure document. Future products may add more named URLs (`api`, `status`, etc.) as those surfaces come online.
- `official_channels` declares the GitHub organization (`openllmo`) and email domains. Spec correspondence at `spec@llmo.org` and security at `security@llmo.org` are reachable through the declared `email_domains`.
- `product_facts` lists three Diverse.org-stewarded initiatives. The schema permits richer fields per product (`status`, `current_version`); this example carries only `name` and `url` because those are the facts Diverse.org currently asserts. Stewardship status is described in prose at each product's URL.
- `personnel.spokespeople` enumerates the three officers of Diverse.org. All three entries currently omit `verification` URLs, which a conforming validator surfaces as warnings per §5.4. Future revisions of this document will add verification URLs at `https://diverse.org/about/leadership` once Diverse.org's site stands up the leadership page; verification URLs that point at third-party domains (GitHub, LinkedIn, etc.) would fail Standard-tier rule S4 and are intentionally avoided here.
- `disavowal` pairs a category-level disavowal (`commercial_subsidiary`, asserting Diverse.org has no commercial arm) with a specific disavowal (an unaffiliated domain). Consumers reasoning about Diverse.org get both a class assertion and a concrete instance to match against.
- The document-level signature covers all fields except `signature` itself. A consumer verifies by fetching `https://llmo.org/.well-known/llmo-keys.json`, locating the key with `kid: "diverse-2026-01"`, and verifying the ES256 signature over the JCS-canonicalized payload.

The signed instance of this `llmo.json` is currently published at [`https://llmo.org/.well-known/llmo.json`](https://llmo.org/.well-known/llmo.json), with the corresponding JWKS at [`https://llmo.org/.well-known/llmo-keys.json`](https://llmo.org/.well-known/llmo-keys.json). Diverse.org will mirror at `https://diverse.org/.well-known/llmo.json` once Diverse.org's own site launches. Either copy should validate identically against this spec via [the reference validator](/validator/) or any conforming validator.

---

## 8. Open Questions for Future Versions

The following are known gaps or deferred decisions. v0.1 ships without resolving them.

**8.1 Revocation beyond supersession.** Document supersession and signature key rotation cover the common case. They do not cover "we need every cached copy of document X to be treated as revoked *immediately*, even if consumers haven't refetched." A future version of LLMO may define a revocation registry, potentially a signed, append-only list at `/.well-known/llmo-revocations.json`.

**8.2 Delegation.** How does a parent organization assert authority over a subsidiary's `llmo.json`, and vice versa? v0.1 treats each domain as independent. A `delegates_to` / `delegated_from` claim pair is the likely answer in a future version of LLMO, but the trust implications (can a compromised parent forge a child?) need careful design.

**8.3 Cross-domain aliases.** v0.1 requires each alias domain to serve its own file. Whether a single canonical document should be able to speak for multiple domains without per-domain publication is unresolved. The trust argument for per-domain is strong; the operational argument against it is also strong.

**8.4 Claim-level supersession inside a live document.** Currently, supersession operates at the document level (new document supersedes old) and at the "wider web" level (a claim supersedes external content). A third mode, within a single live document where a newer claim supersedes an older one of the same type, is not yet specified. It may not be needed; republication is cheap.

**8.5 Registry governance for extension claims.** The `llmo.org/claims/` registry needs an explicit governance model: who can register, what review is required, what it means for a claim type to be "promoted" to core. v0.1 leaves this to an informal editorial process.

**8.6 Non-domain entities.** Individuals, DAOs, and other entities without a primary domain are out of scope for v0.1. A future version of LLMO may include a binding for DID-rooted publication.

**8.7 Interaction with retrieval-augmented generation at scale.** How LLM providers *actually* consume LLMO claims at ingestion or retrieval time is outside the spec's control. A future version of LLMO may include non-normative guidance for implementers on both sides, publishers and consumers, based on early adoption data.

**8.8 Internationalization.** All claim statements in v0.1 are free-form strings. A future version of LLMO will likely include a binding for localized claim text (`"detail": {"en": "...", "ja": "..."}`).

**8.9 Relationship to compliance frameworks.** Whether LLMO claims can or should be referenced in privacy policies, terms of service, or regulated disclosures is a legal question v0.1 explicitly does not answer. Organizations should consult counsel before treating LLMO claims as legally operative.

**8.10 Publisher reputation layer.** LLMO as specified gives publishers a signed channel to assert claims, but says nothing about whether a given publisher *deserves* to be believed. A bad actor can register a plausible-looking domain, publish a strictly-conforming `llmo.json`, sign it correctly, and use the authority of the file to launder false claims: false disavowals of legitimate parties, false supersessions of accurate reporting, canonical URLs pointing at phishing. Layer 2 cryptographic trust verifies *who* asserted *what* and *when*; it does not verify that the asserter should be trusted.

The answer is a consumer-side reputation layer that sits above LLMO, a separate artifact, not a field inside `llmo.json`, that scores publishers on signals LLMO itself cannot carry: domain age, historical consistency of claims, cross-reference against external identity anchors (Wikidata, legal registries, independent identity networks), signature key rotation hygiene, disavowal patterns that correlate with suppression of legitimate criticism. This artifact is necessarily third-party-published (a publisher cannot credibly score itself) and is a plausible role for the LLMO registry or an independent trust network to fill.

The field `confidence` inside a claim is the *publisher's hedge on its own claim*. The reputation layer is *the consumer's score of the publisher*. These are different concerns and belong in different artifacts. v0.1 specifies the first and explicitly defers the second. A future version of LLMO will need to specify the interaction: how consumers combine a claim's stated confidence with the publisher's reputation score to produce a final trust assessment, and how the reputation layer's own trust is anchored without recreating the same adversarial problem one level up.

A plausible input to any such reputation layer is **immutable publication history**, an append-only log of a publisher's `llmo.json` documents over time, hosted by a party other than the publisher. A self-hosting publisher can, in principle, rewrite history by re-signing a backdated prior document and claiming it was always there; a third-party log cannot be rewritten. The diff between successive documents then becomes an auditable trail of what the publisher claimed when. v0.1 does not specify this log; a future version may define an interchange format for importing and exporting such histories between reputation layers.

**8.11 Post-quantum cryptographic readiness.** Signatures in v0.1 use Ed25519 or comparable pre-quantum algorithms. Sufficiently large quantum computers would break these signatures, undermining the trust model that binds claims to publisher key control. A future version of LLMO will specify a migration path: algorithm identifiers in the schema, hybrid signature support during the transition, and a deprecation window for pre-quantum-only documents.

---

## Appendix A: Conformance Artifacts

### A.1 JSON Schema

A formal JSON Schema for `llmo.json` v0.1 is published at [`https://llmo.org/spec/v0.1/schema.json`](/spec/v0.1/schema.json). The reference validator uses this schema as its structural check.

### A.2 Test Vectors

A set of reference test vectors for v0.1 is published at [`/spec/v0.1/test-vectors`](/spec/v0.1/test-vectors). The vectors exercise the §4 trust model and the §5 conformance tiers: a minimally conforming unsigned document, a standard-conforming unsigned document, and a strictly conforming document with a valid ES256 JWS signature over a JCS-canonicalized payload (RFC 7515, RFC 7518, RFC 7638, RFC 8785). The JWKS containing the public key that verifies the strict vector, and the canonical bytes that were signed, are published alongside. The canonical-bytes file lets implementers validate their JCS implementation independently of their JWS implementation. The vectors do not exercise RFC 7797 (detached-payload JWS); §4.3.1 prohibits that mode for v0.1.

The vectors are static fixtures with a fixed validity window. After their `valid_until` date, conforming validators are expected to flag them as expired; that behavior is itself a conformance check.

## Appendix B: Changelog

- **v0.1 (2026-04-17):** Initial draft.
- **v0.1.1 (2026-04-27):** §4.3 clarified to specify standard (attached) JWS; detached-payload mode (RFC 7797) explicitly prohibited. No on-disk byte format change for any pre-existing strict-conforming document. Verifier behavior is tightened to reject `b64: false` and non-empty `crit` parameters; this formalizes the only mode any existing implementation supports. Renumbered §4.3.1 → §4.3.2 and §4.3.2 → §4.3.3 to accommodate the new §4.3.1. Patch-level revision under §[Versioning] line 16 (editorial revisions, including clarification of ambiguous normative text); author-decided per the pre-release section.

---

*This specification is maintained at https://llmo.org/spec. Comments, issues, and proposed changes: https://github.com/openllmo/llmo.org.*
