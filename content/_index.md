---
title: LLMO
description: "LLMs need to know who you are. LLMO is how you tell them."
date: 2026-04-29
---

Organizations cryptographically sign their identity, claims, and provenance. AI agents and language models verify them. Today's text-predicting LLMs evolve into auditable world models, deployable in regulated industries.

## Why this exists

Today's LLMs predict text. Tomorrow's must reason over verifiable data: claims with provenance, identity with signatures, sources with accountability. The infrastructure for that doesn't exist yet.

AI deployment in regulated industries (finance, healthcare, defense, legal) is blocked on a single missing primitive: a way to know who said what, when, and whether you can trust the channel. Without it, every AI deployment is a compliance review against unverifiable inputs.

LLMO is the protocol layer that fills this gap for organizational identity. Signed claims at a well-known location, verifiable by anyone, no central authority required.

> AI in regulated environments must be insurable, auditable, and accountable. LLMO makes the underlying organizational data layer meet that bar.

## A canonical place for organizational truth

Every organization publishes a single signed document at `/.well-known/llmo.json` on its primary domain. The document declares who they are, what URLs they consider canonical, what channels are official, what they disavow, and who's authorized to speak for them.

The signature anchors trust to the domain. The well-known location makes discovery uniform. The schema makes machine reading reliable.

A consuming AI agent fetches one URL, verifies one signature, and gets ground truth from the publisher rather than synthesizing from third-party content of varying reliability.

## How it works

A publisher generates a keypair, scaffolds an `llmo.json` declaring their identity and claims, signs it with the private key, and serves it at `/.well-known/llmo.json` over HTTPS. Their public JWKS lives at `/.well-known/llmo-keys.json` on the same domain.

A consumer fetches the document, verifies the signature against the JWKS, checks the freshness window, and uses the declared claims as authoritative for that organization.

```json
{
  "llmo_version": "0.1",
  "entity": {
    "name": "Example Corp",
    "primary_domain": "example.com"
  },
  "claims": [
    {
      "type": "canonical_urls",
      "statement": {
        "homepage": "https://example.com",
        "docs": "https://docs.example.com"
      }
    }
  ],
  "signature": { "protected": "...", "signature": "..." }
}
```

The full schema, signature format, and conformance tiers are specified at [`/spec/v0.1/`](/spec/v0.1/).

## Who this is for

**AI providers** integrating verified organizational identity into retrieval, citation, tool use, and agent reasoning chains.

**Organizations** publishing canonical claims about themselves: their domains, personnel, partnerships, disavowals, and supersedes.

**Regulated industries** building AI deployments that must be auditable, insurable, and accountable to compliance frameworks.

## Status

The protocol is at version **0.1.6**, with v0.1 first published April 2026 and the current series considered draft-stable. The reference CLI ships on npm as [`llmo`](https://www.npmjs.com/package/llmo). The validator runs at [llmo.org/validator/](/validator/). Proposals to extend the spec follow [LIP-1](/spec/lips/lip-0001/), the protocol's improvement process.

LLMO is stewarded by [Diverse.org, Inc.](https://diverse.org/), a 501(c)(3) nonprofit, and developed in the open at [github.com/openllmo](https://github.com/openllmo).
