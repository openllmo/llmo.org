---
title: "ADR-0006: v0.1.x patch policy and release-cut automation"
linkTitle: ADR-0006
description: Within v0.1, patch bumps update the canonical schema file in place, must be back-compatible, and keep llmo_version at 0.1. Releases are cut from the Unreleased section by an explicit run of scripts/cut-release.sh, not by side effect of merging.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-11
status: Accepted
---

## Status

Accepted. Records the patch and release-cut conventions already practiced through v0.1.0 to v0.1.6 plus the v0.1.7 cut performed in this ADR's PR. The conventions existed in prose at `content/spec/versioning.md` and in commit history; this ADR formalizes them and adds the release-cut automation that closes a recurring bus-factor gap.

## Context

The LLMO specification needs three coordinated policies that have been implicit until now:

1. **Where do patch versions live on disk and on the web.** Each minor version (v0.1, v0.2, etc.) has a single canonical path under `/spec/v<major>.<minor>/`. v0.1.1 through v0.1.6 all updated `/static/spec/v0.1/schema.json` in place; `$id` has always been `https://llmo.org/spec/v0.1/schema.json` and has never carried a patch number. Readers can confirm by running `git log --follow -- static/spec/v0.1/schema.json`.

2. **What patches are allowed to do to the schema.** v0.1's `versioning.md` defines patches as "editorial revisions: wording changes, typo corrections, clarification of existing normative text without altering its meaning, and validator behavior fixes that correct bugs in prior conformance judgments." In practice, v0.1.4 added new pattern constraints to existing schema fields (`founded` date format, `claim.type` `oneOf`), and v0.1.5 added a new conformance rule (X6 per-claim signature verification). Both were substantive but additive: every document conforming to the prior schema continued to conform to the new schema. The implicit rule has been "additive is acceptable; subtractive or breaking is not." That implicit rule needs a written form.

3. **How releases are cut from `[Unreleased]`.** The changelog uses Keep a Changelog format. Work accumulates under `## [Unreleased]` as PRs merge. Cutting a release means moving those entries into a new `## [<version>] - <date>` section and re-opening `[Unreleased]` empty. Through v0.1.6 this was done manually inside the same PR that landed the headline change of the patch (e.g., PR #79 both implemented the §5.4 S6 deferral and cut v0.1.6). The drawback surfaced in early May 2026: work merged after PR #79 (PRs #80, #81, #82, the Appendix B change, the test-vector expansion harnesses) sat in `[Unreleased]` for three days without being cut, because no individual PR had the "cut the release" prompt and the convention was not written down. This is a bus-factor failure of the release process. The v0.1.7 cut in this ADR's PR closes that specific gap, and `scripts/cut-release.sh` exists to prevent recurrence.

## Decision

**Patch path.** Within a minor version (v0.1.x), every patch updates the schema and spec text at the canonical path in place:

- Schema: `static/spec/v0.1/schema.json`. `$id` stays `https://llmo.org/spec/v0.1/schema.json`. No `/spec/v0.1.N/schema.json` siblings.
- Spec text: `content/spec/v0.1/_index.md`. Hugo renders at `/spec/v0.1/`.
- Test vectors: `static/spec/v0.1/test-vectors/`. Updated in place when test-vector authoring changes for v0.1.x.

Patches do not get sibling paths; readers needing exact historical text consult git history. This matches `content/spec/versioning.md` and the v0.1.1 through v0.1.6 commit record.

**Patch policy.** v0.1.x patches MUST be back-compatible: every document conforming to a prior v0.1.x schema MUST validate against the new schema unchanged. The `llmo_version` field stays `const: "0.1"` across all v0.1.x patches; the validator hard-checks the literal `"0.1"`. Permitted patch changes:

- New optional schema fields, new optional claim types, new optional claim envelope fields.
- New well-known keys on existing open maps (e.g., new `external_ids` keys, new `canonical_urls` keys), provided the open `additionalProperties` shape continues to permit prior values.
- New conditional constraints (`if`/`then`, `contains`/`minContains`/`maxContains`) that apply to the new fields. Conditional constraints MUST NOT reject documents that did not use the new fields.
- Pattern tightening on existing fields when the tightening is justified by spec text (e.g., `founded` gained a date pattern in v0.1.4 because the spec text already required date-shaped values). The patch MUST verify the existing strict test vector still validates.
- Spec text clarifications that do not change normative meaning.
- Validator behavior fixes that correct bugs in prior conformance judgments.

Forbidden in a patch:

- Removing or renaming any field, claim type, or well-known key.
- Changing a field's type or required-ness in a way that rejects previously-valid documents.
- Changing `llmo_version`, `$id`, the JCS canonicalization rule, the JWS structure, or the JWKS handling. These belong to a minor or major bump.

Anything that cannot be expressed as additive lands as a minor version bump (v0.1 to v0.2), which is a separate governance surface and follows the LIP process per `content/spec/versioning.md`.

**Release-cut policy.** Releases are cut by explicit invocation of `scripts/cut-release.sh <version> [date]`, not by side effect of merging. The script:

- Validates the version (`MAJOR.MINOR.PATCH`) and date (`YYYY-MM-DD`).
- Confirms `<version>` is not already present (releases are append-only).
- Idempotent: a no-op if `## [Unreleased]` has no non-blank content between its header and the next `## [`.
- Otherwise inserts `## [<version>] - <date>` immediately after the `## [Unreleased]` header and re-opens an empty `[Unreleased]` for the next cycle.

Cuts happen in their own PR (or in the same PR as the headline change of the patch, at the editor's discretion). The PR title makes the cut explicit (e.g., `chore(spec): cut v0.1.7 release`). The cut PR's body lists the merged PRs whose work is being labeled with the new version.

## Alternatives considered

- **Versioned URL paths per patch (`/spec/v0.1.7/schema.json`).** Considered and rejected. Would multiply the URL surface, force the validator to choose between pinning to a patch URL or following latest, and break the `$id` invariant that has held since v0.1.0. Patch-level diffs are recoverable from git history; the URL stability win is larger than the historical-snapshot loss.

- **Allowing breaking changes within v0.1.x as long as documented.** Considered and rejected. The back-compat guarantee is the contract publishers and consumers rely on. Allowing breaking changes within a minor version would mean every consumer pins to a specific patch and the protocol fragments at patch granularity, which is the opposite of what versioning is for.

- **Auto-cutting on every merge to main.** Considered and rejected. Some work spans multiple PRs that together constitute one logical release (test-vector expansion plus its harnesses plus the drift findings, for example). Auto-cut would produce one micro-release per PR, dilute the changelog, and make it harder to communicate what changed in any given version. Explicit cuts let multiple merged PRs accumulate into a coherent release.

- **GitHub Release automation tied to git tags.** Considered for future work, deferred. The current shipped state has tags only for v0.1.0 and v0.1.1; the convention drifted. Adding tag-driven release automation is downstream of this ADR landing, since the policy it implements depends on this ADR's definitions of "release."

## Consequences

**Positive.**

- The URL surface stays simple. `https://llmo.org/spec/v0.1/schema.json` is the one schema URL for v0.1.x. Validators, CLIs, vendored copies, documentation, and external implementers all reference one URL across the lifetime of v0.1.
- The back-compat guarantee is the contract. Publishers can update their llmo.json at their own pace without fearing patch revisions will reject their documents. Consumers can update schema references at their own pace without fearing existing documents will start failing.
- Releases are explicit events with explicit PRs. The bus-factor gap that left `[Unreleased]` un-cut for three days does not recur, because cutting is a deliberate action, recorded in git as a PR, automated by a script that does not require human ingenuity.
- The `[Unreleased]` section becomes a real planning surface. Editors can see what has accumulated, decide when the accumulation is coherent enough to cut, and label it appropriately. No more "is this v0.1.7 or do I wait?"

**Negative.**

- In-place patch updates mean a reader who wants the exact text of v0.1.4 cannot fetch a URL; they must use git. This is the trade-off for URL stability. The changelog and commit history together preserve the historical record; the rendered site shows only the latest patch in the active minor version.
- The "additive only" rule is sometimes a judgment call. Pattern tightening on an existing field is additive if the tightening matches what conforming documents already do, and is breaking if it does not. v0.1.4's `founded` pattern is an example of the first; a hypothetical rejection of all currency strings that aren't ISO 4217 alphabetic would be an example of the second (it might break previously-valid documents that used symbolic strings). The editor will need to make calls and may sometimes get them wrong; the mitigation is the existing strict test vector, which MUST validate against any new patch schema. If it doesn't, the patch is rejected on the back-compat axis regardless of intent.
- `scripts/cut-release.sh` introduces a small surface to maintain. The script is intentionally minimal (one bash file, no dependencies beyond awk and grep) but is still code that can drift from the policy it implements. The mitigation is the script's tests-on-itself approach (each invocation validates inputs and verifies the change took effect) and the editor's responsibility to keep policy and script in sync.

**Neutral.**

- The release-cut automation does not subsume the editor's judgment about when to cut. It only mechanizes the boring part of the cut (moving entries, dating sections, re-opening `[Unreleased]`). The "should we cut now? what should we call this version?" question remains a human decision.
- Minor and major bumps (v0.1 to v0.2; v0 to v1) are out of scope for this ADR. Those follow the LIP process from v0.2 forward per `content/spec/versioning.md`. The patch policy in this ADR applies only to v0.1.x and to subsequent minor versions' patches once they exist.

## References

- v0.1.7 release cut: PR to be filled in on merge.
- `content/spec/versioning.md`: prose version of the path convention.
- `scripts/cut-release.sh`: the release-cut automation.
- `static/spec/v0.1/schema.json:17-21`: the `llmo_version` const that this ADR codifies as fixed across v0.1.x patches.
- `content/spec/changelog.md`: the changelog this ADR governs.
