# LLMO Project Backlog

This document tracks deferred work, scheduled commitments, and open decisions for the LLMO project. It exists because long-running projects with multiple Claude sessions tend to lose track of "the thing we said we'd do later" without an explicit place to put it.

**Maintenance:** When you defer work, add it here with a trigger condition (when to do it). When you complete a backlog item, move it to the "Completed" section at the bottom with a date and reference (commit SHA, decision link).

**Scope:** This file tracks project work. Personal/strategic context for the operator lives in the local handoff documents at `~/Documents/llmo-handoffs/`.

---

## Track conventions

Every backlog item carries a `**Track:**` field declaring the artifact the item is expected to produce. Four values:

- **`lip`**: produces a LIP. Resolution goes through the LIP-1 process (DNS TXT proof of control for Standards Track, 7-day public discussion window with non-author response, editor-mediated review for Process and Informational types). The append-only LIP registry records the result.
- **`adr`**: produces an ADR. Operational decision recorded in `content/adr/` per Nygard format. Cross-linking discipline per ADR-0000 applies (the ADR's `## References` section back-links to PRs and changelog versions where the decision is load-bearing).
- **`changelog`**: produces a changelog entry but does not rise to the LIP threshold. Spec patches in this category are typo fixes, factual corrections, schema clarifications, and other editorial revisions that do not change normative content. Resolution is a commit that updates `content/spec/changelog.md`.
- **`none`**: produces no documentation artifact. Operational work, dependency updates, infrastructure tweaks. Resolution is recorded in the COMPLETED section of this file with the resolving commit's SHA.

When an item resolves, the resolving commit either includes a `Resolves: BACKLOG#item-id` line in its message or moves the item to the COMPLETED section of this file in the same commit. CI enforces this discipline for items tagged `lip`, `adr`, or `changelog` (see `.github/workflows/backlog-discipline.yml`).

Existing items predate this convention and do not yet carry Track tags. New items added going forward include a `**Track:**` line at creation. Existing items get tags opportunistically when next touched. Backfilling all 30+ existing items in one pass is overengineering and likely to introduce error.

---

## SCHEDULED COMMITMENTS (date-bound, must happen)

### 2026-07-15: Re-sign Diverse.org's llmo.json

**What:** Quarterly re-signing of `static/.well-known/llmo.json`. The current signature expires 2026-07-26 (`valid_until` field). Sign at least 7 days before expiry to give consumers time to refetch.

<!-- Em-dash below retained: faithful transcription of external 1Password label, not project content. Do not "fix". -->
**How:** Procedure documented in `infrastructure/SIGNING-CEREMONY.md`. The previous v2 ceremony directory at `~/llmo-key-ceremony-2026-04-26-v2/` has working `sign.py` and `verify.py`. Create a new dated ceremony directory; copy the private key from 1Password ("LLMO ES256 signing key — diverse-2026-01"); update `valid_from`, `valid_until`, and `document_id` in payload; run sign + verify; commit signed JSON.

**Verification step:** After publishing, validate at https://llmo.org/validator/. Must pass Strict tier. If it fails, do not consider the rotation complete until the failure is fixed.

**Calendar reminder set:** Confirm Nic has set this in his calendar. If not, do that as the first action of any post-conference work session.

**Same key, same kid:** v0.1 quarterly rotations re-use kid `diverse-2026-01`. The key only rotates when there's a real reason to (compromise, hardware migration, etc.). When it does rotate, both old and new keys go in the JWKS for a transition period.

---

### 2026-07-26: llmo.json valid_until expires

This is the deadline for the above. After this date, validators will (correctly) flag the document as expired. A consumer fetching the document on 2026-07-27 sees an expired claim. **Do not let this date arrive without re-signing.**

If the 2026-07-15 re-signing doesn't happen for any reason, this becomes a real production incident. Move the demo down to "we have a spec" without "and we use it ourselves"; the protocol-uses-itself loop breaks if our own document is expired.

---

### Tomorrow (2026-04-28) before conference

**Email Mintlify support to delete the orphaned project.**

Context: Mintlify project was created via GitHub App install in early 2026 without a paired user dashboard account. The project still exists on Mintlify's infrastructure even though we've migrated to Hugo and uninstalled the GitHub App. The project orphan is harmless (no traffic flows through it), but it's a loose end. Deleting it tidies up.

**How:** Email support@mintlify.com from Nic's rocketmail address (the one originally tied to the GitHub App install). Suggested wording:

> Hi, I'd like to fully delete a Mintlify project that was orphaned during a migration. The project was for github.com/openllmo/llmo.org and was installed via your GitHub App without a paired dashboard account. The GitHub App has been uninstalled. I'd like the project itself fully removed from your infrastructure. Can you confirm deletion?

Async; they'll reply when they reply. Not blocking anything.

---

## ANNOUNCEMENT BLOCKERS (gate the v0.1 announcement)

Items in this section gate the v0.1 public-launch announcement. The conference (April 28) has happened; these items separate "we showed it" from "we shipped it." Sequence is not encoded in the order; sequencing is decided at the moment of work against current state.

## ANNOUNCEMENT CREDIBILITY (soft, not strict gating)

Items in this section materially weaken external credibility if absent at announcement time, but do not strictly gate the announcement. A security-minded reviewer (including IETF Internet-Draft reviewers) hits these first when LLMO gets external attention.

### Threat model document

**Track:** `adr`

**Status:** Implicit in §8 attack vectors, not documented as a standalone threat model.

**Estimate:** 4-8 hours.

**Why credibility:** IETF reviewers and security-minded readers routinely ask "where's the threat model?" before reading the spec. Having one document the answer raises signal-to-noise on early review passes.

**Scope:** Document attacks LLMO defends against (existing §8.x prose), attacks it explicitly does NOT defend against (consumer-side attacks against publishers, social engineering of publishers, registrar-layer DNS attacks, etc.), and abuse surfaces (publisher reputation laundering, false disavowals, false supersessions, key compromise scenarios). Format as ADR per Nygard structure.

### Implement §5.2 S6 in validator.js and CLI

**Track:** `changelog`

**[Deferred to v0.2 / LIP-candidate; partial documentation in v0.1.6]** §5.2 S6 binding enforcement.

Filed 2026-05-08. Investigation surfaced material spec ambiguity: the disavowal half of S6 lacks a schema discriminator that would let reference validators machine-check the rule. The supersedes half is cleaner but shipping half of S6 is worse than shipping none.

v0.1.5 (2026-05-05) labeled the rule as S6 in §5.2 Standard tier without binding validator enforcement. v0.1.6 (released 2026-05-08, llmo.org PR #79, SHA 6c2de9fcd75aadec5a2a430602cf71625a4a3470) documents the deferral in §5.4: reference validators report S6 informationally pending the schema discriminator. Filed LIP candidate (see "LIP: schema discriminator for disavowal categories" entry below) for the schema addition. Binding S6 enforcement can return in a v0.1.7 patch or v0.2 once the LIP lands.

**Estimate:** 2-4 hours per implementation once the disavowal-discriminator LIP lands.

**Why credibility:** A spec rule with no enforcement is a claim with no verification. Anyone running an implementation today is told "Standard tier" for documents that fail S6.

**Scope:** Add S6 check in `static/js/validator.js` (claim by claim, distinguishing disavowal from supersedes) and in `cli/src/lib/tier.ts`. The disavowal "what" field is the discriminator: values implying impersonation defense (`unaffiliated_domain`, etc.) are in scope; values implying third-party assertions (competitor product quality, third-party content) are out. Once the disavowal-discriminator LIP lands, the discriminator becomes a schema field rather than a hard-coded enum. The supersedes half is already machine-checkable (publisher-controlled URLs vs third-party URLs) and may be enforced earlier in a v0.1 patch. Update `negative-s6-disavowal-third-party.json` expectation in the harness when implementations land. Vectors `negative-s6-disavowal-third-party.json` and `edge-disavowal-impersonation-defense.json` document the gap.

### LIP: schema discriminator for disavowal categories

**Track:** `lip`

**Status:** LIP candidate. Surfaced 2026-05-08 by PR #74's drift investigation; documented in v0.1.6 §5.4 as the substrate that binding S6 enforcement is waiting on.

**Estimate:** 2-4 hours drafting, plus the LIP-1 7-day public discussion window.

**Scope:** Add a discriminator field to `disavowal.disavowed[]` in the schema (e.g., `category: "self_statement" | "impersonation_defense"` or equivalent) so reference validators can machine-check S6's disavowal half without interpreting publisher-asserted prose. Spec text in §3.5 updates to reference the discriminator as the normative authority for which scope a disavowal entry claims; §5.2 S6 updates to enforce against the discriminator field. The supersedes half is already machine-checkable from the URL set and can be enforced in the same release once the disavowal half has substrate.

**Why:** v0.1.5 promoted S6 to Standard tier; v0.1.6 documents the binding-enforcement deferral in §5.4. Binding S6 requires a schema substrate the spec doesn't currently carry. Without this LIP, S6 stays informational indefinitely, and the §5.4 deferral note becomes load-bearing rather than transitional.

**Detection signal:** S6 still informational after v0.2 publication.

**Recovery action:** Land the LIP through the normal LIP-1 process; close out v0.1.6's §5.4 deferral note in the v0.1.7 (or v0.2) changelog when binding enforcement returns.

### Implement §4.3.1 b64:false and crit rejection

**Track:** `changelog`

**[Resolved 2026-05-08 by llmo.org PR #78, SHA d7d2bcdb18d559dabb0b098c6a7c5ab98ff34706]** Validator b64/crit enforcement (§4.3.1).

Originally filed 2026-05-08 as "Spec §4.3.1 explicitly prohibits b64: false and non-empty crit in JWS protected headers; neither validator.js nor CLI checks." Investigation 2026-05-08 (post-filing) corrected the state: CLI implements the check in `src/lib/jws.ts`; validator did not. Resolved by validator-side enforcement in PR #78; both reference implementations now agree on §4.3.1-malformed input.

### Implement S4 and X4 in CLI

**Track:** `changelog`

**[Resolved 2026-05-08 by cli PR #5, SHA b407061fad9af9533bda0a917b27a8906c6cf0da]** CLI does not enforce S4/X4.

Originally filed 2026-05-08. CLI tier.ts ports validator.js's S4 and X4 implementations; informational notes dropped; vector harness now produces identical CLI-vs-validator outcomes. Resolved by cli PR #5. Coordination harness expectation update on llmo.org landed 2026-05-08 in PR #80, SHA c8a4ab788ca941e07bb93e94a1d8231b35c3b552.

### Re-vendor canonical schema into CLI

**Track:** `none`

**[Resolved 2026-05-07 by cli PR #1, SHA 151acf6]** CLI vendored schema lags canonical.

Filed 2026-05-08 from a snapshot that predated cli PR #1's re-vendor (2026-05-07). Investigation 2026-05-08 confirmed the CLI's `src/schema/v0.1.json` is byte-identical to canonical except for the deliberate `$comment` provenance line inserted by `scripts/vendor.sh`. No further action; the v0.1.4 schema completeness changes (claim.type oneOf, statement_identity.founded pattern) are present in the CLI.

Vendor-drift CI guard added 2026-05-08 in cli PR #4, SHA f3b41aed377aede1d79f3b3c4e293ea6002d6edd, to prevent re-occurrence of the snapshot-vs-reality drift pattern.

---

## ACTIVE PRIORITIES (sequenced for upcoming work)

### Priority 14c: Diverse.org's own Hugo site

**Status:** Not started. Diverse.org has no public site of its own; everything currently flows through llmo.org.

**Why it matters:**
- Diverse.org needs a face. It's the steward of the protocol; visitors should be able to learn about the org, its governance, its mission.
- The §7 worked example in the spec promises diverse.org/.well-known/llmo.json will eventually exist. Without diverse.org's site, that promise is incomplete.
- The Greyfront firewall disclosure has to live somewhere. diverse.org/about is the right place.
- The /about/leadership URL was promised in the spec annotation as the eventual target for the personnel claim's verification URLs. Doesn't exist yet.

**Decision needed:** New repo (e.g., `openllmo/diverse.org`) vs. monorepo with llmo.org. Lean: new repo. Cleaner separation. diverse.org is a separate project from the spec; lumping them together blurs the firewall.

**Scope:**

1. New Cloudflare Pages project (`diverse-org` or similar)
2. New GitHub repo `openllmo/diverse.org`
3. Hugo build sharing visual language with llmo.org:
   - Same palette (#FFFFFF/#0A0A0F light, #100F0D dark)
   - Same fonts (Inter, JetBrains Mono)
   - Same component patterns (header, footer, theme toggle)
   - Same Stripe/Linear/Vercel register
   - Logo: same mark, perhaps different color treatment if needed (red is reserved for llmo.com, black-on-white for both .org sites is fine)
4. DNS: diverse.org → diverse-org.pages.dev (whatever the Pages subdomain becomes). **Find out current registrar/DNS provider for diverse.org first**; likely needs to be added to ACCOUNTS.md.
5. Custom domain on Cloudflare Pages (diverse.org and www.diverse.org)
6. Content needed:

**About / mission page:**
> Diverse.org is a California 501(c)(3) nonprofit (EIN 99-2870125) stewarding open protocols for organizational identity in the AI era. Our flagship project is LLMO, the open standard for /.well-known/llmo.json. We believe the AI-mediated web requires verifiable, organization-controlled identity infrastructure that no single vendor controls.

**Governance page:**
- Board: Nic Chavez (Chairman), Jack Dudley (Director), Andrew Mark (Secretary)
- Bylaws (link to PDF if available, or "in development")
- Fiscal classification: 501(c)(3), Charitable + Educational
- 990-N filing status (most recent: TBD; Diverse.org is new, may not have filed yet)
- Annual report (when available)

**Greyfront firewall disclosure:**
> ## Diverse.org and Greyfront, Inc.
>
> LLMO is stewarded by Diverse.org as an open protocol. Commercial offerings on top of LLMO (including the validator-as-a-service product at llmo.com) are built and operated by Greyfront, Inc., a Delaware C-corporation legally separate from Diverse.org.
>
> The two entities are governed independently:
> - Diverse.org is funded by donations and grants. Its decisions are made by its board.
> - Greyfront is funded by venture capital and revenue. Its decisions are made by its officers.
> - No officer of Diverse.org is bound by any Greyfront commitment, and vice versa.
> - Diverse.org may not show preference to Greyfront in protocol decisions.
>
> The protocol's openness is what enables Greyfront to exist. Greyfront does not control the protocol.

**Leadership page (/about/leadership):**
- Each board member with name, role, brief bio
- This URL was promised in the spec; signed llmo.json's personnel claim should eventually point here for verification URLs
- One-paragraph bios, no photos required for v1

**Donations page:**
- Diverse.org currently has zero donors (as of 2026-04-27). Real opportunity: visitors at the conference may want to donate to demonstrate support for the open protocol layer.
- Options: direct donation (Stripe, donorbox), GitHub Sponsors, fiscal sponsor
- Decision required: how does Diverse.org accept money? Likely starts with a Stripe-based simple form. Add link to Diverse.org's CA charity registration when filed.

**Contact / security:**
- General inquiries: contact@diverse.org (or similar)
- Security disclosures: security@llmo.org (PGP fingerprint already published)
- /.well-known/security.txt (link spec compliance)

**Diverse.org's own /.well-known/llmo.json (Priority 14d):** see below.

**Estimate:** 4-6 hours of focused work. Real risk: the donations infrastructure could spiral into Stripe setup, charity registration paperwork, etc. Defer that; for v1, even just "donations coming soon" or a simple Stripe link is enough.

---

### Priority 14d: Diverse.org's own /.well-known/llmo.json

**Status:** Not started. Depends on Priority 14c.

**Why it matters:**
- Completes the §7 worked example's promise: "the signed instance is published at https://diverse.org/.well-known/llmo.json"
- Demonstrates the alias-symmetric publication pattern the spec describes
- Doubles the demo loop: now both llmo.org and diverse.org publish under their own protocol

**Scope:**

1. Generate or re-use ES256 keypair. Decision: **same key**. Same legal entity (Diverse.org, Inc.) is signing both documents; using two different keys would imply two different signing authorities. Re-use kid `diverse-2026-01`.

2. Construct payload similar to llmo.org's, but:
   - `primary_domain`: `"diverse.org"` (matches serving domain; Standard tier S3)
   - `aliases`: `["llmo.org", "emerging.org"]` (the others)
   - Same identity claim, leadership claim, disavowal claim
   - `canonical_urls.docs`: `https://llmo.org/spec` (still points at the spec)
   - `canonical_urls.homepage`: `https://diverse.org` (now exists per 14c)
   - `canonical_urls.security`: `https://diverse.org/.well-known/security.txt`
   - Different `document_id` (e.g., `2026-q2-diverse-initial`)
   - Same `valid_from`, `valid_until` window as llmo.org's document (consistency for re-sign cadence)

3. Sign with same procedure as llmo.org (jwcrypto + JCS + ES256)

4. Place at `static/.well-known/llmo.json` in diverse.org repo

5. Publish JWKS at `diverse.org/.well-known/llmo-keys.json`. **Same JWKS content** (same public key) as llmo.org's. The JWKS is per-domain by spec convention but the underlying key is the same entity's.

6. Validate at https://llmo.org/validator/. Must pass Strict tier.

7. **Update §7 prose in llmo.org's spec** to reflect both URLs are now live: change "Diverse.org will mirror at https://diverse.org/.well-known/llmo.json once Diverse.org's own site launches" to "The same signed document is also published at https://diverse.org/.well-known/llmo.json."

**Verification:** Both documents must validate at Strict tier independently. Both must verify against their respective JWKS endpoints. Both should reference each other via the aliases mechanism.

**Estimate:** 1-1.5 hours after Priority 14c is done.

---

## DEFERRED: POST-CONFERENCE (April 29+)

### Soft public launch (HN, Twitter, etc.)

**Status:** Not yet planned.

**What:** A real public-launch moment beyond the conference. Hacker News submission, Twitter announcement, possibly outreach to Stripe blog or similar venues.

**Why deferred:** Conference is April 28. See what feedback comes back, who shows interest, what questions surface. Then craft the public-launch moment with that information.

**Decision required:** Timing (weeks after conference?), venues, what to lead with. Likely "we built X, here's what it solves, here's our own llmo.json passing Strict tier conformance, here's how to validate yours" framing.

**Pre-condition:** Diverse.org site exists (Priority 14c done). Without it, the public launch lacks the steward's face.

---

### WordPress plugin development

**Status:** Not started. Strategic priority for Greyfront commercial arc.

**Why it matters:** Yoast SEO has demonstrated that the WordPress plugin distribution channel is real (Yoast: $12M ARR at acquisition). LLMO's commercial product can follow the same path: a WordPress plugin that helps publishers configure and validate their llmo.json.

**Pre-conditions before starting:**
1. Greyfront has actual infrastructure (no DNS/hosting/email yet)
2. Brand brief for llmo.com (v6 brief was sketched, not formalized)
3. Initial product spec for the plugin (what exactly does it do?)

**Estimate:** 4-6 weeks of focused development for a v1 plugin. Pre-launch work probably 2 weeks.

---

### Joost de Valk outreach

**Status:** Not initiated.

**Context:** Joost is the founder of Yoast. The Yoast distribution thesis was Nic's framing for the LLMO commercial arc. Joost may be a useful advisor, investor, or partnership conversation when the time is right.

**When:** Not yet. Wait until the Greyfront/llmo.com product has more shape so the conversation has substance. Cold outreach with "we're building a thing" goes worse than "we built a thing and want to talk about distribution."

---

### Greyfront infrastructure stub

**Status:** Three domains parked (greyfront.com, grayfront.com, llmo.com), no infrastructure deployed.

**What's needed:**
- Registrar/DNS for the three domains (likely the same one used for llmo.org and diverse.org)
- Email infrastructure (Greyfront Google Workspace or similar)
- Web infrastructure (Cloudflare Pages probably)
- Admin identity (who's the admin user, currently nobody)
- Add to ACCOUNTS.md once provisioned

**Why deferred:** Greyfront has no products yet. Provisioning infrastructure for an empty company is premature. When the first commercial product is real (likely the WordPress plugin), Greyfront infrastructure gets stood up alongside.

---

### GitHub openllmo org migration

**Status:** Open. Currently administered by personal @thegigachav account.

**What:** The openllmo GitHub organization is owned/administered by Nic's personal GitHub account. Long-term, it should be administered by a Diverse.org-tied identity (e.g., `diverse-org` or similar service account, with @thegigachav as a member but not the sole owner).

**Why deferred:** No urgency. Personal-owner-of-org is fine for v0.1 lifecycle. Migration becomes a real concern when:
- Diverse.org has employees
- A board member is added as a co-owner
- Continuity-of-operations becomes a board-level concern

**Estimate:** ~30 minutes of admin work. The blocker is identity decisions (what's the service account email? what's the recovery path?), not implementation.

---

### Self-host Inter and JetBrains Mono fonts

**Status:** Currently using Google Fonts.

**Why it matters:**
- Removes a third-party dependency (every page load currently includes a request to fonts.googleapis.com)
- Slight performance improvement (no DNS lookup, no separate connection)
- Privacy: Google Fonts can theoretically log visitor IPs

**How:** Download Inter and JetBrains Mono WOFF2 files, place in `static/fonts/`, update `baseof.html` to use `@font-face` with local paths, remove the Google Fonts `<link>` tags.

**Estimate:** 1-2 hours including testing on multiple browsers.

**Why deferred:** Conference deadline. Self-hosting is the right call but Google Fonts works. Do this in the post-conference cleanup window.

---

### v6 brand brief writeup

**Status:** Sketched, not formalized.

**Context:** During the LLMO planning sessions before this handoff, a v5 brand brief was drafted. Mid-session on April 26, a v6 delta was sketched that added: Basic Verified tier ($50/mo $499/yr), verification-state axis (Verified/Stale/Unverified/Claimed/Caveat-Emptor) orthogonal to rating tier (Audited/Standard/Basic/Inferred/Unclaimed/Caveat-Emptor). The Yoast distribution thesis ($12M comparison) was added as the GTM frame.

**What's needed:** A consolidated v6 brief document that supersedes v5. Captures pricing tiers, verification semantics, distribution thesis, plugin roadmap.

**Why deferred:** Brand briefs are strategic documents for Greyfront/llmo.com, not for v0.1 spec/Diverse.org work. Tackle in the post-conference Greyfront-stand-up window.

---

### index.json path field semantics review

**Status:** Resolved for v0.1 internal use; may need formalization if exposed publicly.

**Context:** `static/spec/lips/index.json` carries a `path` field for each LIP. In yesterday's migration, the field was changed from filesystem-relative (e.g., `/content/spec/lips/lip-0001.md`) to public URL (`/spec/lips/lip-0001/`). The validator script `scripts/validate-lip-registry.sh` maps URL → filesystem path internally.

**What's open:** If the spec ever formalizes `index.json` as a public, machine-consumable schema (e.g., "any LLMO-conforming registry exposes a registry index at this URL with this shape"), the path field semantics need to be locked in. Currently they're a project convention, not a spec contract.

**Why deferred:** No external consumer needs index.json yet. The validator is the only consumer.

---

### Cloudflare Pages soft-404 deeper investigation

**Status:** Resolved with Hugo 404.html, but worth knowing.

**Context:** Cloudflare Pages serves index.html with HTTP 200 for unknown paths by default ("soft-404"). Adding `404.html` to the build root makes Cloudflare serve it with HTTP 404. We did this on April 26.

**What's open:** The 404 page could be smarter (suggest "did you mean X?" based on similar URLs), or use search functionality. Low priority.

---

### Self-hosted Wikidata QID for Diverse.org

**Status:** Diverse.org doesn't have a Wikidata entry.

**Context:** Wikidata QIDs are useful as `external_ids.wikidata` in llmo.json. They're cross-references that LLMs increasingly use to resolve entities. Diverse.org doesn't have one because it's a young nonprofit. Anyone can create one; the entity needs to meet Wikidata's notability criteria.

**Why deferred:** Diverse.org probably doesn't meet Wikidata notability yet (very new, no significant press coverage). Revisit after the conference produces some coverage.

---

### IETF Internet-Draft submission

**Track:** `none`

**Status:** Not submitted. Parallel-clock: long async wait; start now, complete async.

**Estimate:** 4-6 hours to prepare the draft from existing v0.1 spec, plus IETF datatracker registration time.

**Scope:** Working title `draft-chavez-llmo-protocol-00`. Convert v0.1 spec to xml2rfc or kramdown-rfc format. Submit via datatracker.ietf.org. Once submitted the draft becomes citable in formal contexts and assigns a tracking number.

---

### IANA RFC 8615 well-known URI registration

**Track:** `none`

**Status:** Not submitted.

**Estimate:** 2-3 hours (forms and email).

**Scope:** Register `/.well-known/llmo.json` per RFC 8615.

---

### IANA RFC 6838 media type registration

**Track:** `none`

**Status:** Not submitted.

**Estimate:** 2-3 hours.

**Scope:** Register `application/llmo+json` per RFC 6838.

---

### OpenSSF Scorecard activation

**Track:** `none`

**Status:** Not activated for openllmo repos.

**Estimate:** 1 hour.

**Why:** Signals project hygiene to security reviewers. Cosmetic on its own; the marker matters for credibility even when the underlying score is initially low.

---

### Defensive domain registrations

**Track:** `none`

**Status:** Not started. Distinct from the existing carry-over registrar transfer item: that was about consolidating already-owned domains under a single registrar; this is about preventing squatters on names not yet held.

**Estimate:** 2-3 hours.

**Scope:** Register `llmo.dev`, `llmo.io`, `llmo.protocol` (if available), anti-typosquatting variants (`llmoo.org`, `llmo-protocol.org`, etc.). Verify `llmo.com` status (Greyfront-operated). Park under the entity that holds the relevant brand: protocol-name variants under Diverse.org / team@diverse.org; commercial-product variants under Greyfront.

---

### Social handle reservations

**Track:** `none`

**Status:** Not started.

**Estimate:** 1-2 hours.

**Scope:** Reserve `@llmo` (or `@llmoprotocol` if `@llmo` is taken) across X, Bluesky, Mastodon, GitHub.

---

### Package registry reservations

**Track:** `none`

**Status:** Not started.

**Estimate:** 1 hour.

**Scope:** Reserve `llmo` on crates.io, PyPI, Docker Hub. Plus relevant scoped packages where naming conventions differ.

---

### GitHub `llmo` and npm `llmo` reclamation

**Track:** `none`

**Status:** Not started. Outcome depends on platform processes; likely weeks of waiting per platform.

**Estimate:** Variable.

**Scope:** If `llmo` is squatted on GitHub or npm, file reclamation requests through each platform's trademark/project-name policy.

---

### Author identity infrastructure

**Track:** `none`

**Status:** Not started.

**Estimate:** 2-3 hours total.

**Scope:** Create ORCID iD for Nic Chavez. IETF datatracker author profile. OpenSSF Best Practices badge for `openllmo/llmo.org`. These are durable cross-references that connect spec authorship to a portable identity not tied to any single platform.

---

### Claude Code skill for non-developer publishers (v0.2-class)

**Track:** `none`

**Status:** Not started. v0.2-class deliverable; not announcement-blocking.

**Estimate:** 6-10 hours.

**Why deferred:** Closes the gap between "publishers who can use the CLI" and "publishers who can use any LLM that knows about the skill." Strategic for adoption beyond the developer cohort.

**Scope:** A guided workflow walking a non-technical organization through key generation, llmo.json drafting, signing, and deployment. Distributed via the standard Claude Code skills mechanism, adaptable to other agentic AI clients.

---

### CLI command coverage audit (v0.2-class)

**Track:** `none`

**Status:** Not started. v0.2-class scoping work.

**Estimate:** 2-3 hours for the audit. Implementation of any missing commands is separate effort and gets new BACKLOG entries when prioritized.

**Scope:** Read llmo-cli source. Enumerate every command actually implemented. Compare against publisher needs (init, keygen, sign, verify, validate-against-URL, rotate, revoke, deploy-helpers, help, version). Surface gaps. Identify command-line UX gaps (does `sign` accept stdin? does `verify` accept a URL or only a file?). Output is a recommendations document for the v0.2 cycle.

---

### Codify squash-merge as the project convention in PR template and CLAUDE.md

**Track:** `none`

**Status:** Not started. Surfaced 2026-05-06 after the PR #33 / #34 / #35 sequence under enforced branch protection.

**Estimate:** 30 minutes.

**Why:** The PR is the unit of intent; one PR equals one logical change. Squash-merge collapses the back-and-forth mechanics of getting CI green (e.g., PR #34's two-commit thread to escape the validator's circular freshness check) into a single commit that reflects the intent. Two side benefits: (1) main's history reads as PRs rather than commits, matching how a human summarizes the week; (2) the weekly digest produces one entry per merge instead of multiplying entries for multi-commit PRs that don't add information.

**Scope:** Update `.github/pull_request_template.md` to note that PRs are merged via squash. Update `CLAUDE.md`'s "Repository conventions" section (or add a short merge-strategy subsection) to codify the same. Optional: tighten the GitHub repo settings to disable merge-commit and rebase-merge as merge methods, leaving squash as the only available choice. The codification PR is itself a small follow-up; this BACKLOG item exists so the directive is not lost.

---

### Document per-commit semantics of the BACKLOG-discipline rule

**Track:** `none` (contributor-facing documentation)

**Status:** Not started. Surfaced 2026-05-08 during the public-discoverability push: PR #70 (predecessor of PR #71) hit a noisy-recovery loop because the discipline rule fires per-commit, not per-PR. The first commit added three new ADR files; the BACKLOG-update fix was in a follow-up commit on the same branch. The rule rejected the first commit despite the second commit modifying BACKLOG.md. Recovery required a local squash-and-force-push, plus an extra round of branch deletion and recreation that closed and reopened the PR.

**Estimate:** 30 minutes.

**Why this is BACKLOG and not LESSONS:** The rule itself is correct. The gap is contributor-facing documentation of how to work with it cleanly. Forward-looking discipline documentation, not a retrospective on a failure.

**Scope:** Document the per-commit (not per-PR) semantics of the BACKLOG-discipline rule in `CONTRIBUTING.md` (or whichever contributor-facing workflow docs the project maintains). Include a recommended workflow: when a commit changes operational state that warrants a BACKLOG update, include the BACKLOG update in the same commit, not a follow-up commit. Reference `.github/workflows/backlog-discipline.yml` and add a comment header in that workflow file pointing back at the contributor doc.

**Detection signal:** A future contributor (or a future Code session) hits the same squash-and-force-push recovery loop after a BACKLOG-rule rejection.

**Recovery action:** Add the doc; reference it from `CONTRIBUTING.md` and from a new comment header on the workflow file.

---

### Single-source-of-truth pattern for "current state" surfaces

**Track:** `none` (operational discipline)

**Status:** Not started. Surfaced 2026-05-08 during verification of the public-discoverability push: the homepage Status section was stale (still claiming v0.1.1) while the changelog and the press kit were current (v0.1.5). At least three "current state" surfaces (homepage, press kit, and the validator's footer build-stamp) reference version-specific or release-count values that need to stay in sync with the changelog's most recent entry.

**Estimate:** 2-4 hours.

**Why this is BACKLOG and not LESSONS:** Forward-looking automation work, not a retrospective on the staleness incident itself. The fix is a substrate-level pattern that prevents recurrence.

**Scope:** Identify all "current state" surfaces on llmo.org that reference a specific version number, release date, or release count. Implement a single-source-of-truth pattern. Three viable approaches:

1. **Hugo data file driven by the changelog.** A small build-time script reads the changelog's most recent versioned entry and writes the version, date, and release count to `data/current.toml` (or equivalent). Templates pull from `.Site.Data.current`. Update happens once per release, in the changelog commit.

2. **Build-time injection via a script.** Same effect via a pre-build step that derives the values and rewrites a single source-of-truth file. More explicit, more code.

3. **Frontmatter convention plus CI cross-check.** Each "current state" page declares the version it references in frontmatter. A CI check fails the build if any declared version is older than the changelog's most recent entry. Catches drift but does not auto-fix.

Pick the approach that fits the existing site architecture; (1) is probably cleanest for Hugo. As a minimum-viable fix until the SSOT pattern lands: list the surfaces in this BACKLOG entry so future updates touch all of them deliberately.

**Surfaces currently identified:**

- Homepage Status section (`content/_index.md`, the "version **0.1.6**" line). Updated 2026-05-08 (v0.1.6 release).
- Press kit Current Status section (`content/about/press.md`, the release-count line). Updated 2026-05-08 (v0.1.6 release).
- Updates entry for the release week (`content/updates/2026-05-08.md`). Closing paragraph appended 2026-05-08 to mark v0.1.6.
- Validator footer build-stamp at `/validator/` (auto-derived from git SHA via `enableGitInfo`; no manual maintenance).
- Changelog's [Unreleased] header (`content/spec/changelog.md`, implicitly the source of truth).

Add to this list as additional surfaces are surfaced.

**Detection signal:** A new specification version ships and a "current state" surface (homepage status, press kit, etc.) is not updated within the same PR, falling out of sync with the changelog.

**Recovery action:** Manual sync until the SSOT pattern is in place; afterward, the SSOT update is the only required edit per release.

---

### BACKLOG-vs-reality drift discipline

**Track:** `none` (process discipline)

**[Open]** BACKLOG-vs-reality drift discipline.

Surfaced 2026-05-08 by PR #74 drift investigation. Two of four findings filed on 2026-05-08 turned out to be stale or wrong relative to the actual codebase state: Finding #2 framed both implementations as missing the §4.3.1 check (only validator was missing); Finding #4 referenced a schema-vendor gap already resolved by cli PR #1 the day before.

Second instance of the same pattern fired during the same session: PR D-1's first draft folded the [Unreleased] b64/crit fix into v0.1.5 and bumped v0.1.5's date from 2026-05-05 to 2026-05-08, falsifying the as-published v0.1.5 snapshot. Operator caught on review; correction commit (llmo.org PR #79, SHA 6c2de9fcd75aadec5a2a430602cf71625a4a3470) reverted v0.1.5 to its as-published state and moved the b64/crit fix into v0.1.6 alongside the §5.4 S6 deferral.

The general pattern: BACKLOG entries (and changelog entries) are snapshots from when written, not current ground truth. Investigation-first prompts that read current state should be the default for non-trivial BACKLOG-driven work, especially for entries crossing repo boundaries, filed days before action, or rewriting historical state.

**Detection signal:** A BACKLOG-driven prompt finds the described state has changed materially since filing; or, an edit to a versioned changelog entry changes that entry's date or substantive content after publication.

**Recovery action:** Investigation report identifies the corrected state; act on the corrected state, not the BACKLOG framing. For changelog: never modify a published version's date or substantive content; new releases get new entries.

This is process discipline rather than codebase work; no PR resolves it. Tracking here so the discipline becomes deliberate going forward.

---

### Route weekly-digest output to /updates/ automatically

**Track:** `none`

**Status:** Not started. Surfaced 2026-05-08 by PR 3 of the public-discoverability push, which created the `/updates/` content section and backfilled three weekly entries by hand.

**Estimate:** 3-6 hours, depending on whether a transform step is included.

**Why:** The weekly-digest workflow already produces a per-week markdown narrative at `infrastructure/weekly-digest/YYYY-WNN.md`. That output is technical (commit-message-derived, organized by file-path category) and lives in a directory Hugo's `ignoreFiles` excludes from build output. The polished journalist-readable counterpart at `/updates/` is currently hand-written or hand-polished. Routing the digest output (or a transformed version of it) into `content/updates/` automatically would close the manual-writing gap that exists between cadence-driven internal record and cadence-driven public surface.

**Scope:** Two parts, separable:

1. **Direct route.** Modify the digest workflow (or add a downstream step) to copy the generated markdown into `content/updates/` with appropriate frontmatter (title, linkTitle, description, date) and commit the public version alongside the technical version. The two files have the same content; the technical one stays as the build artifact, the public one becomes the rendered page. Lowest effort; produces public content that reads as commit-summary-prose.

2. **Polished transform.** Add an LLM-call or rules-based transform step that converts the technical digest into a journalist-register summary (active voice, plain-language framing, named shipped surfaces with links). The transform's output goes into `content/updates/`. Higher effort, more useful for non-developer readers. Defer until 4-6 weekly updates have been hand-written so the polished-register target is well-defined.

**Detection signal that this is needed:** weekly-digest run produces a useful technical narrative, but the corresponding `/updates/` page is missing or out of date because no human wrote it that week.

---

### Long-form blog at blog.llmo.org

**Track:** `none`

**Status:** Not started. Surfaced 2026-05-08 by PR 3 of the public-discoverability push.

**Estimate:** 6-12 hours for substrate (subdomain, build pipeline, signing convention); ongoing for content.

**Why:** `/updates/` is cadence-driven (weekly summaries of project activity). A long-form blog covers a different register: protocol-design narrative, decisions explained at essay length, replies to external reviewers, engagement with the broader trust-layer conversation. The blog and the updates page are complementary, not redundant.

**Scope:**

1. Subdomain `blog.llmo.org` provisioned and pointed at a Hugo build (or alternative if a different generator fits better). Cloudflare Pages can host both `llmo.org` and `blog.llmo.org` from separate projects if the operational separation is worth the complexity, or from the same project with a subdomain-aware build if not.

2. Posts dogfood the protocol: each blog post is signed against the project's signing key. The post's signed metadata is published alongside the post itself, demonstrating the protocol against a real text artifact rather than only against `llmo.json`. This is content choice plus a small build-pipeline change.

3. Cross-linking from `/updates/` to relevant blog posts and vice versa. Updates point at long-form essays when those exist; blog posts reference the cadence-driven updates as the project-state record they contextualize.

**Detection signal that this is needed:** essays written in personal notes or scratch documents that should be public but have nowhere to live; protocol-design rationale that requires more than an ADR can carry.

---

### LIP registry as generated artifact

**Track:** `none`

**Status:** Not started. Surfaced 2026-05-06 by the LIP-3 frontmatter-vs-registry drift incident (PR #33 → PR #34, recorded in `infrastructure/LESSONS.md`).

**Estimate:** 2-4 hours.

**Why:** Eliminates a whole class of registry-vs-frontmatter drift that's currently honor-system. `static/spec/lips/index.json` mirrors state that is authoritative in `content/spec/lips/lip-NNNN.md` frontmatter; two surfaces, manual sync, predictable drift. The validate-lip-registry CI catches the drift but only after it has landed, and the freshness check is structurally circular (a registry-only commit shifts its own expected `generated` date forward). Generating the registry from frontmatter on demand makes the drift mechanically impossible.

**Scope:** A script (or Hugo template, or pre-commit hook) reads each `content/spec/lips/lip-NNNN.md` frontmatter and builds `static/spec/lips/index.json`. Decision required: regenerate-on-build (file is gitignored, produced by Hugo on every build) vs regenerate-and-commit (file is checked in, mechanically refreshed by a script that's the only sanctioned way to modify it). External consumers (validators, downstream tooling) reference the published URL, so the file must exist at build output regardless. Once landed, the validate-lip-registry workflow's role narrows to checking semantic invariants, not freshness; the freshness check (currently circular for registry-only commits) can be retired or replaced with a content-hash check.

---

### Org-level workflow permissions for PR-creating workflows

**Track:** `none` (operator-action documentation, not pending engineering work)

**Status:** Enabled 2026-05-07 on both `openllmo/llmo.org` and `openllmo/cli`. Both repos are explicitly at `default_workflow_permissions: write` and `can_approve_pull_request_reviews: true`. Verifiable via `gh api repos/<owner>/<repo>/actions/permissions/workflow`.

**Why:** The `weekly-digest.yml` and `sunday-audit.yml` workflows create PRs from `github-actions[bot]` to comply with the enforced branch protection on `main`. PR creation by GitHub Actions requires two settings under `https://github.com/organizations/openllmo/settings/actions` (org level) AND the corresponding repo-level fields:

1. Workflow permissions: "Read and write permissions"
2. "Allow GitHub Actions to create and approve pull requests": checked

The org-level setting unlocks the repo-level setting; the repo-level setting must also be flipped explicitly (the org toggle does not auto-propagate to repos). If the openllmo org is migrated, restructured, has its security defaults reset, or is recreated, both levels must be re-enabled or both scheduled workflows will silently fail at the PR-creation step.

**Detection signal:** A scheduled run of either workflow that completes without committing its output file, or a workflow run log containing `pull request create failed: GitHub Actions is not permitted to create or approve pull requests`.

**Recovery action:** Re-enable both org-level settings per the URL above. Then for each affected repo: `gh api -X PUT repos/<owner>/<repo>/actions/permissions/workflow -F can_approve_pull_request_reviews=true -f default_workflow_permissions=write`.

**Why this is BACKLOG and not LESSONS:** Forward-looking operational dependency, not a past failure. LESSONS captures what went wrong; BACKLOG captures what needs to remain true.

**Relationship to the `llmo-workflow-bot` App:** As of 2026-05-08 (PR #64) the workflows create PRs as the App, not as `github-actions[bot]`. The App is the primary auth path. The org toggle remains required as defense-in-depth: the App cannot create PRs at all if the org toggle is off, regardless of App permissions. Both layers must hold.

---

### Migrate `actions/create-github-app-token` from `app-id` input to `client-id`

**Track:** `none` (small operational follow-up)

**Status:** Not started. Surfaced 2026-05-08 in PR #64 testing. The action's v3.x deprecates the `app-id` input in favor of `client-id`. Both the `weekly-digest.yml` and `sunday-audit.yml` workflows currently use `app-id` (functional, with a deprecation warning printed in the run log). Migrating to `client-id` removes the warning and aligns with the action's forward-looking contract.

**Estimate:** 30 minutes.

**Operator action required:** Surface the App's Client ID from `https://github.com/organizations/openllmo/settings/apps/llmo-workflow-bot` (visible on the App's General settings page, distinct from the numeric App ID). Add it as an org-level secret `LLMO_WORKFLOW_BOT_CLIENT_ID` scoped to the same three repos as the existing secrets.

**Code action:** Replace `app-id: ${{ secrets.LLMO_WORKFLOW_BOT_APP_ID }}` with `client-id: ${{ secrets.LLMO_WORKFLOW_BOT_CLIENT_ID }}` in both workflows. Verify via `workflow_dispatch` that PR creation still works under the App identity. Optionally retire the `LLMO_WORKFLOW_BOT_APP_ID` secret once the workflows no longer reference it.

---

### Carry-over from pre-handoff BACKLOG (2026-04-20 origin)

These items were captured in the original repo-root `BACKLOG.md` on 2026-04-20 and predate the comprehensive handoff structure above. Preserved here verbatim. Most are low-to-medium priority; surface during post-conference cleanup or when a related task naturally touches them.

**Infrastructure**

- **CAA records on llmo.org** (H): Restrict TLS certificate issuance to specific CAs (Let's Encrypt, Google Trust Services, DigiCert). Defensive hardening, ~2 minutes of work. Added 2026-04-20.
- **Registrar transfer from GoDaddy to Cloudflare** (M): Consolidate DNS and registration under team@diverse.org. Unlocks programmatic domain management. Requires GoDaddy EPP auth code + 5-7 day waiting period. Added 2026-04-20.
- **Diverse.org production signing infrastructure** (M, partly addressed): When the `/.well-known/llmo.json` re-signing process matures, migrate from local-file-plus-1Password key custody to a KMS-managed ES256 signing key with rotation policy, access controls, and documented key ceremony. v0.1 ships under operator-custody local file (acceptable). Workerd is the intended runtime when serving moves to a worker. Added 2026-04-20.

**Validator**

- **Defensive fallback cleanup in validator `index.html`** (L): Change `|| "none"` fallback in the `cls` assignment to `|| "fail"` so an undefined variant renders as red rather than unstyled. Latent, not currently triggered. Added 2026-04-20.
- **Server-side validator on workerd** (L): A self-hostable validator service would unblock signature verification (JWKS fetch without CORS) and allow observing headers like `Cache-Control` on the JWKS response. Out of scope for v0.1. Added 2026-04-20.

**Spec**

- **Authorship provenance for the LLMO specification** (M, partly addressed): Establish durable, independently-verifiable proof that Nic Chavez of Diverse.org authored the LLMO specification. Already partly satisfied by OpenTimestamps anchoring of LIP-1 and LIP-3 against Bitcoin block 946781. Remaining: GPG-sign commits on the spec repo with a key published on keybase.io, keys.openpgp.org, and a personal domain. Added 2026-04-20.

---

## FUTURE SCHEMA EVOLUTION (v0.2+)

These are spec-evolution ideas surfaced during v0.1 work. **Do not modify the v0.1 schema**: it's anchored. These belong in a v0.2 LIP.

### Richer `identity` claim type

The current `identity` schema has `{founded, headquarters, description}`. During the worked example refactor, several richer fields would have been useful:
- `legal_name` (separate from common name)
- `common_name` (informal/branded name)
- `entity_type` (501(c)(3), C-corp, LLC, etc.)
- `ein` or other tax ID
- `address` as a structured object (street, city, region, postal_code, country) instead of a flat string
- `mission` (separate from description)

A v0.2 LIP could add these as optional fields to the existing `identity` claim type, or create a richer `legal_identity` claim type.

### Distinct `leadership` claim type

The current `personnel.spokespeople` field accommodates board officers but is semantically a stretch. Officers-of-record (Chairman, Director, Secretary) are different from media spokespeople. A v0.2 LIP could add a `leadership` claim type for board-level governance, leaving `personnel` for spokespeople and operational contacts.

### Verification URL semantics

The current S4 rule is "verification URLs must resolve to owned domain or be marked as third-party pointers." The "marked as third-party pointer" mechanism is currently just `pointer` claim type. Could be cleaner: a `confidence` annotation on `verification` URLs (e.g., `verification_confidence: third_party`) that explicitly handles "I'm pointing at GitHub for this person, here's why that's acceptable."

### Verified-transaction review proof mechanism

Concept: a cryptographic proof (zero-knowledge or equivalent) that a real transaction occurred between business X and customer Z, which entitles Z to publish a verifiable review of X. Investigation needed to determine whether this is a claim type LIP (publishers attest that review at URL Y is backed by transaction proof), a substantive future-version feature of LLMO, or a separate adjacent protocol that interoperates with LLMO. Originally surfaced 2026-04-22 during Priority 9 work; deferred pending clearer framing.

### Key rotation and revocation

**Track:** `lip`

**Status:** Not started. Spec is currently silent on what happens when a publisher's private key is compromised. v0.2-class spec feature, not a v0.1 patch.

**Estimate:** 8-12 hours total: spec language, `llmo rotate` and `llmo revoke` CLI commands, validator handling of revoked keys.

**Scope:** A new LIP defines rotation and revocation semantics: how a publisher signals that a previous key is compromised, how validators discover and respect revocations, what the JWKS transition policy is during overlap windows. Resolution updates the spec series via the LIP-1 process plus CLI and validator implementation.

---

## OPEN QUESTIONS / DECISIONS PENDING

### Diverse.org fundraising strategy

**Open:** How does Diverse.org accept donations? Direct via Stripe? Fiscal sponsor (e.g., Open Collective, Hack Club Bank)? GitHub Sponsors?

**Trade-offs:**
- Direct Stripe: full control, but requires charity registration, tax compliance, financial reporting
- Fiscal sponsor: faster setup, but takes a percentage and ties Diverse.org to sponsor's infrastructure
- GitHub Sponsors: easy setup, but skews toward developers (smaller audience for nonprofit donations)

**Decision needed before:** Diverse.org goes live (Priority 14c). The donations page needs a path.

**Recommendation pending:** Stripe + simple form. Diverse.org is a real org with real legal status. Take the path that gives full control and reflects that.

### When to open up LIP authoring beyond Nic

**Open:** Currently Nic is the editor for all LIPs. The spec says authoring opens up in v0.2+, but the trigger is undefined.

**Real triggers to consider:**
- A community member submits a high-quality LIP draft via Discussions
- A founding board meeting establishes a formal LIP review process
- Diverse.org has a paid editor on staff
- Any of the three above plus general "Diverse.org has more than one active maintainer"

**Don't open it prematurely.** Editorial control concentrated in one person is fine for v0.1 lifecycle. Distributing editorial authority before the org has more bandwidth creates a bottleneck somewhere else.

### Whether to launch llmo.com publicly before WordPress plugin exists

**Open:** llmo.com (the commercial product domain) is parked. It could host a "coming soon" page now or wait until there's a real product.

**Considerations:**
- Pro: starts brand awareness, captures email signups for launch
- Con: empty page is worse than no page; "coming soon" pages are read as "vaporware"

**Recommendation:** Don't launch llmo.com publicly until there's a real product. If pre-launch interest is desired, capture it via diverse.org or llmo.org (the protocol stewards) rather than a placeholder commercial page.

---

## COMPLETED (chronological, most recent first)

This section grows over time. Move items here when done.

### 2026-05-11

- ✅ v0.1.8 release cut from `[Unreleased]` to `## [0.1.8] - 2026-05-11` via `scripts/cut-release.sh 0.1.8 2026-05-11`. First in-repo use of the release-cut automation per ADR-0006. The v0.1.7 cut in PR-A was performed manually because the script was new; v0.1.8 onward uses the script. The cut moves the v0.1.8 narrative + Added entries (six new core claim types, five new top-level fields, provenance_markers, structured external_ids, irs_ein, canonical_urls + product_facts + identity extensions, reserved namespaces) + Changed entries + Migration notes from `[Unreleased]` into the dated `[0.1.8]` section.

- ✅ `scripts/cut-release.sh` idempotency-check bug fixed. The awk script that scans `[Unreleased]` for content had an END block (`if (!found) print "no"`) that always printed "no" after the main block's "yes/no" print, producing two-line output that the shell-side check mis-interpreted as empty. Fixed by restructuring the awk to use a single BEGIN-initialized `result` variable with a single END-block print. Caught on first real use: running the script against the post-PR-B `[Unreleased]` containing the v0.1.8 narrative + entries was reporting "Idempotent no-op" instead of performing the cut. Manual cut and bug fix bundled into this PR.

- ✅ ADR-0006 records the v0.1.x patch policy and release-cut automation. Codifies conventions practiced through v0.1.0 to v0.1.6: schema lives at the single canonical path `/static/spec/v0.1/schema.json` with `$id` unchanged across patches; patches MUST be back-compatible (every prior-conforming document MUST validate against the new schema); `llmo_version` stays `const: "0.1"` for the lifetime of the v0.1 minor version. Adds a release-cut policy: cuts happen by explicit invocation of `scripts/cut-release.sh`, not as a side effect of merging. ADR lands at `content/adr/0006-version-bump-and-release-cut.md`. Surfaced 2026-05-11 during v0.1.8 planning when the conventions had been implicit until now and a three-day documentation drift (PRs #80, #81, #82 plus #74 sitting in `[Unreleased]` without a v0.1.7 cut) made the policy gap visible.

- ✅ ADR-0007 codifies the Claude-as-builder architectural framing. LLMO documents are assembled by an LLM agent on the publisher's behalf via an API + wizard interface; publisher input is bounded by email-of-record + consent + targeted review; agent normalizes via the controlled vocabulary at `/glossary/`, structures under the schema, and tags each claim with `provenance_markers` recording how it was derived. Future protocol design decisions defer to two tests: "what does the consumer LLM gain from this field?" and "what does the builder agent need to populate this from public sources, or surface as a minimal wizard question?" ADR lands at `content/adr/0007-claude-as-builder.md`. Surfaced 2026-05-11 during v0.1.8 planning when the publisher-first framing of v0.1 was identified as insufficient for the actual deployment model.

- ✅ `scripts/cut-release.sh` provides explicit release-cut automation. Validates version (`MAJOR.MINOR.PATCH`) and date (`YYYY-MM-DD`) inputs, refuses to overwrite an existing version section (releases are append-only), idempotent against an empty `[Unreleased]`. Replaces the prior manual cut-as-side-effect-of-headline-PR pattern that left `[Unreleased]` un-cut for three days after v0.1.6. First in-PR use: the v0.1.7 cut in this PR was performed manually because the script itself was new; v0.1.8 onward will use the script.

- ✅ v0.1.7 release cut. Moved the accumulated `[Unreleased]` entries (comprehensive test-vector expansion from PR #74 with the ES384/EdDSA strict-tier vectors and the four drift findings; Appendix B replaced with a pointer to the changelog) into a new `## [0.1.7] - 2026-05-11` section in `content/spec/changelog.md`. Re-opens `[Unreleased]` empty for v0.1.8 work. PR-A of the v0.1.8 planning sequence: see https://github.com/openllmo/llmo.org/pull/116.

### 2026-05-09

- ✅ ADR-0005 backfill for publisher domain proof rationale. Records the v0.1.0 design decision that publisher domain control is proven by serving `/.well-known/llmo.json` rather than by DNS TXT records (same trust model as RFC 9116 security.txt). Decision date 2026-04-17 per the earliest commit establishing the well-known location as the publisher authority primitive (`cfc8842`, "v0.1 content restructure"). Surfaced 2026-05-09 during a threat-model review when the rationale was re-asked; existed only in conversation history. ADR distinguishes publisher proof (well-known file, rejected DNS TXT for redundancy and provisioning-complexity) from LIP-1 §4 step 4 namespace proof (DNS TXT at `_llmo-lip.<namespace-domain>`, anti-flood for extension claim types). Lands at `content/adr/0005-publisher-domain-proof-via-well-known.md`; surfaces in the auto-rendered child-page list at `/adr/` (per PR #77's listing-consolidation convention). No `_index.md` table edit.

### 2026-05-08

- ✅ Test vectors at /spec/v0.1/test-vectors/ (announcement blocker). Vector set expanded from 3 positive Strict-tier vectors to a coverage matrix targeting every v0.1 conformance rule. Adds Standard-tier negatives (S1, S2, three S4 cases, S5, S6), Strict-tier negatives (X1 alg, X1 missing kid, X1 malformed protected, X1 §4.3.1 b64 and crit, X4, X5 corrupted document signature, X6 corrupted per-claim signature), schema and minimal-tier negatives (claim type, founded pattern, llmo_version, M5 over-365 window), W1 and W2 warning vectors, and edge cases at validity-window and disavowal/spokesperson boundaries. `content/spec/v0.1/test-vectors.md` extended with a coverage matrix table, per-vector documentation, and a Drift findings section. `scripts/test-vectors/verify-vectors.mjs` runs CLI verify against every vector and asserts expected tier and rule outcomes; `scripts/test-vectors/verify-schema.mjs` validates each vector against the canonical `static/spec/v0.1/schema.json`. Both harnesses exit 0 with 31/31 vectors matching expected behavior. Drift findings: §5.2 S6 unimplemented in both validator.js and CLI, §4.3.1 b64/crit unimplemented in both, CLI does not enforce S4 or X4, CLI vendored schema lags canonical (founded pattern, claim type oneOf). Each drift filed as a separate BACKLOG item below.

- ✅ ADR backfills for branch protection (ADR-0002), BACKLOG discipline and Track conventions (ADR-0003), and GitHub App for workflow PR creation (ADR-0004). Each captures a material operational decision previously recorded only in BACKLOG completed entries and infrastructure files. The three new ADRs land at `content/adr/000{2,3,4}-*.md` with explicit Backfill notes in their Status sections; the ADR index table at `content/adr/_index.md` continues to list ADR-0000 and ADR-0001 only as headline entries, with the auto-rendered child-page list at the bottom of `/adr/` surfacing all five.
- ✅ GitHub App for workflow PR creation. `llmo-workflow-bot` (App ID `3645059`) registered under the `openllmo` organization, installed on `openllmo/llmo.org`, `openllmo/cli`, and `openllmo/validator`. Permissions: contents/issues/pull-requests write, metadata read; no webhook, no events. Org-level secrets `LLMO_WORKFLOW_BOT_APP_ID` and `LLMO_WORKFLOW_BOT_PRIVATE_KEY` scoped to those three repos. PR #64 (merge SHA `17d397e`) replaces `GITHUB_TOKEN` with an App-installation token in the `gh pr create` and PR-mutation steps of `weekly-digest.yml` and `sunday-audit.yml`. Token minted via `actions/create-github-app-token` pinned to commit `1b10c78` (release v3.1.1, latest at time of merge). End-to-end verification: workflow_dispatch of weekly-digest produced PR #65 authored by `llmo-workflow-bot[bot]`, all three required-check workflows (`check`, `validate`, `check-urls`) fired on the `pull_request` event, all passed, auto-merge fired, PR merged at 2026-05-08T14:15:40Z. workflow_dispatch of sunday-audit produced PR #66, same end-to-end success at 2026-05-08T14:17:24Z, plus the issue-creation step's idempotency check correctly skipped all 11 existing-finding matches without creating duplicates. Filed a small follow-up BACKLOG item to migrate the action's `app-id` input to `client-id` (deprecated at v3.x, currently functional with a warning).

### 2026-05-07

- ✅ Validator graceful degradation when WebCrypto Ed25519 unavailable. `static/js/validator.js` now probes for Ed25519 support at init via `crypto.subtle.importKey` against a real Ed25519 public-key x value (taken from `signed-strict-eddsa-key.json`), caches the result, and short-circuits the EdDSA dispatch path with a distinct error code `eddsa_unsupported_by_browser` on browsers that lack support (Chrome <113, Firefox <130, Safari <17). The X5/X6 result handling treats the new error as SKIP rather than FAIL, so a document with an EdDSA signature on an old browser surfaces tier "Strict (unverified)" with an explicit "browser limitation, not a document defect" note rather than a generic crypto failure that would mark the document as suspect. ES256 and ES384 paths unchanged. Validator docs at `content/validator/_index.md` gained a one-paragraph browser-support note. Verified end-to-end via playwright harness in two configurations: (1) baseline regression, all three algorithms still reach Strict tier with `verified` document-level status; (2) forced-old-browser via `window.__llmo_force_ed25519_unsupported = true`, EdDSA document reaches Strict (unverified) with the new browser-limitation X5 note.
- ✅ Sunday audit cron implemented at `scripts/sunday-audit.py` and `.github/workflows/sunday-audit.yml`. Runs every Sunday at 18:00 UTC, ahead of the Monday weekly digest. Six audit classes: URL resolution (skips RFC 2606 reserved domains and template-placeholder URLs), LIP registry consistency, ADR registry consistency, spec section anchor resolution against rendered Hugo output, cross-document reference integrity (ADR-NNNN / LIP-N / version refs), and JWKS publication freshness against the live llmo.json. Findings written to `infrastructure/audit-findings/YYYY-WNN.md` plus one GitHub issue per finding (label `audit/sunday`, idempotent against open issues). Workflow uses a PR-based commit pattern with auto-merge so it works under the enforced branch protection on `main`. Repo-level `allow_auto_merge` flipped to `true` to enable that flow. Dry-run produced 13 findings on first contact (10 pre-deployment diverse.org URLs, 1 parked llmo.com, 1 broken `#origin` anchor, 1 v0.1.6 future-version warning), all surfaced in the PR description for triage in a follow-up rather than fixed in this PR.
- ✅ CLI v0.1.5 published to npm via OIDC trusted publishing. Reaches end users running `npm install -g llmo`. Includes per-claim signature verification (rule X6 per §5.3) and alg dispatch covering ES256, ES384, and EdDSA. Tag `v0.1.5` on `openllmo/cli`; release workflow run published to `https://registry.npmjs.org/llmo` with SLSA v1 provenance attestation (`dist.attestations.provenance.predicateType: https://slsa.dev/provenance/v1`); maintainer remains `nicchavez`, publisher is `GitHub Actions <npm-oidc-no-reply@github.com>`. Smoke-tested end-to-end: `npm install -g llmo@0.1.5` then sign a per-claim signature with `llmo sign --claim` then verify with `llmo verify --json` returns `perClaimSignatures[0].verification: "verified"`. Resolves `npm provenance via GitHub Actions` simultaneously: provenance was already wired into the cli's release workflow (commit `8cc3d95`, 2026-04-29) and is now confirmed live on the published 0.1.5 tarball.
- ✅ Branch protection on `main` for `openllmo/cli` (sibling repo to this one). Required checks: `test (node 20 / macos-latest)`, `test (node 20 / ubuntu-latest)`, `test (node 22 / macos-latest)`, `test (node 22 / ubuntu-latest)`, `vendor drift check`. `enforce_admins: true`. Sequencing: `vendor drift check` had been failing on cli's `main` since 2026-05-01 because of legitimate upstream schema refinements (claim `type` becoming a `oneOf`, `identity.founded` gaining a date pattern); cli PR #1 cleared the drift via `scripts/vendor.sh` before cli PR #2 added the rule as required, so the gate did not block all merges from day one. Documentation parallel to this repo's `infrastructure/branch-protection.{json,md}` now lives at the same path in cli. Both sibling repos now share the same protection shape; the only divergences are repo-specific (cli has a five-context CI matrix; this repo has two single-job contexts plus `check-urls`).
- ✅ SECURITY.md reconciliation. Three findings in one fix: (1) the stale `openllmo/llmo-validator` PVR URL at line 30 was removed (validator was consolidated into this repo on 2026-04-26 commit `4d1e6d0`; the separate repo is preserved as historical reference but unmaintained, and reports there would land in dead air); (2) `security/llmo-security.asc` was at the repo root and therefore not served by Hugo (which serves only `static/`), causing the PGP key link to silently 404 since the Hugo migration; the file moved to `static/security/llmo-security.asc` and is now served correctly; (3) a new `check-doc-urls` CI workflow (script: `scripts/check-doc-urls.sh`) verifies every documented URL in scoped files (currently `SECURITY.md`) resolves: `llmo.org`-hosted URLs are checked against the locally-built Hugo output (catches publishing-path drift on the PR), external URLs are HTTP-checked. Added to `required_status_checks.contexts` so the class of "documented URL silently 404s on main" is mechanically impossible going forward.
- ✅ Validator supports ES384 and EdDSA per spec §4.2 (alongside the existing ES256 path). `verifyAttachedSignature` reads `alg` from the protected header and dispatches via an `ALG_PARAMS` table to the appropriate WebCrypto import/verify call and JWK key-type check. Two new strict-tier test vectors landed under `static/spec/v0.1/test-vectors/` (`signed-strict-es384.*`, `signed-strict-eddsa.*`). Verified end-to-end via playwright harness in URL mode with mocked JWKS; all three algorithms reach Strict tier with document-level signature `verified`. RS256 and other unsupported `alg` values are rejected at the X1 structural check (predates this change) with a clear note naming the three permitted algorithms.
- ✅ Validator self-hosts `ajv@8.20.0/dist/2020`, `ajv-formats@3.0.1`, and `canonicalize@2.0.0` (plus the three transitive deps `fast-deep-equal`, `fast-uri`, `json-schema-traverse` and the `ajv` main + `codegen` subpaths) under `static/js/vendor/`. Eliminates esm.sh as a runtime SPOF. All three v0.1 test vectors produce identical results before and after (verified by playwright harness against hugo serve, both branches).

### 2026-05-06

- ✅ Branch protection on `main` for `openllmo/llmo.org` (applied via `gh api`; ruleset documented in `infrastructure/branch-protection.json` and `infrastructure/branch-protection.md`). Required checks: `check`, `validate`. `enforce_admins: true`. `openllmo/cli` protection still pending; tracked separately if not already covered.

### 2026-04-26 to 2026-04-27

- ✅ Mintlify → Hugo migration (commit `f991c92` PR #30)
- ✅ Cloudflare Pages production setup with custom domains
- ✅ DNS apex cutover for llmo.org
- ✅ OTS proof upgrade for LIP-1 and LIP-3 (commit `a8749cf`)
- ✅ Three-explorer verifier (commit `2c128f4`)
- ✅ ACCOUNTS.md created (commit `e7de79d`)
- ✅ SVG logo variants (commit `9ddbb71`)
- ✅ Phase A site shell + theme toggle (commit `8fa9f64`)
- ✅ Serval → Diverse.org self-referential worked example (commit `186a4e3`)
- ✅ First Diverse.org llmo.json signed and published (commit `6778b88`)
- ✅ Re-sign for Strict tier conformance (commit `3c98bef`)
- ✅ Hugo 404 page (commit `f1167cd`)
- ✅ ots PATH in shell rc (~/.bash_profile)
- ✅ LIP registry table + Discussions link (commit `2b9b167`)
- ✅ GitHub Discussions enabled on openllmo/llmo.org
- ✅ SIGNING-CEREMONY.md procedure documented
- ✅ Mintlify GitHub App uninstalled

---

## How to use this document

When you finish a backlog item, move it to "Completed" with the date and a commit reference. When something new gets deferred, add it to the appropriate section with a trigger condition.

**The trigger condition matters.** "We'll do this later" is not a trigger. "We'll do this when X happens" is a trigger. Without triggers, backlog items accumulate forever and get lost.

**Re-read this file at the start of every session.** It's the project's working memory across Claude handoffs.
