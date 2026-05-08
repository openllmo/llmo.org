---
title: Press
description: Press kit, project status, and contacts for journalists covering LLMO.
date: 2026-05-08
---

## What LLMO is

LLMO is the cryptographic trust layer for verifiable AI. Organizations cryptographically sign their identity, claims, and provenance; AI agents and language models verify them.

Concretely, every organization publishes one signed JSON document at `/.well-known/llmo.json` on its primary domain. The document contains claims about the organization: identity, official channels, leadership, signatures, disavowals, and supersessions of external content. AI systems fetch the document, verify the signature against the publisher's domain, and use the claims as authoritative. The protocol does not impose a central trust authority; the canonical location, the canonical format, and the verification model are defined, and trust judgments remain the consumer's responsibility.

## Why it matters

The information layer that AI systems train on and reason over is corrupted at scale. Review platforms are gamed through fake reviews and paid manipulation; SEO optimizes for rank rather than accuracy; the channels through which organizations are described in public have no native primitive for the organization itself to make signed assertions of fact.

Language models trained on this corpus inherit the distortions. Agents acting on those models inherit them again. World models assembled from agents inherit them a third time. The signal-to-noise problem compounds at each layer.

LLMO does not solve the trust problem. It gives organizations a sovereign channel to publish their own canonical assertions, signed and time-bounded, that AI systems can verify against the publisher's domain. That is one of the preconditions for a healthier information layer; it is not a complete solution.

## Current status

- Specification v0.1 published 2026-04-17.
- Seven versioned releases through 2026-05-08 (v0.1.0 through v0.1.6).
- Reference command-line tool published on npm: [llmo](https://www.npmjs.com/package/llmo).
- Web validator runs at [validate.llmo.org](https://validate.llmo.org), redirected to [/validator/](/validator/).
- Improvement Proposal process active: see [LIPs](/spec/lips/).
- Architectural Decision Records published: see [ADRs](/adr/).
- Recent activity in plain language: see [Updates](/updates/).
- Formal record of specification changes: see [Changelog](/spec/changelog/).

## Who maintains it

The LLMO specification is stewarded by **Diverse.org**, a California 501(c)(3) nonprofit public benefit corporation. Diverse.org's programmatic focus is open-standards work for the AI-mediated web; LLMO is the organization's flagship project.

Nic Chavez is the v0.1 specification author and the current LIP editor. The governance model is documented at [/about/governance/](/about/governance/), including the planned transition from author-decided revisions during pre-release to a broader community process from v0.2 onward.

The specification is stewarded by the nonprofit Diverse.org. Commercial activity around LLMO, including the validator-as-a-service product at llmo.com, is structurally separated and operated by Greyfront, Inc., a Delaware C-corporation, under a documented two-entity firewall recorded in [ADR-0001](/adr/0001-two-entity-firewall/).

## Key technical claims

- Documents are JSON, schema-validated, served at `/.well-known/llmo.json`. See spec [§2](/spec/v0.1/#2-publication-and-discovery).
- Signatures use JWS over JCS-canonicalized payloads. ES256, ES384, and EdDSA are the registered algorithms for v0.1. See spec [§4.2](/spec/v0.1/#4-2-signature-algorithms).
- Conformance is tiered into Standard and Strict, with explicitly labeled rules (S1 through S6 for Standard; X1 through X6 for Strict). See spec [§5](/spec/v0.1/#5-conformance).
- JWKS handling uses trust-on-first-use semantics with explicit consumer-side caching and key-rotation rules. See spec [§4.6](/spec/v0.1/#4-6-jwks-trust-anchor) and [§4.7](/spec/v0.1/#4-7-jwks-handling).
- Disavowal and supersedes claim types are scope-constrained to publisher self-statements and impersonation defense. Third-party-targeting variants are out of conformance. See spec [§3.5](/spec/v0.1/#3-5-claim-types).

## Logos and brand

The LLMO wordmark and logo may be used to refer to the protocol and its specification. Please do not modify the marks or use them in a way that suggests endorsement.

- Light-on-dark SVG: [/logo/llmo-light.svg](/logo/llmo-light.svg)
- Dark-on-light SVG: [/logo/llmo-dark.svg](/logo/llmo-dark.svg)
- Red mark, reserved for commercial contexts: [/logo/llmo-red.svg](/logo/llmo-red.svg)

## Contact

- General inquiries: [/about/contact/](/about/contact/).
- Security disclosures: [security@llmo.org](mailto:security@llmo.org). The PGP key for encrypted reports is published at the contact page.
- LIP submissions and process questions: see the [LIP-1](/spec/lips/lip-0001/) document for the formal process; submissions land via pull request to the project repository on GitHub.

## Recent activity

For week-by-week narrative summaries of project activity in plain language, see [Updates](/updates/). For the formal record of specification text changes, see the [Changelog](/spec/changelog/). For decisions about how the project itself is run, see [ADRs](/adr/). For deferred work and operational dependencies, see the project's `BACKLOG.md` in the [GitHub repository](https://github.com/openllmo/llmo.org).
