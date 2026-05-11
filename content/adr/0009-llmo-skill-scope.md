---
title: "ADR-0009: /llmo Claude Code skill scope — protocol-spec artifacts only; companion files belong to llmo.com"
linkTitle: ADR-0009
description: The /llmo Claude Code skill bundled with the open-source llmo CLI emits only the artifacts defined by the LLMO v0.1 specification — llmo.json, the JWKS, the verification TXT records. Companion well-known files (security.txt, llms.txt, robots.txt hygiene) and aggregate "publisher trust" tooling are explicitly out of scope on the llmo.org side and belong to a separate Trust Pack product at llmo.com per the two-entity firewall.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-11
status: Accepted
---

## Status

Accepted. Records the scope decision made at the point the `/llmo` Claude Code skill was bundled into the npm CLI (v0.1.9, 2026-05-11) and operationalizes the two-entity firewall from [ADR-0001](/adr/0001-two-entity-firewall/) for this specific tooling surface.

## Context

The LLMO open spec at llmo.org is stewarded by Diverse.org, a California 501(c)(3) nonprofit. Commercial activity adjacent to the protocol is conducted by Greyfront, a Delaware C-corporation, through the llmo.com surface. The two-entity firewall is structural, not aspirational ([ADR-0001](/adr/0001-two-entity-firewall/)).

In May 2026 the open spec gained two new surfaces that together change the publisher's experience:

1. **Claude-as-builder architectural framing** ([ADR-0007](/adr/0007-claude-as-builder/)): LLMO documents are assembled by Claude (or any LLM agent) on behalf of the publisher; publisher input is minimal (email of record + consent); the agent normalizes against the controlled vocabulary; the agent records its work in `provenance_markers` per claim.
2. **A concrete `/llmo` Claude Code skill** (shipped 2026-05-11, vendored from `.claude/skills/llmo/` in the llmo.org repo into the `llmo` npm package via `scripts/vendor.sh`, copied to `~/.claude/skills/llmo/` by the package's postinstall script): a TurboTax-style ten-phase wizard that walks a non-developer publisher from "I have a domain" to "signed llmo.json deployed at /.well-known/."

The skill is genuinely useful, and it has more data on hand than the spec strictly requires. A publisher running through the wizard has, by phase 04, already disclosed: their primary domain, contact addresses (including a security-of-record contact), canonical URLs (homepage, docs, security, press), categories, locations, hours, operational status. The skill has, in other words, almost all the data needed to produce additional well-known files that aren't part of the LLMO spec:

- **`/.well-known/security.txt`** (RFC 9116): the security contact in `contact_points` directly populates the `Contact:` field; the `valid_until` window directly populates `Expires:`.
- **`/llms.txt`** (Schroeder convention): canonical URLs and operational categories directly populate the site-map-for-LLMs format.
- **`/robots.txt`** hygiene: the wizard could lint the publisher's existing robots.txt and flag misconfigurations relative to AI crawler conventions.
- **DNS records beyond `_llmo-verify` and `_llmo-corroboration`**: SPF, DKIM, DMARC, MTA-STS — the publisher's email-of-record domain is already verified.

Producing any of these is trivial mechanically. The temptation to bundle them into the `/llmo` skill is real and was raised during the skill's design discussion. **It was rejected.** This ADR records why.

Two forces in tension:

1. **The publisher's experience is best served by one wizard that handles everything.** From the publisher's perspective, "set my domain up for AI consumption" is one job; splitting it across `/llmo`, "go run security.txt-builder", and "remember to lint robots.txt" fragments the experience and reduces the chance that any of the secondary surfaces actually get done.
2. **The open spec's tooling must stay scoped to the open spec.** The `/llmo` skill ships in the llmo.org repo, is vendored into the `llmo` npm package (an OSS artifact maintained by Diverse.org), and is invoked by a slash-command that uses the LLMO name. If that skill produces files outside the LLMO v0.1 specification, it implicitly extends the spec's perceived scope and pulls the open-stewardship surface into territory that belongs to the commercial side.

The firewall question is not whether building security.txt and llms.txt as well is useful (it is) but **which entity should build that bundle**. Diverse.org cannot ship a "general AI-era publisher onboarding wizard" without either (a) expanding the spec to cover security.txt and llms.txt (not under consideration, and not the right design), or (b) blurring the boundary between protocol stewardship and commercial product development.

## Decision

The `/llmo` Claude Code skill (bundled in the `llmo` npm package, vendored from `.claude/skills/llmo/` in the llmo.org repo) emits exactly the artifacts defined by the LLMO v0.1 specification and nothing else. Companion well-known files and aggregate publisher tooling are out of scope on the llmo.org side and belong to a Trust Pack product at llmo.com (planned; not yet built).

### What the `/llmo` skill produces (in scope)

The skill's ten phases produce the following artifacts. Every artifact is defined by the LLMO v0.1 specification or directly supports its verification model.

| Phase | Name | Artifacts produced |
|-------|------|--------------------|
| 01 | Greet | None — consent and working-directory setup (`llmo-publish-YYYY-MM-DD/`). |
| 02 | Interview | `email-of-record.txt` in the working directory (the publisher's contact and the derived primary domain). |
| 03 | Derive | `llmo-payload-draft.json` — unsigned, populated from public-source queries (publisher's website, Wikidata, business registries, schema.org markup). Each claim tagged with `provenance_markers` per [ADR-0007](/adr/0007-claude-as-builder/). |
| 04 | Review | `llmo-payload.json` — confirmed payload after publisher review. Same shape as the draft; differences are publisher edits. |
| 05 | Verify contacts | DNS TXT record at `_llmo-verify.<domain>` (Google Workspace-style domain-control proof; one record per unique email-address domain in `contact_points`); `verify-token.txt` in working directory for next-rotation reuse. Each verifiable `contact_points` entry gets `verification_method: dns_txt`, `verification_status: verified`, `verification_proof`, `verified_at` recorded in the payload. |
| 06 | DNS corroboration (optional) | DNS TXT record at `_llmo-corroboration.<domain>` with placeholder hash (filled in phase 08); payload's top-level `dns_corroboration: {txt_record, hash_alg: sha-256}` populated. |
| 07 | Keygen and custody | `llmo-private-<kid>.pem` (private signing key, deleted at end of phase 08); `llmo-keys.json` (public JWKS, deployed in phase 09); `llmo-key-custody-note.txt` recording where the publisher stored the private key for next-rotation retrieval. |
| 08 | Sign | `llmo-signed.json` (signed document with JWS attached); private key file deleted from working directory immediately after `llmo verify` confirms the signature locally; DNS `_llmo-corroboration` TXT record updated with the real hash (`v=1; alg=sha-256; hash=<base64url>`). |
| 09 | Deploy | Two files served over HTTPS at `https://<primary_domain>/.well-known/llmo.json` and `https://<primary_domain>/.well-known/llmo-keys.json` with correct Content-Type and Cache-Control per spec §2.2 and §5.3. The skill walks per-platform deploy instructions (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3+CloudFront, Nginx, Apache) but does not commit code to the publisher's repo — the publisher deploys. |
| 10 | Validate live | `llmo-publish-report-YYYY-MM-DD.txt` — closing report (domain, document_id, tier achieved, signature status, valid_from/until, claims published, key custody pointer, next-rotation date at +80 days, validator URL, spec URL). |

All artifact specifications above derive from the LLMO v0.1 schema and §2-§5 conformance rules. No artifact is invented by the skill; the skill is a producer of spec-defined outputs.

### What the `/llmo` skill explicitly does not produce (out of scope)

The following are not emitted by the skill and the skill does not attempt to assemble them, lint them, or stub them. This is a hard scope boundary, not a "future work" deferral.

- **`/.well-known/security.txt`** (RFC 9116).
- **`/llms.txt`** (Schroeder convention).
- **`/robots.txt`** authoring or linting against AI-crawler conventions.
- **`/humans.txt`**, **`/.well-known/openpgpkey/`**, **`/.well-known/change-password`**, or other well-known-files conventions outside the LLMO spec.
- **DNS records beyond `_llmo-verify` and `_llmo-corroboration`** — SPF, DKIM, DMARC, MTA-STS, CAA, DNSSEC posture checks.
- **Aggregate publisher trust dashboards** — single-pane-of-glass views combining LLMO + security.txt + llms.txt + monitoring + rotation reminders.
- **Continuous monitoring** of the publisher's deployed `/.well-known/llmo.json` for byte drift, signature breakage, CDN reformatting, or rotation lapses.
- **Multi-domain orchestration** for publishers with `delegates_to` / `delegated_from` chains across multiple primary domains.
- **Editorial review services** for publisher-supplied claims (e.g., flagging that a category, NAICS code, or canonical URL is suspect or contested).

These belong to a Trust Pack at llmo.com (planned). Diverse.org does not build them. The boundary is verified by reviewing the skill's source: every file the skill writes (or instructs the publisher to publish) is named in the table above; none is a non-LLMO artifact.

### Where the firewall is enforced in the skill itself

Three implementation patterns enforce the scope boundary in code, not only in this ADR:

1. **Skill phases are named after spec sections.** Phase 05 is "Verify contacts," not "Set up security disclosure." Phase 09 is "Deploy," not "Set up your domain for AI consumption." The naming keeps reviewers (and any future contributor proposing to add a phase) anchored to spec scope.
2. **The skill's `SKILL.md` description names the scope ceiling.** Quoting the orchestrator: *"This skill produces the artifacts defined by the LLMO v0.1 specification. It does not produce security.txt, llms.txt, or other well-known files; those are out of scope for the open spec and are addressed by the Trust Pack product at llmo.com."* Any future scope expansion has to either (a) revise the spec to cover the new artifact (a `[Unreleased]` changelog entry plus a normative spec section) or (b) revise this ADR.
3. **`scripts/vendor.sh` in the `openllmo/cli` repo vendors only files under `.claude/skills/llmo/`.** No mechanism exists to ship non-LLMO artifacts through the same channel; adding one would require a vendor-script change and would be a visible breach of this ADR at review time.

## Alternatives considered

- **Build security.txt and llms.txt into the `/llmo` skill itself.** Rejected. The publisher-experience argument (one wizard, one job) is real, but the firewall argument is stronger: the open-spec surface should not produce artifacts outside the open spec, even when the data is on hand and the production is mechanical. The right home for the bundled experience is llmo.com, not llmo.org.
- **Move the entire `/llmo` skill to llmo.com.** Rejected. The skill produces exactly the artifacts the LLMO v0.1 spec defines; those artifacts are an open standard, and the tooling to produce them is appropriately part of the open-spec ecosystem (Diverse.org). Moving the skill commercial would create a paywall in front of the spec, which is the inverse of what the firewall is meant to protect.
- **Ship the `/llmo` skill at llmo.org and a parallel `/trust` skill at llmo.com.** Plausible future direction, not a current decision. If/when llmo.com builds a Trust Pack, it may or may not take the form of a Claude Code skill. That's a llmo.com product decision; not addressed by this ADR.
- **Add a spec section covering security.txt and llms.txt so the skill can produce them in-scope.** Rejected. The LLMO spec is a signed-claims protocol with a defined ontology. security.txt is RFC 9116 (a different standards-track artifact with its own evolution); llms.txt is a convention with no normative standardization. Both are valuable and complementary, but folding them into the LLMO spec would conflate three independent specifications and produce a "kitchen-sink protocol" critique that the design does not need.

## Consequences

**Positive.**

- The `/llmo` skill on the llmo.org side has a sharp, defensible scope. A new contributor reading this ADR knows immediately which proposed features are in-scope and which are out-of-scope.
- The two-entity firewall ([ADR-0001](/adr/0001-two-entity-firewall/)) is operationalized at the tooling level, not only at the legal-entity level. External reviewers can verify that the open-source skill produces only open-spec artifacts.
- llmo.com is unblocked to build a Trust Pack at any time without competing with — or being constrained by — a creeping-scope `/llmo` skill.
- The skill's surface area is small enough to maintain by a single steward indefinitely. Bus-factor risk is contained.

**Negative.**

- Publishers who want both LLMO and security.txt set up in one pass have to wait for a Trust Pack product (or run a second tool themselves). The friction is real and may slow adoption of either or both.
- The boundary requires ongoing discipline. A contributor unaware of this ADR could propose extending the skill to produce security.txt "while we have the data anyway," and that proposal would be reasonable on its face. This ADR exists in part to make the reviewer's job in that conversation explicit.
- If llmo.com never ships a Trust Pack, the bundled experience never materializes. The risk of leaving the bundled experience unbuilt is non-zero; this ADR accepts that risk in exchange for firewall integrity.

**Neutral.**

- The skill can still mention companion files in its closing report (phase 10) as informational pointers ("you may also want to publish a security.txt; see RFC 9116 or the Trust Pack at llmo.com"). Pointing at adjacent work is different from producing it; pointers are in-scope, production is not.
- This ADR does not constrain what the `llmo` CLI itself may do over time. The CLI is the protocol's reference implementation and may grow new subcommands for protocol-defined artifacts (e.g., a `llmo rotate` helper). The constraint is on what the bundled `/llmo` skill produces, not on the CLI's surface area generally.
