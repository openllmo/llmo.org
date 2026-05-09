---
title: "ADR-0005: Publisher domain proof via well-known location, not DNS TXT"
linkTitle: ADR-0005
description: Publisher domain control is proven by serving `/.well-known/llmo.json`, not by DNS TXT records. Same model as RFC 9116 security.txt; redundant with file-serving requirement; DNS TXT is reserved for LIP namespace proof.
author: Nic Chavez <spec@llmo.org>
date: 2026-04-17
status: Accepted
---

## Status

Accepted. Backfill: this records a decision made at v0.1.0 publication on 2026-04-17, when the well-known location was first established as the publisher authority primitive. ADR written 2026-05-09 to close the institutional-record gap surfaced when the rationale was re-asked during a threat-model review; the answer existed only in prior conversation history.

## Context

LLMO publishers assert claims about themselves (identity, official channels, leadership, and other entity facts) by serving a signed JSON document at `/.well-known/llmo.json` on their primary domain. The protocol's trust model rests on the binding between document and serving domain: a document fetched from `https://acme.com/.well-known/llmo.json` is treated as authoritative for `acme.com`. The Standard-tier rule S3 (per §5.2) enforces the binding by requiring `entity.primary_domain` to match the domain serving the file; a mismatch downgrades the document.

A natural design question arises: how should a publisher prove they actually control the domain they are publishing for? Many systems handle this with DNS TXT records. Google Workspace setup, ACME / Let's Encrypt domain validation, and SaaS provisioning flows all use the pattern: the would-be publisher adds a TXT record at a specified label, and the system verifies the record before granting access or issuing credentials.

LLMO does NOT use DNS TXT records for publisher domain proof. The decision is recurring conflation point because LLMO DOES use DNS TXT records for a different purpose. LIP-1 §4 step 4 requires a DNS TXT record at `_llmo-lip.<namespace-domain>` as anti-flood proof of namespace control when proposing extension claim types. That is a different mechanism, for a different threat, on a different surface. This ADR exists to record the publisher-side decision and to mark the boundary between the two surfaces so the conflation does not silently re-litigate the trade-off.

## Decision

Publisher domain control is proven by the act of serving the file at `/.well-known/llmo.json` on the publisher's primary domain. No DNS TXT record is required. No registration step is required. No central authority issues credentials.

This is the trust model used by RFC 9116 (security.txt). Serving a file at a well-known location IS the proof of control: the act of being able to publish at `https://acme.com/.well-known/security.txt` demonstrates that the publisher controls `acme.com`'s web infrastructure. The serving location is the credential.

LLMO inherits this model. An attacker who wants to assert false claims as `acme.com` would need to publish at `https://acme.com/.well-known/llmo.json`, which requires control of the web server at `acme.com`. The attacker can sign a fabricated document on their laptop, but cannot publish it at a location consumers will treat as authoritative for `acme.com`. The signed document just sits on the attacker's machine, useless.

The only place an attacker can publish their fabricated document is somewhere they actually control, e.g. `evil-clone.com/.well-known/llmo.json`. When a consumer fetches that URL, the document's `entity.primary_domain` claim (which says `acme.com`) does not match the serving domain (`evil-clone.com`), and rule S3 catches the mismatch.

## Alternatives considered

- **DNS TXT record proof of control.** Considered and rejected. The publisher would add a TXT record at `_llmo.<primary_domain>` (or similar) with a value tying them to their JWKS or to a registration nonce. Rejected for four reasons: (1) **Redundancy.** An attacker who can publish DNS records on a domain almost certainly can also publish at `/.well-known/`, and vice versa. The two surfaces are typically controlled by overlapping admin populations. Adding DNS TXT would be doing the same job twice. (2) **No additional threat coverage.** The threats DNS TXT could catch (impersonation by someone without web-server access) are already caught by the file-serving requirement. The threats DNS TXT cannot catch (impersonation by someone with full domain control, which includes both web and DNS) are also not caught by the file-serving requirement, and adding DNS TXT does not help. (3) **Operational friction.** DNS TXT records require coordination between web operations (who deploys the file) and DNS operations (who manages records), which are often different teams or different vendors at any non-trivial publisher. Requiring both adds publisher onboarding friction without proportional security benefit. (4) **Provisioning complexity.** A DNS TXT proof implies a registration flow: someone issues a nonce, the publisher publishes the TXT, someone verifies. That implies a central authority or registration service, which contradicts LLMO's design intent of being a permissionless protocol with no gatekeepers.

- **Central registration authority.** Considered and rejected. A registration service that issues publisher IDs and ties them to domains. Rejected because it contradicts the core design intent: LLMO is a publishing protocol, not a directory service. Anyone who controls a domain can publish; consumers verify the domain-binding cryptographically against the JWKS the publisher serves. No central authority sits in the path.

- **Email-based proof of publisher domain.** Considered and rejected. Email-based proof IS used in a separate LLMO surface (validator receipts can be requested via `admin@<domain>` to obtain an attested validation receipt out of band), but as a publisher-domain proof it carries the same redundancy and provisioning-complexity problems as DNS TXT, plus the additional weakness that email-receiving infrastructure and web-serving infrastructure are typically different again, multiplying the operational coordination cost.

## Consequences

**Positive.**

- Publishers have a single operational requirement: control the web server at their primary domain. No additional steps, no DNS coordination, no registration.
- The threat model treats web-server-control as the publisher authority primitive. Anyone who can publish at `/.well-known/llmo.json` IS the publisher for threat-model purposes. This is a stable foundation for downstream reasoning about claim authenticity.
- The pattern is already familiar to operators from RFC 9116 and the broader well-known-URI ecosystem (`openid-configuration`, `acme-challenge`). The cognitive load of adopting LLMO is bounded by what publishers already know.
- The permissionless property is preserved. Any domain operator can publish without coordinating with a registry, an authority, or the LLMO project itself.

**Negative.**

- Web-server compromise alone does not enable claim forgery, but only because the signing key is held separately (KMS, HSM, or other out-of-band custody). This is a load-bearing property of the design. Publishers who co-locate signing keys with web-serving infrastructure forfeit the property without the protocol detecting the loss. Key-custody discipline is a publisher responsibility that the protocol cannot enforce.
- An attacker with web-server access can deny service or replay older documents within their validity windows. This is bounded by the document's `valid_until` and by consumer caching behavior, but it is a real residual.
- First-time consumers face residual JWKS-substitution risk. A consumer who has never fetched a publisher's JWKS before cannot distinguish a legitimate JWKS from an attacker-substituted one in the case where the attacker has both web-server access AND the ability to mint new signatures with their substituted key. Trust-on-first-use semantics from §4.6 and the consumer-side caching in §4.7 partially mitigate this for repeat consumers; first contact remains a residual.

**Neutral.**

- DNS TXT for LIP submissions is unaffected by this ADR. LIP-1 §4 step 4 uses DNS TXT (`_llmo-lip.<namespace-domain>`) for a different purpose: anti-flood proof of namespace control when proposing extension claim types. That is namespace authority for the registry, not publisher authority for claims. Different surface, different threat, different mechanism. The two surfaces do not interact.
- Validator receipts via `admin@<domain>` email remain available as a separate, optional, out-of-band attestation surface. They do not substitute for the well-known proof; they are a complementary signal a publisher can choose to surface for consumers requiring stronger out-of-band identity binding.

## Note for future stewards

This ADR exists because the publisher-vs-LIP distinction is easy to conflate. If you find yourself wondering "should LLMO add DNS TXT proof for publishers?", the answer is documented above. The decision is not "DNS TXT is bad"; it is "DNS TXT solves a problem LLMO does not have, in exchange for operational complexity and conceptual coupling to a registration model that contradicts LLMO's design intent." Re-derive the trade-off if you must, but do not add the mechanism without first answering: what threat does this catch that the file-serving requirement does not?

## References

- §5.2 rule S3: `entity.primary_domain` matches the domain serving the file (the conformance rule that catches mismatched-serving-domain attacks).
- §4.6 and §4.7: trust semantics and consumer-side JWKS handling, including the trust-on-first-use property and the 24-hour cache cap.
- §6.4: comparison to security.txt (RFC 9116) and the broader well-known URI ecosystem.
- LIP-1 §4 step 4: DNS TXT proof of namespace control for LIP submissions, the separate surface this ADR distinguishes from publisher proof.
- RFC 9116 (security.txt): the prior art whose trust model LLMO inherits for publisher proof.
