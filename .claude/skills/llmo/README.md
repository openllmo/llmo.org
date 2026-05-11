# `/llmo` skill

A Claude Code skill that walks a publisher through creating and deploying a signed v0.1.8 `llmo.json` document at `/.well-known/llmo.json` on their domain.

## What it is

The `/llmo` skill is the user-facing wizard for the LLMO protocol. The publisher's input is bounded to their email of record plus a small number of review decisions; the skill queries public sources, drafts the document, walks them through signing and deploying, and validates the result.

Architectural framing: [ADR-0007: Claude as builder, not just consumer](https://llmo.org/adr/0007-claude-as-builder/).

The skill is a **guided wizard layered on top of the `llmo` CLI** (the npm package), not a replacement for it. The CLI is the deterministic primitive; the skill is the TurboTax-style interview that figures out which CLI commands to run with which arguments by asking the publisher the minimum needed.

## Install (per-user, Claude Code)

```bash
# Clone or copy this repo's .claude/skills/llmo directory into your personal Claude Code skills directory
cp -r /path/to/llmo.org/.claude/skills/llmo ~/.claude/skills/llmo

# Verify Claude Code sees the skill
claude --list-skills | grep llmo

# Make sure the underlying CLI is installed
npm install -g llmo
llmo --version  # should be 0.1.8 or later
```

Invoke from any directory:

```
/llmo
```

## Shape

```
.claude/skills/llmo/
├── SKILL.md              ← orchestrator: the recipe Claude follows
├── README.md             ← this file
└── phases/               ← per-phase guidance (stubs at scaffold time)
    ├── 01-greet.md
    ├── 02-interview.md
    ├── 03-derive.md
    ├── 04-review.md
    ├── 05-verify-contacts.md
    ├── 06-dns-corroboration.md
    ├── 07-keygen.md
    ├── 08-sign.md
    ├── 09-deploy.md
    └── 10-validate.md
```

The orchestrator (`SKILL.md`) names the ten phases and the defaults that carry across them. Each phase file is a focused recipe for that phase's questions, public-source queries, CLI invocations, and decisions.

## Status

**Scaffold.** SKILL.md is in. The ten phase files exist as stubs (each names the inputs, outputs, decisions, and CLI calls; the actual prompt text and example invocations are TBD). Build them out one at a time, starting with whichever is highest-value to test against a real publisher.

## How this relates to other surfaces

- **`llmo` CLI on npm**: the deterministic primitive the skill calls. Lives in `openllmo/cli`.
- **`/validator/` at llmo.org**: the in-browser conformance checker. The skill calls it for the final live-validation step.
- **`blog.llmo.org`** (planned): human-curated long-form. Not in this skill's scope.
- **Codex / OpenAI custom-tool adapter, GitHub Skillset**: future thin wrappers around the same library logic, exposing the wizard on other agent surfaces.

## What this skill is not

- It is not a replacement for the spec. It implements one path through the spec; publishers with edge cases should still consult [/spec/v0.1/](https://llmo.org/spec/v0.1/).
- It is not a hosted service. It runs locally in the publisher's Claude Code session. A future hosted web wizard at llmo.com (Greyfront, commercial) would expose the same library logic via a web UI for publishers who don't have Claude Code.
- It does not handle key custody for the publisher. It generates a keypair and walks them through storing the private key in 1Password / a hardware token / a platform secrets manager; the skill never sees the private key again.
