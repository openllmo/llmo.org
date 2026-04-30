---
title: Validator
linkTitle: Validator
description: Reference validator for llmo.json documents. Checks structural conformance and tier evaluation against the v0.1 specification.
date: 2026-04-29
weight: 4
aliases:
  - /validate/
---

This page validates `llmo.json` documents against the [v0.1 JSON Schema](/spec/v0.1/schema.json) and reports which conformance tier the document achieves (Minimal, Standard, Strict) per [§5.1 through §5.3](/spec/v0.1#5-conformance-levels) of the [LLMO specification](/spec/v0.1).

The validator runs in your browser. JWKS files referenced by signed documents are fetched server-side via a Cloudflare Pages Function on llmo.org to bypass cross-origin restrictions; no document content is uploaded to llmo.org.
