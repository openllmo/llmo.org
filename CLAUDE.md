# CLAUDE.md: LLMO Project Memory

This file is auto-loaded by Claude Code at the start of every session in this repository. It captures the working principles, conventions, and conventions-not-to-violate that have emerged through this project's development.

If you are a Claude session opening this file, **read it fully before any meaningful work in the repo.** The principles below were earned through specific exchanges; they're not arbitrary preferences.

For deeper context (history, decision rationale, strategic backlog), see:
- `infrastructure/BACKLOG.md`: deferred work and scheduled commitments
- `infrastructure/SIGNING-CEREMONY.md`: cryptographic signing procedure
- `infrastructure/ACCOUNTS.md`: service accounts and entity ownership
- Local operator handoff documents (not in this repo): personal/strategic context

---

## Project at a glance

**LLMO** is an open protocol for organizational identity in the AI era. Organizations publish signed JSON claims at `/.well-known/llmo.json`. AI agents and LLMs read them directly.

**Stewardship:** Diverse.org, Inc. (CA 501(c)(3), EIN 99-2870125)

**Commercial vehicle:** Greyfront, Inc. (DE C-corp); separate entity, future llmo.com

**Repo:** This is the spec/site repo (openllmo/llmo.org). Validator is at openllmo/llmo-validator. Diverse.org's own site is planned separately (Priority 14c, see BACKLOG.md).

**Current state:** Site live at https://llmo.org, signed `llmo.json` published at `/.well-known/llmo.json` passing Strict tier conformance, LIP-1 and LIP-3 Bitcoin-anchored.

---

## Hard rules (do not violate)

These come from specific failures or earned conventions. Don't re-litigate them.

### 1. Hugo on Cloudflare Pages, no proprietary publishing platforms

The repo migrated from Mintlify after permanent dashboard auth lockout. The structural argument: a protocol whose product thesis is "organizations control their own identity" cannot operate on infrastructure where the project owner doesn't have administrative control.

If a future task tempts you toward a proprietary docs platform (Mintlify, GitBook, ReadMe, etc.) or a hosted CMS, **reject it**. Hugo + Cloudflare Pages is the right answer.

### 2. The v0.1 schema is anchored. Do not modify it.

LIP-1 and LIP-3 are Bitcoin-anchored via OpenTimestamps. The schema in `static/spec/v0.1/schema.json` is part of the contract that was anchored.

Schema evolution belongs in v0.2+ via new LIPs. Don't change the v0.1 schema. Don't change the spec body in ways that affect what was anchored.

### 3. No em dashes

Use commas, periods, parentheses, or hyphens. Em dashes are a stylistic tic that has been explicitly removed from this project. Search for them periodically; remove if found.

### 4. No marketing register

Direct, declarative, technical. Stripe/Linear/Vercel tone. NOT corporate-stuffy, NOT cute, NOT cheerleader. The hero copy on llmo.org is locked:

- Headline: "An open protocol for organizational identity in the AI era."
- Subhead: "Organizations publish signed claims at /.well-known/llmo.json. AI agents and LLMs read them directly."

Don't soften this. Don't add adjectives. Don't add exclamation points.

### 5. PRs only, no force-pushing main

CI green via `gh pr checks` is Step 0 of merge, not the last step. STOP and report when CI passes. Don't merge without explicit operator approval.

Exception: post-merge follow-up commits (small, isolated, CI-green) can go directly to main.

### 6. DCO sign-off on every commit

`Signed-off-by: Nic Chavez <spec@llmo.org>` on every commit. Established convention; if you forget, amend before push.

### 7. Don't use /tmp for working clones

macOS daily maintenance can corrupt them. Use `~/projects/`.

### 8. Heredoc apostrophe gotcha

Bash heredocs with apostrophes in commit messages frequently fail. Standard solution: write commit message to `/tmp/<file>.txt`, use `git commit -F /tmp/<file>.txt`. Don't use `git commit -m "$(cat <<'EOF' ... EOF)"` for messages with apostrophes.

### 9. Verify-before-push

Long sessions accumulate stale context. Before any significant operation, run:
- `git status` (check for unexpected changes)
- `git log --oneline -5` (confirm you know the actual HEAD)
- `git rev-parse HEAD` (sanity-check the SHA you think you're on)

If you find drift between your assumptions and the actual state, STOP and re-read the project state before proceeding.

### 10. Verify served files match local committed files

After Cloudflare Pages deploys, sha256-check served vs. local for any file you committed. Trust but verify.

### 11. Read CLAUDE.md and BACKLOG.md first

Always. Read them again if you suspect context drift.

---

## The "hardstuff" principle

When you find yourself proposing "Phase 2," "later," or "follow-up commit" on something that affects the live site, the demo, or stated promises, **STOP**.

Ask: "is this hard, or just hard right now?"

- If the only reason to defer is "it's harder," that's not a reason to defer. That's a reason to do it.
- Real reasons to defer: dependency on something that doesn't exist yet, requires customer/board input, genuinely lower priority than what's blocking you.
- Bullshit reasons to defer: it's complex, I don't want to debug it, the easier path is also acceptable.

This principle is codified because the operator caught the previous Claude defaulting to "Phase 2" framing on the verify-lip-anchor.sh script (which required a local Bitcoin Core node, making verification practically impossible for normal users). The right answer was harder and now: rewrite the script to use three independent block explorers as fallback. We did it that night.

The pattern repeats. You'll face it. The right answer is usually "now, harder."

See `.claude/skills/hardstuff/SKILL.md` for the full skill definition.

---

## Working principles (non-negotiable)

### Own the critical path
Identify what blocks the next demo. Fix that. Don't sprawl.

### Validate before merge
`gh pr checks` is the first step of merge, not the last. CI green is the gate.

### Adjacent-fix rule
If you're touching a file for one reason and notice an obvious adjacent issue, fix it in the same PR. Don't defer.

### Industry-precedent check
Before inventing a convention, look at what Bitcoin/Linux/Apache/Mozilla/Stripe/Linear do. Don't reinvent. Stripe/Linear visual register, Bitcoin/Apache governance patterns, RFC-style spec writing.

### Pre-merge STOP point
When CI is green and the PR is ready, STOP and report. Don't merge without explicit operator approval.

### Execute on doctrine, consult on strategy
Code, file moves, refactors, ceremonies, builds: execute. Strategic decisions, naming, customer-facing prose, irreversible actions: consult.

### During v0.1 pre-release
The author (Nic Chavez) decides all changes. No governance windows, no community vote. v0.2+ will have community governance.

### Push back when you disagree
The operator respects "I think that's the wrong move because X" more than agreement-then-execution. Real disagreement, with reasoning, is the contribution wanted.

### Match warmth without performing it
The operator is warm and direct. Match it. Don't escalate. Don't perform familiarity. Earn yours through real exchanges.

### Don't use bullet points in chat
Use them for structured documents (handoff briefs, lists, this file). Conversational replies are prose.

### Estimate carefully
Don't say "this will take 5 minutes" if you don't know. Either give a range with reasoning or say "I don't know, depends on X."

---

## Repository conventions

### Branches
- `main` is the production branch. Cloudflare Pages auto-deploys on push.
- Feature branches: descriptive (`static-hugo`, `priority-13-security-contact`, etc.)
- PR-based merge for major work.

### Commit messages
- Imperative present tense ("add X", not "added X")
- Subject line ≤ 72 chars
- Body wrapped at 72 chars
- DCO sign-off on every commit
- Use `git commit -F /tmp/file.txt` for messages with apostrophes

### Hugo build
- Source: `content/` and `layouts/` and `static/`
- Output: `public/` (gitignored)
- `hugo.toml` is the config
- `infrastructure/` is excluded from build via Hugo's ignoreFiles
- `static/.well-known/` files are served at root paths (`/.well-known/llmo.json` etc.)

### Static assets
- Logos: `static/logo/llmo-{light,dark,red}.{svg,png}`
- CSS: `static/css/main.css`
- JS: `static/js/theme-toggle.js`
- Spec assets: `static/spec/...`
- Well-known files: `static/.well-known/...`

### Layouts
- `_default/baseof.html`: page shell
- `_default/single.html`: article pages
- `_default/list.html`: index pages
- `partials/header.html`, `partials/footer.html`
- `index.html`: front page
- `404.html`: error page

### Theme system
- Light mode default
- Dark mode via `data-theme="dark"` on `<html>`
- Toggle persists to localStorage
- Inline head script prevents flash of unstyled theme
- CSS custom properties switch on data-theme attribute
- Logo image swaps between `llmo-light.svg` and `llmo-dark.svg` via JS

---

## Backlog discipline

`infrastructure/BACKLOG.md` is the durable list of deferred work and scheduled commitments. Two mechanical rules keep it from going stale (the COMPLETED section once drifted ten days behind merged work; the rules below replace honor-system tracking with CI enforcement).

### Track conventions

Every BACKLOG item declares a **Track** that names which artifact surface, if any, the work will produce. Defined in `infrastructure/BACKLOG.md` under "Track conventions". Four values:

- `lip`: produces a new LIP under `content/spec/lips/`
- `adr`: produces a new ADR under `content/adr/` (excluding ADR-0000, which is bootstrap)
- `changelog`: produces a new `## [X.Y.Z]` version section in `content/spec/changelog.md`
- `none`: no artifact surface (tooling, infrastructure, ceremonies, etc.)

New items get a Track at creation. Existing items get one opportunistically when touched.

### Resolves discipline

When a commit adds an artifact-surface file (new ADR, new LIP, or a new `## [X.Y.Z]` changelog version section), it MUST do one of:

1. include a `Resolves: BACKLOG#<item-id>` line in the commit message (case-insensitive on `Resolves`); or
2. modify `infrastructure/BACKLOG.md` in the same commit (typically moving the item to COMPLETED).

Modifications to existing ADRs, additions to the changelog `[Unreleased]` block, registry maintenance under `_index.md`, and changes to ADR-0000 are not artifact-creation events and do not trigger the rule. ADR amendment-vs-supersession is governed by `content/adr/0000-record-architecture-decisions.md`.

`.github/workflows/backlog-discipline.yml` enforces the rule on every PR and push to main. The PR template (`.github/pull_request_template.md`) includes a checklist line so authors do the bookkeeping before CI has to.

### Weekly activity digest

`.github/workflows/weekly-digest.yml` runs every Monday at 13:00 UTC (= 09:00 US/Eastern in EDT) and writes `infrastructure/weekly-digest/YYYY-WNN.md` with commits from the previous full ISO week, categorized by file path (spec / LIP / ADR / BACKLOG / infra / other) plus summary statistics. The script is `scripts/weekly-digest.py`; pass `START_DATE END_DATE` (YYYY-MM-DD) to override the range. The workflow commits under `github-actions[bot]` and exits cleanly when nothing changed.

The digest is a tripwire, not a deliverable: when artifact-producing work appears in the digest without a matching BACKLOG transition, that is a sign the discipline above slipped and needs a follow-up commit.

---

## Cryptographic conventions

### Signing keys
- ES256 (ECDSA on P-256)
- Key ID format: `<entity>-YYYY-NN` (e.g., `diverse-2026-01`)
- Private keys: NEVER in repo. Live in 1Password ("LLMO ES256 signing key — diverse-2026-01")
- Public JWKS: published at `/.well-known/llmo-keys.json`

### Signing ceremony
- Manual, not CI-automated
- Documented in `infrastructure/SIGNING-CEREMONY.md`
- 90-day re-signing cadence (quarterly)
- Same key re-used for quarterly rotations; key only rotates on real reasons (compromise, hardware migration)

### Validity windows
- v0.1 launch: 90 days
- 7-day buffer before expiry for re-signing
- Document supersedes prior versions via `document_id` field

### Bitcoin anchoring
- LIPs anchored via OpenTimestamps
- Verifier (`scripts/verify-lip-anchor.sh`) uses three explorer fallback: blockstream.info → mempool.space → blockchain.info
- No local Bitcoin node required
- Original `.ots` proofs preserved at `static/spec/lips/legacy/` for historical record

---

## Spec conventions

### Worked example: Diverse.org (self-referential)
Section 7 of v0.1 uses Diverse.org as the worked example. This is intentional: protocol-uses-itself pattern (Bitcoin docs use Bitcoin, Linux docs use Linux).

If you ever see "Serval" anywhere in the repo, it's stale. Replace with Diverse.org. (Serval is also a Greyfront commercial customer name; using it as a fictional example created a customer-relationship issue.)

### LIP numbering
- Numbers permanent and append-only
- Withdrawn LIPs stay in registry as "Withdrawn"
- LIP-2 is permanently Withdrawn (placeholder removed before formal numbering)
- Don't renumber

### LIP types
- **Standards Track**: new extension claim types (require DNS proof-of-control, 7-day Discussion period, non-author public response)
- **Process**: changes to the LIP process or governance
- **Informational**: advisory guidance

### Discussions
- GitHub Discussions enabled at https://github.com/openllmo/llmo.org/discussions
- All proposals start there before formal LIP submission

---

## Visual conventions

### Color palette
**Light mode:**
- Background: `#FFFFFF`
- Primary text: `#0A0A0F`
- Secondary text: `#5A5F6E`
- Accent: `#A8B3FF`
- Border: `#E5E5EA`
- Code background: `#F5F5F7`

**Dark mode:**
- Background: `#100F0D` (matches designer's logo background)
- Primary text: `#F5F5F7`
- Secondary text: `#A8A8B0`
- Accent: `#A8B3FF`
- Border: `#2A2A2A`
- Code background: `#1A1A1A`

### Typography
- Display + body: Inter (300, 400, 500, 600, 700)
- Code: JetBrains Mono (400, 500)
- Currently via Google Fonts (self-hosting deferred; see BACKLOG.md)

### Type scale
- Hero h1: 3rem mobile / 4rem desktop, weight 600
- Section h2: 2rem mobile / 2.5rem desktop, weight 600
- h3: 1.5rem / 1.75rem, weight 600
- Body: 1rem (17px base)
- Code: 0.9em

### Spacing
- Container max-width: 1100px
- Container padding: 24px
- Hero padding: 96px 0 64px (desktop), 64px 0 48px (mobile)
- Section padding: 64px 0

### Components
- `.btn-primary`: solid, primary text color on background
- `.btn-secondary`: transparent, border-only
- `.hero`: centered desktop, left-aligned mobile
- `.explainer`: WHAT/HOW/WHY pattern with eyebrow + h2 + paragraph
- `.cta-strip`: rounded background section with centered CTAs

### Logo
- Black on white: `static/logo/llmo-light.svg` (light mode header)
- White on dark: `static/logo/llmo-dark.svg` (dark mode header)
- Red: `static/logo/llmo-red.svg` (reserved for future llmo.com)
- Source files at `~/Desktop/2026 Logos/LLMO_Logo_2026/`

---

## Tooling and environment

### Required tools
- Hugo (binary, version pinned via Cloudflare Pages env var)
- Node.js (for Cloudflare Pages tooling)
- Python 3.9+ (signing ceremony, validator scripts)
- `jwcrypto` Python package (signing)
- `cryptography` Python package (transitive dep)
- `ots` (opentimestamps-client, anchoring)
- `gh` CLI (GitHub operations)
- `jq` (JSON processing in scripts)
- `curl` (network testing)

### Operator environment
- macOS, bash shell (not zsh)
- `~/projects/llmo-survey/` is this repo
- `~/Library/Python/3.9/bin` in PATH (added to `~/.bash_profile`)
- VS Code is primary editor
- Claude Code (TUI) is primary agentic tool
- Cloudflare account: team@diverse.org (account ID 5d9418e9813fd14854487fc005ff07c1)
- 1Password holds: signing key, GitHub PAT, Cloudflare credentials

### Branches in active use
- `main`: production
- `static-hugo`: historical migration branch (preserved, not deleted)

---

## How to recognize you've drifted

Long agentic sessions accumulate stale context. Signs of drift:

- You reference Mintlify as if it's still the publishing platform (it's Hugo)
- You forget the OTS proofs are already Bitcoin-anchored
- You confuse llmo.org and llmo.com (org vs. com, different entities)
- You describe Serval as the worked example (it's Diverse.org now)
- You assume CI is broken or DNS is wrong without checking
- You propose deferring something that's actually demo-blocking

When you suspect drift:
1. `git status` and `git log --oneline -10`
2. Re-read this file
3. Check `infrastructure/BACKLOG.md` for current priorities
4. Tell the operator if uncertain

---

## What this file is NOT

- Not a project log of every change (commit history serves that)
- Not a personal handoff brief (those live locally outside the repo)
- Not exhaustive documentation (the spec itself is at `content/spec/v0.1/`)
- Not a tutorial (assumes Claude/operator competence)

This file is the project's working memory. Keep it tight. When something belongs here, add it. When something doesn't belong here anymore, remove it.

---

## Updates to this file

If you discover a project convention that should be codified, add it. If a previously-codified rule is wrong, correct it. CLAUDE.md is a living document.

When updating:
- Make the smallest change that captures the principle
- Reference specific exchanges or decisions if they're load-bearing
- Don't accumulate rationale here; link to BACKLOG.md or LIP discussions for that

Updates to CLAUDE.md should be committed alongside the work that motivated the update, not in a separate "doc cleanup" commit. They're part of the work.
