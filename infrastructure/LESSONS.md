# LLMO Project Lessons

Append-only record of operational and procedural failure modes encountered during LLMO project work. Each entry: what happened, why it failed, what to do differently. No estimates, no Track tags. This is institutional memory, not a backlog: items here are not pending work, they are records of how we learned to do something.

When a procedural failure happens, add an entry. Do not delete or rewrite past entries. If a lesson is later refined or superseded, append a new entry that supersedes the old one and note the supersession in the new entry.

Format: dated heading per entry, three subheadings (What / Why / Different). Most recent at the bottom (append-only).

---

## 2026-05-05: Clipboard-wipe trap during ceremony private-key insertion

**What:** Copying commands from chat into Terminal during ceremony Phase 3 wiped the password-manager clipboard contents repeatedly. Each time the operator copied a different intermediate value (a path, a flag, a command), the previously-copied private key was overwritten before it reached the script.

**Why:** Terminal copy/paste shares the system clipboard with the password manager. Any intermediate clipboard operation between "copy key from password manager" and "paste key into script" overwrites the secret. The ceremony procedure as documented did not warn about this, and the operator naturally moved between clipboard sources while assembling commands.

**Different:** Integrate the `op` CLI (1Password command-line) into the signing script so the script retrieves the key directly without clipboard touching, or pipe the key from the password manager to the signing script via stdin in a single shell command. Update `infrastructure/SIGNING-CEREMONY.md` to document the trap explicitly: do not copy intermediate values once the secret is on the clipboard. Treat the clipboard between "copy secret" and "paste secret" as locked.

---

## 2026-05-05: Anchor-PR-number ordering in LIP transitions

**What:** LIP anchoring scripts ran before PR numbers were assigned, producing anchors that recorded placeholder values (or no PR-number reference) for proposals later associated with specific PRs. The anchored OpenTimestamps proof was technically valid but lacked the registry cross-reference the LIP-1 process expects.

**Why:** OpenTimestamps anchors must commit to the proposed state, including the PR-number cross-reference for traceability. The PR number does not exist until the PR is opened. Anchoring before PR creation produces an anchor that is structurally complete but missing a load-bearing reference.

**Different:** Anchor scripts should refuse to run without an explicit PR-number argument, and fail loudly if the argument is missing. Workflow ordering: open the PR first, capture the assigned PR number, then anchor against the proposed state at that point. SIGNING-CEREMONY.md and any LIP-anchoring docs should state the ordering constraint explicitly.

---

## 2026-05-05: Long ceremony filenames create retype friction

**What:** Filenames like `private-jwk-diverse-2026-01.json` are unnecessarily long and error-prone to retype during ceremony commands. The operator transposed characters, omitted the `private-` prefix, and lost time on filename-typing errors.

**Why:** The kid (key identifier `diverse-2026-01`) is the cryptographic identifier and must stay stable across ceremonies. The on-disk filename, however, is local-only and can be anything the scripts agree on. Conflating the kid with the filename pushed kid-length pain into every command line.

**Different:** Use short filenames inside date-versioned ceremony directories. The directory carries the date context (`~/llmo-key-ceremony-2026-MM-DD-vN/`); the filename inside it can be terse (`key.json`, `payload.json`, `signed.json`). Update `infrastructure/SIGNING-CEREMONY.md` to specify the short-filename convention and reserve the long, kid-bearing names for in-document fields where stability across ceremonies actually matters.

---

## 2026-05-06: Enforced CI catches drift on first contact

**What:** The first PR under enforced branch protection (PR #33, branch protection docs) failed the `validate` required check due to LIP-3 registry/frontmatter drift that had been silently present since 2026-05-05. The LIP-3 status was transitioned `Draft → Final` in `content/spec/lips/lip-0003.md` frontmatter (and recorded in the transitions array), but the parallel mirror at `static/spec/lips/index.json` was never updated. The registry's `generated` field was also stale (2026-04-26 vs. an actual most-recent LIP commit on 2026-05-05). PR #33 had to wait while the drift was reconciled in PR #34.

**Why:** Honor-system maintenance had been the convention. The LIP-3 transition updated the frontmatter but never propagated to the registry, and there was no mechanical check fail-loud about it until enforced CI made the validator's failure consequential. Without `enforce_admins: true` and required status checks, the validator was a workflow that ran but did not block; with both flipped on, latent drift surfaced immediately.

A second-order observation: the validator's freshness check (`generated` must equal the most recent commit date for LIP files) is structurally circular for registry-only commits. Updating the registry to fix freshness shifts the latest-commit date forward to the registry-update commit itself, requiring the `generated` field to equal its own commit date. PR #34 needed two commits to thread through this (set to 2026-05-05, fail, bump to 2026-05-06 to match the new latest-commit-date, pass).

**Different:** Two paths, additive:

1. The registry should be regenerated from frontmatter rather than maintained as a parallel surface. A script or Hugo template builds `static/spec/lips/index.json` from each LIP file's frontmatter on demand, eliminating the manual-sync surface entirely. Tracked as a new BACKLOG item ("LIP registry as generated artifact"). Until that lands, the manual discipline of updating both surfaces in the same commit must hold, which the validate-registry CI enforces post-merge.

2. The validator's freshness check should be reworked so that it does not require the file to know its own commit date. Options: drop the `generated` field check entirely (semantic equivalence is what matters, and the regenerate-from-frontmatter path makes mechanical drift impossible); or replace the date with a content hash of the LIP corpus (changes when LIPs change, computable without circular reference to the registry's own commit). Defer the rework decision until the regenerate-from-frontmatter direction is settled, since regeneration may obviate the freshness check entirely.

The lesson behind both: enforced CI doesn't introduce drift, it surfaces it. The drift was already there, working as intended. The system did its job.

---

## 2026-05-07: Self-hosting esm.sh modules requires the full import graph, not the listed deps

**What:** Self-hosting the validator's three runtime imports (`ajv@8/dist/2020.js`, `ajv-formats@3`, `canonicalize@2.0.0`) required downloading and rewriting eight files, not three. The validator imports `ajv@8/dist/2020.js`, but esm.sh serves that as a bundle whose internal `import` statements still reference three transitive packages (`fast-deep-equal`, `fast-uri`, `json-schema-traverse`) and `ajv-formats` separately requires both the `ajv` main entry and the `ajv/dist/compile/codegen` subpath, neither of which the validator imports directly. Each esm.sh URL is its own bundled artifact; subpaths are independent files with their own import graphs.

**Why:** esm.sh's bundling preserves `import` statements that point at other esm.sh URLs, rather than inlining everything into a single self-contained file. This is fine when esm.sh is the host (the browser follows the URL chain transparently), but breaks the moment a single file is downloaded and served from elsewhere: the inner `import` URLs still point at esm.sh, so the SPOF you tried to eliminate is back. The fix is to download every node in the chain and rewrite each `import` to a local path. The only way to discover the chain is to fetch the top-level file and grep for `import`, then recurse.

A second-order finding: ajv ships multiple entry points (`ajv@8` for draft-07, `ajv@8/dist/2020.js` for JSON Schema 2020-12, `ajv@8/dist/compile/codegen` as a subpath) and esm.sh treats each as a separate bundle. The validator only imports the 2020-12 entry, but ajv-formats internally imports the main and codegen entries. So the local mirror needs three distinct ajv files even though only one is in the validator's import statement. "Listed deps" is the wrong unit; "files reachable from any imported entry" is the right unit.

**Different:** Before downloading any module for self-hosting, fetch the top-level file from the source CDN and read its `import` statements. Recurse until every leaf is an inlined bundle with no external `import`. Build the full file inventory before starting the rewrite. Document the resulting graph in the PR description so future-you understands why eight files were checked in for "three runtime imports."

A more durable fix: introduce a build pipeline (esbuild or equivalent) that emits one self-contained bundle per validator module. Defer until the import graph grows beyond what manual rewriting can handle; the current 8-file graph is small enough that a build step would add more complexity than it removes.

A separate observation worth noting alongside this lesson, not as its own entry: Ed25519 support in browser WebCrypto landed in Chrome 113 (May 2023), Firefox 130 (September 2024), and Safari 17 (September 2023). Older browsers will fail `key_import_failed` when verifying an EdDSA-signed document. The validator handles this gracefully (the signature check fails with a clear error), but if EdDSA usage in the wild gets significant, the validator may need a polyfill or feature-detection branch. Not urgent today; flag if it becomes a real failure mode.

---

## 2026-05-07: Publishing-path migration silently broke a documented URL

**What:** SECURITY.md's PGP key URL (`https://llmo.org/security/llmo-security.asc`) returned 404 on the live site for 11 days without anyone noticing. The key file was tracked in the repo at `security/llmo-security.asc` (repo root) and had served correctly under Mintlify. The 2026-04-26 Mintlify-to-Hugo migration changed the publishing rules: Hugo serves files only from `static/`, not from arbitrary repo-root directories. The file was never moved into `static/`, so post-migration it stopped being served. SECURITY.md still pointed at the URL. Visual review during and after the migration didn't catch the drift; the failure surfaced only when a CI check explicitly verified the URL resolved, on the SECURITY.md reconciliation PR (#41) that landed 11 days after the migration.

**Why:** Hugo's static-only serving rule is a structural convention, not enforced by any check. The migration PR had its own scope (move site infrastructure from Mintlify to Hugo, get the build green, switch DNS), and verifying that every external reference in every committed doc still resolved was not in that scope and not on any checklist. It was nobody's job. The PGP key URL is also low-traffic: most readers of SECURITY.md never click the public-key link unless they're filing an encrypted vulnerability report. So the failure was both invisible to passive review and rare-to-trigger in actual use, which is exactly the profile of a bug that sits unnoticed for a long time.

**Different:** Two changes, additive.

1. Mechanical URL-resolution CI now exists. PR #41 added `.github/workflows/check-doc-urls.yml` and `scripts/check-doc-urls.sh`, scoped initially to SECURITY.md and added to `required_status_checks.contexts` on `main`. Any future PR that breaks (or fails to fix) a documented URL is blocked from merging. The script verifies `llmo.org`-hosted URLs against the locally-built Hugo output, so drift is caught on the PR itself, before the deploy.

2. Migration checklists should include "verify all external references in committed docs still resolve." Hugo, Mintlify, Cloudflare Pages, and any future publishing-platform change can quietly invalidate paths that worked under the previous regime. The general principle: when you change publishing rules, every URL that points at content you publish becomes a candidate for breakage. Run the URL check (or whatever scope is relevant for the migration) as the last step before merging the migration.

The lesson behind both: visual review catches what reviewers see; mechanical checks catch what reviewers don't see. Disclosure-flow URLs and other low-traffic load-bearing references are precisely the things visual review misses, because nobody's clicking them in the normal flow. They need their own gate.
