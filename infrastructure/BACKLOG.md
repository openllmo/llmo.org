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

### Test vectors at /spec/v0.1/test-vectors/

**Track:** `changelog` (resolution likely lands with a v0.1.6 cut bringing the vector set and any associated fixes to a clean closure)

**Status:** Partial. `content/spec/v0.1/test-vectors.md` describes three vectors (unsigned-minimal, unsigned-standard, signed-strict) plus the JWKS and canonical payload. An announcement-grade vector set covers each conformance rule (S1-S6, X5, X6) with both pass and fail cases.

**Estimate:** 6-10 hours, risk-adjusted to 12 if scope expands.

**Why blocker:** Enables third-party self-certification without requiring the validator. Highest single-item leverage on announcement-readiness: implementers who would never run our validator can still verify their implementation against published vectors.

**Scope:** Vectors covering Strict-pass, Strict-invalid-claim-signature, Strict-invalid-both-signatures, Standard-pass, Standard-failed-tier (one per S1-S6), schema-only failures, malformed-input failures. Use a published test JWKS distinct from production keys (the existing `signed-strict-key.json` is already labeled test-only).

### Self-host AJV, ajv-formats, and canonicalize in validator

**Track:** `none`

**Status:** Not started. The validator at `static/js/validator.js` currently dynamic-imports `ajv@8/dist/2020.js`, `ajv-formats@3`, and `canonicalize@2.0.0` from `https://esm.sh/...` at runtime (verified at lines 157-160).

**Estimate:** 1-2 hours, up to 3 if a build step is introduced.

**Why blocker:** esm.sh is a runtime SPOF. If esm.sh is down, every validator load fails. For a tool whose product thesis is "publishers control their own identity," depending on a third-party CDN to verify their own conformance is structurally backwards. Bundle locally as static assets under `static/js/vendor/`.

**Scope:** Download the three modules (correct ESM builds), place under `static/js/vendor/`, update `validator.js` to import via relative paths. Verify each tier vector still passes after the change. Supersedes the carry-over "Self-hosted AJV for the validator" item, with broader scope (all three packages, not just AJV).

### CLI v0.1.5 npm release

**Track:** `none`

**Status:** Shipped to GitHub `main` as commit `c880fd0` in the llmo-cli repo (separate from this repo). Not yet published to the npm registry.

**Estimate:** 1-2 hours, up to 4 if combined with npm provenance setup (see post-conference parallel-clock work).

**Why blocker:** End users running `npm install -g llmo` get an older version. Closes the v0.1.5 user-facing story (per-claim signature verification, alg dispatch in the CLI).

---

## ANNOUNCEMENT CREDIBILITY (soft, not strict gating)

Items in this section materially weaken external credibility if absent at announcement time, but do not strictly gate the announcement. A security-minded reviewer (including IETF Internet-Draft reviewers) hits these first when LLMO gets external attention.

### ES384 and EdDSA support in validator

**Track:** `none`

**Status:** Spec §4.2 permits ES256, ES384, and EdDSA. Validator hardcodes ES256 in the X5 (per-claim) and X6 (document-level) signature paths. CLI already handles all three.

**Estimate:** 3-5 hours, up to 7 if a library swap is needed.

**Why credibility:** A reviewer who reads §4.2 and then runs an ES384-signed document through the validator gets a misleading failure. Reference implementation narrower than the spec is a soft credibility hit.

**Scope:** Extend `verifyClaimSignature` and `verifyAndApplyX5X6` to read `alg` from the protected header and dispatch to the appropriate verification routine. Handle JWKS key-type matching (EC P-256, EC P-384, OKP Ed25519). Port the CLI's TypeScript verification logic into `validator.js` with WebCrypto-API adaptations.

### SECURITY.md reconciliation

**Track:** `none` (reclassified from notepad's `adr` proposal: this is operational reconciliation, not an architectural decision; channels and timelines are already committed)

**Status:** SECURITY.md is reasonably complete (response timelines, safe harbor, scope, channels). Two unresolved drift points:

1. Line 10 says validator source is in this repo (`static/js/validator.js`, `layouts/validator/`, verified accurate against current state).
2. Line 30 references a separate `openllmo/llmo-validator` repo's advisory URL, implying the validator lives in a separate repo.

These contradict. Line 10 is correct; line 30 either points at a stale plan or at a repo that has since been consolidated.

**Estimate:** 1-2 hours.

**Why credibility:** A reviewer who tries to file a private advisory follows the line 30 URL, hits a dead end, then has to figure out where to actually report. First-impression friction on the highest-stakes path (vulnerability disclosure).

**Scope:** Verify `openllmo/llmo-validator` state. If the validator has fully consolidated into this repo, remove the separate-repo reference from line 30. Otherwise correct line 10. Verify the PGP key link at line 39 resolves.

### Threat model document

**Track:** `adr`

**Status:** Implicit in §8 attack vectors, not documented as a standalone threat model.

**Estimate:** 4-8 hours.

**Why credibility:** IETF reviewers and security-minded readers routinely ask "where's the threat model?" before reading the spec. Having one document the answer raises signal-to-noise on early review passes.

**Scope:** Document attacks LLMO defends against (existing §8.x prose), attacks it explicitly does NOT defend against (consumer-side attacks against publishers, social engineering of publishers, registrar-layer DNS attacks, etc.), and abuse surfaces (publisher reputation laundering, false disavowals, false supersessions, key compromise scenarios). Format as ADR per Nygard structure.

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

### npm provenance via GitHub Actions

**Track:** `none`

**Status:** Not configured.

**Estimate:** 2-3 hours.

**Scope:** Sign npm packages from CI, attaching SLSA provenance attestations. Improves supply-chain credibility. May naturally bundle with the CLI v0.1.5 npm release work.

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
