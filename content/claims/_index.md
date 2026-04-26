---
title: Claim Types
linkTitle: Registry
description: The LLMO claim type registry.
date: 2026-04-17
---

The LLMO registry catalogs the claim types recognized by the protocol. Every claim in a `llmo.json` document has a `type` field that names one of two categories:

- **Core claim types** are defined in the specification and MUST be understood by any conforming consumer. They have bare identifiers with no dot: `identity`, `canonical_urls`, `official_channels`, `product_facts`, `personnel`, `disavowal`, `supersedes`, `pointer`.

- **Extension claim types** are namespaced and publisher-defined. They take the form `namespace.type`, where `namespace` is a short identifier the publisher controls (ideally matching a domain they own). For example: `acme-corp.compliance_note`. Consumers MUST ignore unknown extension types without error.

The registry exists for discoverability. A publisher does not need to register an extension claim type to use it. Registration signals that a type is widely adopted and helps other publishers and consumers find it.

## Sections

- [Core Claim Types](/claims/core): the eight types defined in the specification, with statement schemas, examples, and common pitfalls.
- [Extensions](/claims/extensions): the registry of publisher-defined extension types.

## Governance

Governance for promoting extension claim types to core will be formalized as the registry opens. Early claim type proposals will be reviewed case-by-case by the spec editor.

Specification [§8.5](/spec/v0.1#8-open-questions-for-future-versions) lists this as an open question for a future version. Until a formal governance model is adopted, changes to the core set of claim types are part of the specification's RFC cycle rather than the registry's.

## Distinction from the specification

This registry is a catalog, not an authoritative definition. The specification is the authoritative source for every core claim type's semantics and statement schema; the [Core Claim Types](/claims/core) page summarizes the spec and adds implementation notes. Where the two appear to differ, the specification is correct.
