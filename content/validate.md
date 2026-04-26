---
title: Validator
description: Reference validator for llmo.json documents.
---

The reference validator for `llmo.json` documents is hosted at **[validate.llmo.org](https://validate.llmo.org)**.

It runs entirely in your browser. Nothing is uploaded.

## Why it lives at a separate subdomain

The validator is hosted on Cloudflare Pages, separately from the specification site on Mintlify, so that tooling can evolve independently of the spec. The URL is stable and will continue to serve future versions of the validator as the specification evolves.

Source code, deployment details, and infrastructure documentation are available at:

- [openllmo/llmo-validator](https://github.com/openllmo/llmo-validator) (source)
- [infrastructure/VALIDATOR.md](https://github.com/openllmo/llmo.org/blob/main/infrastructure/VALIDATOR.md) (operational documentation)

## What the validator does

- Parses a pasted `llmo.json` document, or fetches one from a user-provided domain's `/.well-known/llmo.json`
- Validates against the [published JSON Schema](/spec/v0.1/schema)
- Reports which conformance tier (Minimal, Standard, Strict) the document achieves per §5.1, §5.2, §5.3
- Displays per-rule results with spec section citations
- Provides a self-test against the [strict test vector](/spec/v0.1/test-vectors)

## What the validator does not do

- Cryptographic signature verification. The validator reports whether a signature field is structurally present and well-formed, but does not verify the signature against a public key. Implementers verify signatures using the procedure in §4 and the test vectors at [/spec/v0.1/test-vectors](/spec/v0.1/test-vectors).

See the [validator itself](https://validate.llmo.org) for usage instructions, self-test, and current limitations.
