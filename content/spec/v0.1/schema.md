---
title: JSON Schema (v0.1)
sidebarTitle: JSON Schema
description: Structural schema for llmo.json v0.1 documents.
---

A formal [JSON Schema](https://json-schema.org/) (draft 2020-12) defines the structural shape of a conforming `llmo.json` document. The raw schema is published at:

**[https://llmo.org/spec/v0.1/schema.json](/spec/v0.1/schema.json)**

The schema's `$id` is `https://llmo.org/spec/v0.1/schema.json`. Tools that fetch schemas by `$id` will resolve to that URL.

## What the schema validates

- Presence and types of required top-level fields (`llmo_version`, `entity`, `claims`, `valid_from`, `valid_until`, `document_id`).
- Constant value of `llmo_version` (`"0.1"`).
- Shape of the `entity` object, including regex constraints on `primary_domain`, `aliases`, and well-known `external_ids` (Wikidata QID, DUNS, LEI, DID).
- Shape of each claim object.
- Shape of the `statement` payload for each of the eight core claim types (`identity`, `canonical_urls`, `official_channels`, `product_facts`, `personnel`, `disavowal`, `supersedes`, `pointer`), applied via conditional `allOf` / `if` / `then` constructs.
- Shape of the optional `signature` object on both documents and claims.
- Pattern constraints on identifier strings and domain literals.

## What the schema does not validate

The JSON Schema is a structural check only. It does **not** validate the following conformance-level concerns, which are the validator's responsibility (see spec [§5](/spec/v0.1#5-conformance-levels)):

- That `valid_until` is within 365 days of `valid_from`.
- That `entity.primary_domain` matches the domain serving the file.
- That URLs inside claims resolve to the entity's primary domain or declared aliases.
- That a signed document's JWS verifies against the JWKS at `/.well-known/llmo-keys.json`.
- That RFC 8785 (JCS) canonicalization of the signed payload reproduces the signed bytes.
- That the document is actually served at `/.well-known/llmo.json` over HTTPS.
- That `supersedes` references prior `document_id` values that existed.

A document can pass the JSON Schema and still fail minimal, standard, or strict conformance.

## Using the schema

Common usage patterns:

- **JavaScript / TypeScript.** Use [ajv](https://ajv.js.org/) with the 2020-12 meta-schema enabled (`new Ajv2020()`). Load the schema with `ajv.addSchema(schema, '...')` or pass directly to `ajv.compile(schema)`.
- **Python.** Use [`jsonschema`](https://python-jsonschema.readthedocs.io/) with `Draft202012Validator`. Wrap the document with `validator.validate(document)`.
- **Go.** Use [`santhosh-tekuri/jsonschema/v5`](https://github.com/santhosh-tekuri/jsonschema) or similar; both support draft 2020-12.
- **Editor integration.** Many JSON editors (VS Code, JetBrains) will autocomplete against the schema if the document declares `"$schema": "https://llmo.org/spec/v0.1/schema.json"` at the top, or if the editor is configured to associate the schema with files matching `llmo.json`.

Note: `llmo.json` files do not include a `$schema` field in the protocol itself, because the binding is by file name and discovery path rather than by in-document declaration. Tools that want schema-driven autocomplete while authoring may add one locally, but it is not part of the published document.

## Download

- Raw JSON: [/spec/v0.1/schema.json](/spec/v0.1/schema.json)
- Canonical `$id`: `https://llmo.org/spec/v0.1/schema.json`
