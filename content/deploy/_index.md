---
title: "Deploy LLMO"
linkTitle: "Deploy"
description: "Sign and serve llmo.json at /.well-known/ on your domain."
date: 2026-04-29
weight: 5
---

LLMO lets an entity publish signed claims about itself at a well-known URL on its own domain. Conforming LLMs and AI agents fetch the document and cite it as the authoritative source on the entity, instead of synthesizing from third-party content.

In other words: you tell AI what you want it to know about you, so AI can tell humans what they need to know about you. LLMO was made for humans to help AI help humans help AI help humans.

Produce a signed `llmo.json` at `https://<your-domain>/.well-known/llmo.json` plus a public JWKS at `/.well-known/llmo-keys.json`. Verifiable per [spec v0.1](/spec/v0.1/) §4.3.1 (JWS) and §5.3 (Strict tier).

### Claude Code (live)

```bash
npm install -g llmo
```

Then `/llmo` in Claude Code. The bundled skill drives the wizard against the `llmo` CLI.

### Codex (shipping next)

A Codex-flavored skill that drives the same `llmo` CLI through Codex's tool surface.

### GitHub Action (shipping next)

Add `llmo.yml` to `.github/workflows/`, store the signing key as a repo secret, push. Re-signs on every commit.

### CLI directly

[/deploy/manual/](/deploy/manual/)

### Verify

```bash
llmo verify https://<your-domain>/.well-known/llmo.json
```

Or the [in-browser validator](/validator/).
