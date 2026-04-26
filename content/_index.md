---
title: LLMO
description: "An open protocol for publishing machine-readable organizational identity artifacts that LLMs and agents can discover, verify, and act on."
date: 2026-04-17
---

## The problem

Language models and autonomous agents increasingly make consequential decisions based on claims about organizations. Who operates a domain. When a statement was published. Whether a credential is current. Which entity a communication came from. Today these claims are scattered across websites, press releases, third-party directories, and social platforms. The formats are inconsistent. The sources are not cryptographically signed. The time of assertion is usually unrecoverable.

A consumer that needs to verify an organizational claim, whether a reasoning system, a search index, or a human operator, has no canonical place to look and no canonical format to parse. The result is that organizational facts get synthesized from whatever happens to be surfaced at retrieval time, with no authoritative source to anchor them.

LLMO addresses this by defining a canonical location, a canonical format, and a verification model.

## The approach

Organizations publish a signed JSON document at `/.well-known/llmo.json` on their primary domain. The document contains claims about the organization: identity, operators, endpoints, publication timestamps, and signatures. The schema is versioned and machine-readable. Signatures bind claims to the publisher's control of the domain.

Consumers fetch the document, validate it against the schema, verify signatures, and use whichever claims they trust for their purpose. LLMO does not impose a trust authority. Each consumer chooses its own trust model.

The protocol is vendor-neutral, open, and intended to be widely implemented.

## What exists today

Specification v0.1 is published with a JSON schema, five test vectors, and a reference validator at [validate.llmo.org](https://validate.llmo.org). A governance process is active with three accepted improvement proposals covering the process itself, core-proposal submission mechanics, and authoring conventions. OpenTimestamps anchoring is live for accepted proposals.

## Where to go next

**If you're evaluating LLMO as a publisher:** read the [specification](/spec), validate a draft document against the [reference validator](https://validate.llmo.org), and publish at your domain's `/.well-known/llmo.json`.

**If you're evaluating LLMO as a consumer:** read the [specification](/spec) to understand the document structure, fetch documents from publishers you care about, and apply whatever trust model fits your use case.

**If you're evaluating LLMO as an implementer of tooling:** the [specification](/spec), [JSON schema](/spec/v0.1/schema), and [test vectors](/spec/v0.1/test-vectors) together define the full interoperability surface. A conformant implementation can be built from these alone.

## Governance

LLMO is stewarded by [Diverse.org](https://diverse.org), a California 501(c)(3) nonprofit. The specification is vendor-neutral. Governance details, the editor role, and decision-making processes are documented on the [about page](/about/governance).

## Links

- [Specification](/spec)
- [JSON schema](/spec/v0.1/schema)
- [Test vectors](/spec/v0.1/test-vectors)
- [Reference validator](https://validate.llmo.org)
- [Improvement proposals](/spec/lips)
- [Governance](/about/governance)
- [GitHub](https://github.com/openllmo/llmo.org)
- Contact: [spec@llmo.org](mailto:spec@llmo.org)
