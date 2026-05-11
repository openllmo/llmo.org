---
title: "ADR-0007: Claude as builder, not just consumer"
linkTitle: ADR-0007
description: LLMO documents are assembled by an LLM agent on the publisher's behalf, not authored by the publisher. The publisher contributes their email of record and consent; the agent derives the rest from public sources, normalizes via the controlled vocabulary, structures under the schema, and tags each claim with provenance markers before the publisher reviews and signs.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-11
status: Accepted
---

## Status

Accepted. Forward-looking: codifies the architectural framing that governs v0.1.8 and subsequent protocol work. The framing was implicit in earlier conversations but had not landed as a written architectural decision; this ADR closes that gap before v0.1.8's schema design relies on it.

## Context

The original v0.1 specification was written publisher-first: the publisher's job is to author and serve `/.well-known/llmo.json` on their primary domain. Schema fields, claim types, and worked examples assume a publisher who understands the protocol well enough to populate the document by hand or via their own tooling.

In practice, that's a narrow population. Most domain owners do not have the technical depth or the time to learn a new protocol, populate a structured signed document, manage a JWKS, sign per-claim, and serve at a well-known location. If LLMO requires that depth as the cost of admission, the ecosystem will be small.

The actual deployment model that closes this gap: a publisher provides their email address of record and consents to publication. An LLM agent (Claude, in the reference deployment; any sufficiently capable agent in alternative deployments) does the work of assembling the document. The agent:

- Verifies the publisher's claim over the domain implied by the email address (mechanism out of scope of this ADR; ADR-0005 governs the well-known location as the trust anchor).
- Queries public sources about the entity: the publisher's website (HTML metadata, schema.org structured data, content extraction), Wikidata, business registries (IRS EIN, state Secretary of State, Companies House, DUNS, LEI), open directories, and the publisher's own non-LLMO surfaces (documentation pages, contact pages, location pages, hours pages).
- Normalizes extracted values into protocol-canonical names via the controlled vocabulary at `/glossary/`. "Free wifi available" becomes `wifi: true`. "Open till midnight" becomes a periods entry with the appropriate `close` value. "Visa, Mastercard, American Express accepted" becomes the corresponding payment_methods array.
- Structures the normalized values under the v0.1.x schema. New claim types added in v0.1.8 (contact_points, categories, locations, hours, attributes, operational_status) are schemas the agent fills, not surfaces the publisher hand-codes.
- Tags each claim with `provenance_markers` recording how the claim was derived: `source:publisher-website`, `source:wikidata`, `cross-validated:yelp,apple`, `confidence:high`, `auto-extracted-from-site`, `human-reviewed:<date>`. These are advisory signals for downstream consumers, not authoritative claims about the claim's correctness.
- Presents the assembled document to the publisher for review. The publisher confirms or corrects, then consents. The agent signs (using a key the publisher controls, per the existing JWKS pattern) and publishes.

This model changes the design constraints on the protocol itself. Every new field should be derivable by the agent from public sources or surfaceable as a minimal wizard question to the publisher. Vocabulary harmonization is no longer optional documentation but a load-bearing piece of agent infrastructure: without a single normalization target, every agent invents its own and the ecosystem fragments into per-implementation dialects. Provenance markers are not optional metadata but the agent's per-claim audit trail, communicating to downstream LLM consumers how each piece of data was produced.

## Decision

**LLMO documents are agent-assembled, publisher-consented.** The protocol's design defers to this model:

1. **Schema fields are evaluated against two tests, not one.** The original test was: "does this contribute to giving a consumer LLM the richest, most accurate signal about the entity?" A second test joins it: "can a builder agent populate this from public sources, or surface it as a minimal wizard question to the publisher?" A field that fails the first test does not earn inclusion. A field that fails the second test signals a design problem: either the field is too high-effort to be populated at scale, or the publisher's expected input has grown beyond what the deployment model assumes.

2. **The controlled vocabulary at `/glossary/` is normative agent infrastructure.** Attribute names, status enums, well-known keys, and other structured strings SHOULD come from `/glossary/`. The vocabulary is the agent's normalization layer; without it, ecosystem reproducibility degrades. The vocabulary is curated against incumbent production systems (GMB, Yelp, Bing, Apple) to inherit the user-query data and decades of iteration those teams have invested. The glossary is published at `https://llmo.org/glossary/`, indexed for agent retrieval, and human-readable for publishers and reviewers.

3. **`provenance_markers` on the claim envelope are the agent's per-claim audit trail.** Spec text per v0.1.8 §3.4: publishers MAY tag claims with provenance, freshness, and validation markers; consumers MAY use as advisory signal for confidence calibration and freshness ranking; consumers MUST NOT treat as authoritative. Markers are inside the signed payload by design; they are part of what the publisher consents to and what consumers can read.

4. **Publisher input is bounded by the email-and-consent floor.** New protocol additions that would require publisher input beyond email of record + consent + targeted review questions MUST justify the additional input cost. The default is: the agent figures it out and the publisher checks the agent's work.

This framing is forward-looking. It does not retroactively reshape v0.1's existing claim types, which were designed publisher-first. It does shape v0.1.8 and onward, where new fields are chosen and named with the agent's job in mind.

## Alternatives considered

- **Pure publisher-authored.** The original v0.1 framing. Considered and rejected as the long-term deployment model: the publisher technical depth required to author llmo.json by hand is a hard ecosystem-scale constraint. Allowing agent assembly does not preclude publishers who want to hand-author; pure publisher-authored as the only mode would preclude the agent path.

- **Agent-only, no publisher consent step.** Considered and rejected. The publisher's signature is the trust anchor: a document signed under keys the publisher controls is the publisher's statement, even when an agent assembled the contents. Skipping the consent step would mean the agent's output is published unilaterally, which breaks the publisher's authority over their own data and the protocol's trust model. Consent is the floor.

- **Multiple competing agents with no normalization layer.** Considered as the laissez-faire option. Rejected because it produces ecosystem-level fragmentation: agent A says `wifi: true`, agent B says `wireless_internet: yes`, agent C says `has_wifi: 1`. Consumers cannot reliably answer "does this place have wifi" across publishers, defeating the protocol's purpose. The controlled vocabulary at `/glossary/` is the alternative to fragmentation.

- **Wizard without an agent.** A publisher-facing wizard that asks structured questions and writes the document, without an LLM agent doing extraction. Considered as a lower-capability fallback. Rejected as the primary mode because the input cost to the publisher is much higher (the wizard has to ask everything the agent could extract). The wizard is plausible as a fallback when the agent's extraction fails or as a power-user mode for publishers who prefer not to use the agent path; the agent path remains primary.

## Consequences

**Positive.**

- Ecosystem scale unblocked by publisher technical depth. Any domain owner who can confirm their email and review an assembled document can participate; the protocol's bar to entry stops being "learn the protocol, manage JWKS, sign per-claim, host a JSON file."
- Vocabulary harmonization across the ecosystem. Publishers who go through the agent path get the same canonical names; consumers can answer entity queries reliably without per-publisher normalization rules.
- Provenance markers give downstream consumers calibration signal. An LLM consumer ingesting a document can weight claims by their marker set (recently human-reviewed vs auto-extracted; cross-validated against three sources vs single-source). This is a richer calibration surface than confidence enum alone.
- The publisher's role is honest about what it is: consent and review, not authoring. The publisher signs; the agent assembles; both are visible in the document via the signature and the provenance markers.

**Negative.**

- The trust model is more nuanced. A publisher signs work an agent did. Markers are advisory not authoritative. Downstream consumers need to know that markers are the agent's claims about how it derived the data, not the publisher's claims about correctness. The disambiguation lives in spec text and in `/glossary/`; it costs documentation surface area.
- Field design is harder. Every new field has to pass both the consumer-richness test and the agent-derivability test. Fields that are valuable for consumer queries but require complex publisher input are no longer trivially includable. The discipline is correct but the choices are sometimes uncomfortable.
- The controlled vocabulary becomes a steady-state responsibility, not a one-time deliverable. Categories evolve, new attribute names emerge, payment methods proliferate, business models change. The glossary needs ongoing curation; without it, the vocabulary drifts and the normalization benefit erodes.

**Neutral.**

- This ADR does not retroactively change v0.1 claim types. v0.1 was designed publisher-first; v0.1.8 and onward incorporate the agent-builder framing. Earlier claim types remain as designed; their agent-assembly properties improve as the agent and glossary mature, without requiring schema changes.
- Alternative implementations (different agent vendors, different wizards, hand-authored documents) are all permitted. The publisher signs; the protocol's trust model does not care how the document was assembled. The agent-builder framing is the reference deployment model and the design lens for future protocol work, not a normative requirement on implementations.

## References

- v0.1.8 schema bump: PR to be filled in on merge.
- `content/glossary/_index.md`: the controlled vocabulary the agent normalizes against.
- v0.1.8 `static/spec/v0.1/schema.json`: introduces `provenance_markers` on the claim envelope.
- ADR-0005: publisher domain proof, which is the trust anchor independent of who assembled the document.
- ADR-0006: patch policy and release-cut automation, which shape how this ADR's reference deployment evolves over time.
