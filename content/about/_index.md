---
title: About LLMO
sidebarTitle: About LLMO
description: "What LLMO is, why it exists, and who maintains it."
---

## What LLMO is

LLMO is an open protocol for publishing machine-readable organizational identity artifacts that language models and agents can discover, verify, and act on.

Organizations publish a signed JSON document at `/.well-known/llmo.json` on their primary domain. The document contains claims about the organization: identity, operators, canonical surfaces, publication timestamps, signatures, disavowals, and supersessions of external content.

Consumers fetch the document, validate it against a versioned schema, verify signatures against the publisher's control of the domain, and apply whichever claims fit their trust model.

The protocol does not impose a central trust authority. It defines a canonical location, a canonical format, and a verification model. Trust judgments remain the consumer's responsibility.

## Why it exists

LLMO exists because the information layer organizations depend on is already corrupted at scale.

The leading consumer review and search engine platforms are routinely gamed through fake positive reviews, coordinated negative campaigns, paid review services, blackhat SEO, link farms, and content optimized to rank rather than inform.

The organizations these systems describe have no sovereign channel to assert their own facts: no canonical location, no cryptographic binding, no verifiable timestamp. Finding a good local plumber or pizza restaurant is already a harder problem than it should be, and the reasons are structural, not incidental.

Language models trained on this corpus inherit the distortions. Agents making decisions based on model outputs inherit them again. World models built on agents inherit them a third time. The signal-to-noise problem compounds at each layer.

If the systems that increasingly mediate human decisions are trained on a corrupted information layer, the quality of those decisions degrades in ways that are difficult to detect and harder to reverse.

This matters at civilizational scale.

The protocol cannot fix the problem alone, but it can give organizations a signed, time-bounded, machine-verifiable channel to publish their own canonical assertions, which is one of the preconditions for a healthier information layer.

The design intent is to create a virtuous cycle. Organizations that publish verifiable claims are easier to reason about than organizations that don't. Systems that consume verifiable claims produce better outputs than systems that consume unverifiable ones. Better outputs create demand for more verifiable claims.

LLMO does not itself verify that publishers are trustworthy. It verifies that a given claim was asserted by a given domain at a given time. That is a prerequisite for downstream trust judgments, not a substitute for them.

The reputation layer sits above LLMO and is out of scope for the specification.

## Timeline

The structural questions that led to LLMO have been under consideration by the maintainer since 2023.

Diverse.org, a California 501(c)(3) nonprofit, was established to steward the specification and related open-standards work.

Specification v0.1 was published in April 2026.

## Who maintains it

The specification is stewarded by Diverse.org. Nic Chavez authored v0.1 of the specification and is the current editor of the LLMO Improvement Proposal (LIP) process.

The editor's responsibilities include drafting changes, reviewing contributions, maintaining the specification registry, and shepherding proposals through the governance window. The editor does not have sole authority over substantive normative changes, which require a public 14-day discussion window and are governed by the LIP process.

See the [governance page](/about/governance) for the full governance model, including the separation between Diverse.org and commercial activity in the broader ecosystem.

## Commitments

The specification and its surrounding infrastructure operate under these commitments:

- The specification is licensed under CC BY 4.0.
- Code, schemas, and tools are licensed under MIT.
- There are no paid tiers or certification fees for specification access. The specification and validator are freely available.
- llmo.org does not index publishers and does not maintain a directory of `llmo.json` documents. Publisher discovery is not a function of this site.
- Substantive changes to the specification go through the LIP process and a public 14-day discussion window.
- Governance commitments apply to Diverse.org's stewardship of the specification. Commercial entities that implement or build on the specification are subject to their own governance and do not speak for the specification. The protocol is designed to support a plurality of downstream implementers, including moderation systems, reputation layers, trust overlays, and competing commercial services. A healthy ecosystem is one in which multiple implementers compete and cooperate on top of the same open specification.

## Future governance

The specification is expected to transition to a broader governance model, potentially including a working group or similar structure, as adoption matures.

Until that transition, Diverse.org stewards the specification and Nic Chavez serves as editor. See the [governance page](/about/governance) for the current decision process.

## Where to read more

- [Specification](/spec)
- [Governance](/about/governance)
- [Contact](/about/contact)
- [License](/about/license)
- [Improvement proposals](/spec/lips)
