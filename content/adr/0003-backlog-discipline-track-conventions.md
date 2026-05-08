---
title: "ADR-0003: BACKLOG discipline and Track conventions"
linkTitle: ADR-0003
description: Records the decision to maintain a structured BACKLOG.md with explicit Track tags and CI-enforced conventions for project memory.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-06
status: Accepted
---

## Status

Accepted. Backfill: this records a decision made and applied 2026-05-06; ADR written 2026-05-08 alongside ADR-0002 and ADR-0004 to close the operational-record gap surfaced during the public-discoverability audit.

## Context

A long-lived protocol project accumulates three kinds of state that need durable tracking:

1. **Work in progress.** Items currently being executed, with explicit status, blockers, and dependencies.
2. **Completed work with rationale.** Items that landed, with context on why they were done and how they were implemented. Distinct from a commit log: a commit log records what changed; a BACKLOG completed entry records why the change was wanted and what it produced.
3. **Forward-looking dependencies.** Operational facts that need to remain true (org settings, key custody, deployment configurations). These are not work to do; they are background conditions whose drift would break the project, with documented detection signals and recovery actions.

Without structure, all three kinds of state slip into informal locations: chat logs, commit messages, the editor's working memory, scattered comments in code. They decay quickly. By the time a successor steward arrives, the rationale for half the project's operational state is lost, and reconstructing it from artifacts is harder than writing it down would have been.

The pressure that forced this to be a formal decision rather than an informal habit was the COMPLETED section drifting ten days behind merged work in early May 2026. Honor-system maintenance had failed; the BACKLOG.md file was not being updated alongside the work it was supposed to track. The choice was either to abandon the BACKLOG as a tracking surface (and accept that project memory would live elsewhere or nowhere) or to make its maintenance mechanical.

## Decision

The LLMO project maintains a single `infrastructure/BACKLOG.md` file with the following conventions:

- **Single file.** All three classes of state live in one document, sectioned. Splitting across multiple files (separate ACTIVE / COMPLETED / DEPENDENCIES files) was considered and rejected: cross-references between the sections (a completed entry is the resolution of an active item) get heavier with multiple files, and editors must update multiple files per change.

- **Track tags.** Each entry carries a `**Track:**` tag declaring which artifact, if any, the work produces. Four values: `lip` (produces a LIP), `adr` (produces an ADR), `changelog` (produces a changelog entry), `none` (produces no documentation artifact). The Track value drives CI behavior: artifact-producing commits without the matching documentation surface trigger a discipline violation.

- **Status fields.** Each active entry has explicit status (Not started, In progress, Blocked on X, Deferred, etc.) so anyone reading can see where work stands without reconstructing from commit history.

- **Detection signals and recovery actions on operational dependencies.** Forward-looking entries (the third class above) include both a detection signal ("the workflow run log will say X") and a recovery action ("re-enable Y at URL Z"). This is what makes a BACKLOG entry institutional documentation rather than a personal note.

- **Append-only completed section.** Resolved items move to a COMPLETED section dated by completion. They are not deleted. The resulting file is long but searchable, and the historical record of what was done and when is preserved.

- **CI-enforced.** The `.github/workflows/backlog-discipline.yml` workflow gates artifact-producing commits. A commit that adds a new ADR, a new LIP, or a new `## [X.Y.Z]` changelog version section must either include a `Resolves: BACKLOG#item-id` line or modify `infrastructure/BACKLOG.md` in the same commit. The intent is that an artifact landing without its corresponding BACKLOG transition is mechanically impossible.

The Track conventions and Resolves discipline are documented in BACKLOG.md itself, in the "Track conventions" header section.

## Alternatives considered

- **Free-form markdown without conventions.** Rejected. This is what the project had before May 2026, and it failed: the COMPLETED section drifted ten days behind merged work, and entries had inconsistent shapes (some with status, some without; some with rationale, some bare). Without machine-readable structure, the file accumulated entropy faster than it accumulated signal. Adding Track tags and CI enforcement is the smallest set of conventions that solves the entropy problem.

- **GitHub Issues only.** Rejected. Issues are good for bug tracking and PR-tied work items but have three structural gaps: (1) issues are tied to a hosting platform and don't survive a migration cleanly; (2) forward-looking operational dependencies don't fit issue semantics, which expects a closure event; (3) the rationale-attached completed-work record is awkward in issue form, since closed issues are visually deprioritized in the GitHub UI even when they remain load-bearing reference material.

- **Multiple files (ACTIVE.md, COMPLETED.md, DEPENDENCIES.md).** Rejected. Cross-references (a completed entry is the resolution of an active one; a dependency entry may be referenced from multiple active entries) become heavier with multiple files. Editors must update multiple files per change, increasing the chance of partial updates that drift between files. A single file with sections handles the same content with simpler discipline.

- **No tracking at all.** Rejected. Project memory is load-bearing for a multi-year, multi-steward project. Losing the rationale behind operational decisions or the detection signals for operational dependencies would compound across years; the marginal cost of writing each entry is small, and the marginal value compounds.

## Consequences

**Positive.**

- Project memory has a single, structured, version-controlled home. A successor steward inheriting the project can read BACKLOG.md and understand what was done, why, and what conditions need to remain true.
- The Track tags and CI enforcement make artifact-creation discipline mechanical. The COMPLETED-section drift that motivated the decision has not recurred since the workflow landed.
- Forward-looking entries (operational dependencies) carry their own recovery instructions. When something breaks, the path back is in the file.
- Historical decisions are preserved. The append-only COMPLETED section means the rationale for prior choices does not get rewritten in light of subsequent changes.

**Negative.**

- BACKLOG.md is long and growing. As COMPLETED entries accumulate, the file becomes unwieldy to read end-to-end. The mitigation is search and the structured Track tags; the file is intended to be queried, not read linearly.
- Every PR that produces an artifact must update BACKLOG.md or include a Resolves line. The friction is small per PR but accumulates; contributors who haven't internalized the convention occasionally hit the discipline workflow as a surprise.
- The Track tag adds a small choice to every new entry. Most entries are obvious (`adr`, `lip`, `changelog`, `none`), but the ambiguous middle (an operational change that produces a configuration file rather than a documentation artifact) requires judgment and occasionally produces inconsistency.
- A single file is harder to merge than multiple files. Concurrent edits to BACKLOG.md from two PRs in flight produce conflicts that have to be resolved.

**Neutral.**

- The discipline applies only to `openllmo/llmo.org`'s BACKLOG.md. Other repos in the openllmo organization may adopt the same pattern but are not required to. Each repo's BACKLOG (if any) is its own surface.
- The Track tag's `lip` and `adr` values cross-reference into the LIP registry and ADR directory respectively. A BACKLOG entry tagged `lip` should resolve into a LIP file landing at `content/spec/lips/lip-NNNN.md`; the workflow does not enforce this end-to-end (it only catches the LIP creation), but the convention is documented.

## References

- `infrastructure/BACKLOG.md`: the file itself, with Track conventions documented in the header section.
- `.github/workflows/backlog-discipline.yml`: CI workflow enforcing the Resolves discipline on artifact-producing commits.
- Track-conventions origin commit `c969d97` (2026-05-06).
- Backlog-discipline workflow origin commit `332a23c` (2026-05-06).
