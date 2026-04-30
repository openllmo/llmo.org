---
title: Validator
linkTitle: Validator
description: Reference validator for llmo.json documents. Checks structural conformance and cryptographic signature verification against the v0.1 specification.
date: 2026-04-30
weight: 4
aliases:
  - /validate/
---

This page checks whether an `llmo.json` document is well-formed, follows the [v0.1 specification](/spec/v0.1), and carries a valid cryptographic signature from the publisher.

In plain English: when an organization publishes an `llmo.json` file, they're making structured claims about themselves. Things like which domains they operate, which products are theirs, and which channels are official.

The validator confirms three things:

- **Shape.** The file parses against the [v0.1 JSON Schema](/spec/v0.1/schema.json).
- **Conformance.** The claims follow the rules at [§5.1 Minimal](/spec/v0.1#51-minimal-conformance), [§5.2 Standard](/spec/v0.1#52-standard-conformance), or [§5.3 Strict](/spec/v0.1#53-strict-conformance).
- **Signature.** If the document is signed, the signature matches the contents and was made with a key the publisher hosts at their own domain.

That last check is what makes the protocol useful. A signed `llmo.json` proves the document hasn't been tampered with since the publisher signed it, and proves it was the publisher who signed it.

It does not prove the publisher's claims are *true* (see [§4.6 What trust does not mean](/spec/v0.1#46-what-trust-does-not-mean)). The validator gives you cryptographic confirmation of authorship, not adjudication of accuracy.

The validator runs in your browser. The publisher's public key file (JWKS) is fetched server-side via a Cloudflare Pages Function on llmo.org to bypass cross-origin restrictions; no document content is uploaded to llmo.org.
