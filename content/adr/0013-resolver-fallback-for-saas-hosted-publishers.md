---
title: "ADR-0013: Resolver fallback for SaaS-hosted publishers"
linkTitle: ADR-0013
description: Resolvers SHOULD attempt a single fixed-subdomain fallback location (`llmo.<primary_domain>/.well-known/llmo.json`) when the primary path is structurally absent. The signed document is unchanged; resolver behavior and rule S3 are amended additively. Subdomain takeover is mitigated by signature verification, not by the discovery mechanism.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-19
status: Accepted
---

## Status

Accepted. Records the resolver-fallback addition landed in v0.1.10. Accepted under the pre-launch authorship privilege of [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/); the LIP-1 §10 14-day governance window was not observed and no LIP was filed. The decision is recorded here so future external review can audit the rationale.

## Context

LLMO publishers serve `/.well-known/llmo.json` at their primary domain (§2.1). The serving location is the publisher authority primitive recorded in [ADR-0005](/adr/0005-publisher-domain-proof-via-well-known/): being able to publish at `https://<primary_domain>/.well-known/llmo.json` IS the proof of control over `<primary_domain>`, in the same way RFC 9116 treats serving at `/.well-known/security.txt`.

This model breaks when the primary domain's serving topology is owned by a hosted-platform edge. A Shopify-hosted merchant points their primary domain at Shopify's CDN; the merchant has no mechanism to drop a file at `brand.com/.well-known/llmo.json` without CDN-level access, which most merchants do not have. The same constraint applies to BigCommerce, Wix, Squarespace, and several CMS platforms with restrictive `/.well-known/` policies. The SaaS-hosted-brand population is large, growing, and as of v0.1.9 is structurally excluded from LLMO publication.

The fix has to satisfy three constraints simultaneously. (1) The merchant workflow stays trivial: app install plus one DNS record plus a publish button. No CDN-level work, no key handling. (2) Existing publishers serving at the primary path continue to conform without change. (3) The threat model remains intact: serving-location authority continues to bind to publisher control over a hostname under the primary domain, and signature verification continues to be the trust anchor.

## Decision

v0.1.10 introduces a single non-heuristic fallback location:

```
https://llmo.<primary_domain>/.well-known/llmo.json
```

The `llmo.` label is fixed. Resolvers SHOULD attempt the fallback when, and only when, the primary path is structurally absent: HTTP 404 at `https://<primary_domain>/.well-known/llmo.json`, DNS NXDOMAIN at `<primary_domain>`, or TCP connection refused on port 443. Other failure modes (5xx, 4xx other than 404, TLS handshake failures, response timeouts, 200 with non-LLMO content) MUST NOT trigger the fallback.

`entity.primary_domain` continues to declare the apex (`brand.com`), not the subdomain. The signed document is unchanged across this fallback. Rule S3 (§5.2) is expanded to accept either `<primary_domain>` or `llmo.<primary_domain>` as a serving-domain match for `entity.primary_domain`. The expansion is strictly broader, so every document conforming to S3 under v0.1.0 through v0.1.9 continues to conform unchanged.

The primary path is authoritative when it returns a usable document. Resolvers SHOULD NOT fetch the fallback when the primary path returned a usable response. Diagnostic tools MAY fetch both for comparison, but the document used for downstream conformance evaluation is the primary's.

Resolvers SHOULD negative-cache the primary's absence-class result for a bounded window (recommended default: 5 minutes) before re-probing. This caps amplification at one extra HTTP request per resolver per cache window for SaaS-hosted brands, not one per lookup.

The conformance level is SHOULD, not MUST, matching the §4.7 precedent for resolver-side behavior. Resolvers that do not yet implement the fallback remain conformant; documents at SaaS-hosted brands are discoverable to the population of resolvers that have adopted the SHOULD-clause, and that population grows as the spec is adopted.

## Alternatives considered

**DNS TXT discovery at `_llmo.<primary_domain>`.** A TXT record whose value is a URL the resolver fetches from. Considered and deferred (recorded as §8.13 reservation for v0.3). Four reasons. First, the flexibility is real (publishers could point at any host, any port, any path) but speculative: no current publisher requires more flexibility than `llmo.<primary_domain>` provides, and the Shopify motivating case is solved entirely by the fixed subdomain. Second, the implementation cost is substantial and recurring: every resolver needs URL parsing, scheme validation, port handling, RFC 1918 / localhost SSRF guards, and a redirect policy. The complexity is paid by every resolver implementer for the lifetime of the spec, regardless of how many publishers actually use the TXT mechanism. Third, the mechanism reintroduces the operational-friction half of [ADR-0005](/adr/0005-publisher-domain-proof-via-well-known/)'s argument against TXT-based publisher proof. ADR-0005's argument does not transfer cleanly to discovery (the trust binding remains the signature, not the TXT), but the operational-friction argument does. Fourth, adding the TXT mechanism later, motivated by a concrete publisher case, is a one-decision governance event; shipping both now would lock the spec into a permanent two-mechanism precedence matrix with combinatorial test surface (primary-success, primary-404-TXT-success, primary-404-TXT-malformed-fixed-subdomain-success, primary-404-TXT-200-but-mismatched-signature-fixed-subdomain-success, and so on).

**MUST conformance for resolvers.** Considered and rejected. A MUST clause would make every resolver that does not yet implement fallback non-conformant the moment v0.1.10 lands. Pre-launch the resolver population is small and controllable, but the v0.1 spec ships publicly soon thereafter, and MUST-grade resolver requirements become brittle: third-party resolvers written against an earlier v0.1.x patch silently become non-conformant on the v0.1.10 update without a code change. SHOULD matches the §4.7 precedent for resolver-side behavior and preserves forward-compatibility of resolver implementations across patch versions.

**Tier-bound conformance (SHOULD at Standard, MUST at Strict).** Considered and rejected. Structurally tempting because it mirrors §5's tier partitioning of document-side rules. Rejected because it introduces two-path resolver implementations for a discoverability gain that plain SHOULD already produces as ecosystem adoption progresses. The implementation cost would be paid by every Strict-tier resolver forever.

**Broader trigger conditions.** Triggering fallback on any non-2xx response, or on 200-with-invalid-content, was considered. Rejected because it would mask publisher misconfiguration (a publisher who shipped a malformed document at the primary path would silently have a different document served under their name from the fallback) and would route around security-class failures (TLS handshake errors are indistinguishable from active interception; falling back would suppress the signal). The chosen trigger condition is the minimum set that covers the absence-class motivating case without masking presence-with-failure modes.

**Fallback wins on mismatch.** Considered and rejected as incoherent with the serving-location authority model. A "fallback wins" rule would let an attacker controlling `llmo.<primary_domain>` (via subdomain takeover) supersede the brand's legitimate document at the root. Primary always wins.

**Per-publisher `entity.serving_locations` field.** Considered and rejected for v0.1.10. The field could explicitly declare authorized fallback hosts as a defense-in-depth signal. Rejected because: the field cannot gate resolver discovery (resolvers haven't fetched the document yet, so they cannot consult its fields to decide where to look); signature verification already binds authenticity regardless of serving location, making the field's marginal defense-in-depth small; and adding optional schema fields for speculative future use is the kind of scope creep ADR-0006's additive-only rule is designed to guard against.

**HTTP 302 edge redirect from primary to fallback.** Publishers configure their primary edge to return `302 Found` on `/.well-known/llmo.json` with a `Location:` header pointing at `https://llmo.<primary_domain>/.well-known/llmo.json`. Considered and rejected as the discovery mechanism. §2.3 already permits redirects within the same registrable domain, so a publisher who has CDN-level access to configure a 302 on `/.well-known/*` can do so today without any new spec mechanism. The rejection is not "302 is bad"; it is "302 does not solve the motivating problem." The Shopify-hosted-merchant population lacks the CDN-level access to configure custom edge redirects on `/.well-known/*` paths in the first place. A merchant with that access could publish the file at the primary path directly and would not need a fallback at all. The 302 path is operationally redundant with the constraint that motivated v0.1.10.

**Entirely-separate-domain Swap-style discovery.** Publishers serve their LLMO document at an unrelated domain (`brandllmo.example`, an llmo.com-operated hostname, or other third-party domain) and the resolver discovers this separate domain via some indirection at the primary. Considered and rejected. Two reasons. First, it breaks the serving-location authority model recorded in [ADR-0005](/adr/0005-publisher-domain-proof-via-well-known/): the brand's claim that `brandllmo.example` speaks for `brand.com` would itself need a proof mechanism, which is exactly the protocol problem LLMO already solves at the primary domain. Second, it reintroduces the discovery-indirection complexity (TXT, link relation, or similar) that the fixed-subdomain approach avoids. The fixed-subdomain fallback in §2.6 is itself a constrained Swap-style pattern; the constraint that the fallback hostname be `llmo.<primary_domain>` rather than an arbitrary separate domain is what keeps authority bound to DNS control over the primary domain.

**Merchant-CDN-configuration-only path.** Require SaaS-hosted merchants to configure their primary CDN (Shopify, BigCommerce, Squarespace, Wix, or similar) to serve LLMO files at `/.well-known/llmo.json` directly, with no fallback mechanism in the spec. Considered and rejected as the way forward for the motivating population. Most SaaS-hosted merchants on standard plans lack CDN-level configuration access (Shopify's merchant-facing UI does not expose `/.well-known/*` serving on standard plans; the same holds for several BigCommerce and Wix tiers). Where the access exists, configuring per-path serving is operationally complex and drives drop-off in onboarding flows that depend on app-install-plus-DNS-only friction. LLMO's value proposition for the SaaS-hosted population is structurally tied to keeping merchant configuration trivial; a CDN-config-only path forfeits that value. Note that this rejection is conditional on the current SaaS-platform topology; a future shift in how hosted-platform edges expose `/.well-known/*` to merchants could change the calculus and is welcome.

## Consequences

**Positive.**

- SaaS-hosted publishers can conform to Standard tier. Rule S3 accepts `llmo.<primary_domain>` as a serving-domain match for `entity.primary_domain`, so the brand's signed document validates the same way regardless of which path serves it.
- Merchant onboarding stays trivial: one DNS CNAME at the merchant's DNS provider (pointing at the llmo.com tenant edge, or at infrastructure operated by another LLMO service provider). No CDN-level work, no key handling. Same friction class as DKIM, Klaviyo, or other common third-party service CNAMEs that merchants routinely configure.
- Existing publishers are unaffected. v0.1.0 through v0.1.9 documents continue to verify and conform exactly as before; the change broadens what's acceptable, not what's required.
- The serving-location authority model is preserved. Publishing at `llmo.<primary_domain>` is still publishing under a hostname whose DNS record only the brand's DNS-controlling entity can write. The cryptographic trust anchor (signature verification against the publisher's JWKS) is unchanged.

**Negative.**

- Resolvers may make up to two HTTP requests per lookup for publishers using the fallback (one to primary, one to fallback). Negative caching of the primary's absence-class result mitigates this to one extra request per resolver per cache window for the SaaS-hosted population.
- Dangling `llmo.<primary_domain>` CNAMEs are subject to subdomain takeover. A merchant who decommissions their llmo.com tenant but leaves the DNS record pointed at the deallocated target enables an attacker who claims the target to serve content at the fallback hostname. The residual is availability-class, not authenticity-class: an attacker cannot produce a document with a valid signature under the brand's publication key without access to that key. Mitigations are operational hygiene on the publisher's side (remove the DNS record when decommissioning) and signature verification on the consumer's side, which is the standing trust property of LLMO. The spec recommends publishers remove the `llmo.` record on tenant deallocation.
- Spec governance now owes maintenance to two discovery surfaces (primary and fixed-subdomain fallback). The cost is small (one extra spec section, one rule expansion, one ADR) but real.
- The non-heuristic prohibition in §2.5 is amended. The absolute character of "silent failure is preferable to false positives" is weakened in exchange for SaaS-platform coverage. The trade is explicit and bounded: only the fixed-subdomain location is permitted; all other heuristic discovery (alternate paths, alternate hostnames, link-relation discovery) remains prohibited.

**Neutral.**

- The DNS TXT discovery mechanism is reserved for v0.3 (§8.13) pending concrete publisher need. Adding it later, if needed, is a one-decision governance event. The spec does not pre-commit to it.
- The implementation pattern for llmo.com (and analogous service providers) is operational, not normative: provision a per-tenant edge endpoint at a stable hostname (e.g., `tenant-name.edge.llmo.com`), then have the merchant CNAME `llmo.<their_primary_domain>` to that endpoint. The spec normatively specifies only the publisher-facing fallback hostname and the resolver behavior around it; how service providers operate their edges is implementation detail.
- This ADR is filed without an accompanying LIP. The pattern for v0.1.9's normative additions (LIP-4 KT registry, LIP-5 disavowal category) was LIP-plus-ADR. The departure here is deliberate: resolver-fallback shapes resolver behavior and amends one conformance rule without adding claim types, registry surfaces, or document fields. The operational-decision character fits ADR shape; ADR-0005 sets the precedent for serving-location decisions via ADR alone.

## References

- v0.1.10 release cut: PR to be filled in on merge.
- [§2.1](/spec/v0.1/#21-location), [§2.5](/spec/v0.1/#25-discovery-failure), [§2.6](/spec/v0.1/#26-resolver-fallback-for-saas-hosted-publishers), [§5.2](/spec/v0.1/#52-standard-conformance), [§8.13](/spec/v0.1/#8-open-questions-for-future-versions): the spec sections this ADR governs.
- [ADR-0005](/adr/0005-publisher-domain-proof-via-well-known/): publisher domain proof via well-known. The serving-location authority model this ADR extends, and the source of the operational-complexity argument the TXT-discovery alternative would have re-litigated.
- [ADR-0006](/adr/0006-version-bump-and-release-cut/): v0.1.x patch policy. v0.1.10 satisfies the additive-only rule (every document conforming to the prior schema continues to conform unchanged; only the document-side rule S3 is broadened).
- [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/): the authority under which this addition lands without observing the LIP-1 §10 14-day window or filing a LIP.
- `content/spec/changelog.md`: v0.1.10 entry.
