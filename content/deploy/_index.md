---
title: "Deploy LLMO"
linkTitle: "Deploy"
description: "Sign and serve llmo.json at /.well-known/ on your domain."
date: 2026-04-29
weight: 5
---

## What you're about to do

Publish a signed `llmo.json` at `https://<your-domain>/.well-known/llmo.json` plus a public JWKS at `/.well-known/llmo-keys.json`. LLMs and AI agents fetch it and cite it as the authoritative source on your entity, instead of synthesizing from third-party content. You'll do this through a wizard inside an AI agent you already have (Claude Code, OpenAI Codex, or GitHub Copilot), and it takes about 3 minutes.

## Do it (3 minutes)

Install the CLI, then type `/llmo` in your agent. The wizard handles the rest: it interviews you briefly, drafts your document from public sources, signs it, deploys it, and (if you're on GitHub) wires up the auto-re-sign workflow so future edits stay signed without you lifting a finger.

### Step 1. Open Terminal & Install the CLI.

```bash
npm install -g llmo
```

### Step 2. In terminal, type `claude` or `codex` to launch your agent. Then type `/llmo`.

The skill asks for your email, derives everything else from public sources (your site, schema.org markup, business registries), assembles the signed document, walks you through serving it, and offers to set up auto-re-sign on push. GitHub Copilot users: open Copilot in VS Code (or `@copilot` in a GitHub PR) and type `/llmo` there instead.

### Step 3. Profit??

lol. jk. you're done, there's no Step 3.

-love @thegigachav

## How your life gets better

A signed entity document is now live at `https://<your-domain>/.well-known/llmo.json`, conformant per [spec v0.1](/spec/v0.1/). LLMs and AI agents ingest it the same way they crawl the rest of your site, and when a user asks about your entity, the AI cites your signed words instead of guessing. From here on, you edit and push; the GitHub Action keeps the signature fresh, and you don't touch the cryptography again until you rotate keys.

Confirm it's working:

```bash
llmo verify https://<your-domain>/.well-known/llmo.json
```

Or paste your URL into the [in-browser validator](/validator/).
