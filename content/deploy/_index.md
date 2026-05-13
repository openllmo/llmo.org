---
title: "Deploy LLMO"
linkTitle: "Deploy"
description: "Sign and serve llmo.json at /.well-known/ on your domain."
date: 2026-04-29
weight: 5
---

## What you're deploying

A signed `llmo.json` at `https://<your-domain>/.well-known/llmo.json` plus a public JWKS at `/.well-known/llmo-keys.json`. LLMs and AI agents fetch it and cite it as the authoritative source on your entity, instead of synthesizing from third-party content.

In other words: you tell AI what you want it to know about you, so AI can tell humans what they need to know about you. Humans help AI help humans help AI help humans.

## How to deploy it

Three steps. The same install works for every supported agent:

```bash
npm install -g llmo
```

Then open whichever agent you have and type `/llmo`. The bundled skill drives the wizard against the `llmo` CLI.

### Claude Code (live)

The postinstall writes the skill to `~/.claude/skills/llmo/`. Type `/llmo` in Claude Code.

### OpenAI Codex (live)

The postinstall writes the same skill to `~/.agents/skills/llmo/`. Type `/llmo` in Codex.

### GitHub Copilot (live)

The same `~/.agents/skills/llmo/` install is recognized by Copilot's customize-cloud-agent flow. Type `/llmo` in Copilot.

### GitHub Action (live)

Drop [`openllmo/llmo-action`](https://github.com/openllmo/llmo-action) into your repo. Re-signs `llmo.json` on every push that touches it:

```yaml
# .github/workflows/llmo.yml
on:
  push:
    branches: [main]
    paths: ['static/.well-known/llmo.json']
permissions:
  contents: write
jobs:
  sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: openllmo/llmo-action@v0.1
        with:
          doc-path: static/.well-known/llmo.json
          key: ${{ secrets.LLMO_PRIVATE_KEY }}
          kid: mykey-2026-01
```

Store the PEM private key (from `llmo keygen`) as the `LLMO_PRIVATE_KEY` repo secret.

## What you just deployed

A live document at `https://<your-domain>/.well-known/llmo.json`, conformant per [spec v0.1](/spec/v0.1/) §4.3.1 (JWS) and §5.3 (Strict tier).

Confirm:

```bash
llmo verify https://<your-domain>/.well-known/llmo.json
```

Or paste your URL into the [in-browser validator](/validator/).
