---
title: "ADR-0002: Branch protection on main"
linkTitle: ADR-0002
description: Records the decision to enforce branch protection on main with no admin bypass, requiring all changes to land via PR with passing CI.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-06
status: Accepted
---

## Status

Accepted. Backfill: this records a decision made and applied 2026-05-06; ADR written 2026-05-08 alongside ADR-0003 and ADR-0004 to close the operational-record gap surfaced during the public-discoverability audit.

## Context

The LLMO project's `main` branch on `openllmo/llmo.org` carries the published specification, the reference validator, the operational documentation that future stewards will rely on, and the live `/.well-known/llmo.json` document signed against the project's own protocol. The branch is the substrate for everything the protocol asserts about itself; an accidental or malicious write to `main` corrupts the trust chain that downstream consumers depend on.

Several pressures created the need for explicit protection:

- **Single-steward operation.** The project is currently steered by one editor. The same individual writes the spec, lands the code, signs the documents, and operates the deploys. Without protection, the editor is one mistaken `git push --force` from breaking history that external parties (OpenTimestamps anchors, citing PRs, downstream forks) have already pinned to.
- **Multiple stewards over time.** The project is explicitly designed to outlive the current editor. Future stewards inherit `main`'s shape; if the convention is "the editor pushes whatever they want," that convention transfers, and each successor's mistakes accumulate in the historical record.
- **Public artifact.** `main` is publicly visible and publicly verifiable. A history rewrite is detectable and damaging to credibility independent of the substantive change.
- **Anti-recursion in CI.** The validator and other automation are wired to specific commit SHAs in some cases. Force-push invalidates those references.

The decision was whether to protect `main`, and if so, whether the protection should apply uniformly or carve out an admin-bypass for the editor's convenience.

## Decision

`main` is protected with the ruleset documented in `infrastructure/branch-protection.json` and explained in `infrastructure/branch-protection.md`. The salient rules:

- **Required status checks**: `check` (backlog-discipline workflow), `validate` (LIP registry validator), and `check-urls` (documented-URL resolver) must pass before merge. The PR branch must be up-to-date with `main` before checks run (strict mode).
- **No admin bypass.** `enforce_admins: true`. The editor is subject to the same rules as any contributor.
- **No force-push, no deletion.** `allow_force_pushes: false`, `allow_deletions: false`. History is append-only.
- **No required PR reviews** for the moment; the project is currently single-steward and review-from-self adds latency without adding signal. This may change when contributor count grows.
- **Linear history not required.** Squash-merges are the convention; merge-commits are not forbidden but not used in practice.

The replayable JSON in `infrastructure/branch-protection.json` is the source of truth; the ruleset can be re-applied to a fresh `main` after a recovery or migration without reconstructing intent.

## Alternatives considered

- **No protection.** Rejected. The substrate is too important to leave unguarded against accidental writes, even by a careful editor. The cost of "trust myself" is small individual mistakes that accumulate over years; the cost of protection is occasional small-PR friction that the editor pays each merge.
- **Protection with admin bypass.** Rejected. Admin-bypass means the protection only protects against contributors, not against the steward. A single steward acting in haste or under fatigue can still break `main` despite the protection, and the protection's primary user (the editor) is precisely the user it doesn't apply to. The discipline that protection-applies-to-everyone, including the editor, is the substantive shift; adding a bypass undoes it.
- **Protection with a label-based bypass.** Rejected. Out-of-band override mechanisms (labels that disable protection for a specific PR, time-windowed exceptions) introduce an audit gap. Each bypass is a precedent; precedents accumulate; the protection erodes. If a true emergency requires the protection to be lifted, the right path is to lift it explicitly via the GitHub API, perform the change, and re-apply the protection from the replayable JSON. That trail is auditable.

## Consequences

**Positive.**

- `main` is durably protected against the failure modes that motivated the decision: force-push, accidental deletion, merges that bypass CI, and quiet writes that escape review.
- Future stewards inherit the protection automatically. The convention "every change goes through PR" is structural, not aspirational.
- The protection is replayable from version-controlled JSON. Recovery from a misconfiguration or migration does not require reconstructing the rule set from memory.
- The discipline is symmetric. The editor is subject to the same workflow as every contributor, which keeps the workflow honest about its own friction.

**Negative.**

- Every change goes through PR, including changes the editor would otherwise prefer to push directly (small typo fixes, urgent corrections). The friction is real and accumulates across small commits. The mitigation is to keep CI fast; required checks complete in seconds, not minutes.
- Required-check workflows must succeed before merge. A genuine CI failure during a launch-critical window is blocking. The recovery path (lift protection, push, re-apply) is documented but adds steps.
- The "no admin bypass" choice means even the editor cannot trivially recover from a self-inflicted block. This is by design but is occasionally frustrating; the design optimizes for institutional durability over individual convenience.

**Neutral.**

- Protection is per-repo, applied via API rather than UI. The same configuration is deployed on `openllmo/cli` and intended for `openllmo/validator` as those repos approach the same maturity. The `infrastructure/branch-protection.{json,md}` pair is the single source of truth and is referenced by name from each repo's README when the protection lands there.
- The decision interacts with subsequent operational work: scheduled workflows that need to write to `main` cannot do so directly under this protection, which surfaced the GitHub App auth requirement recorded in ADR-0004.

## References

- `infrastructure/branch-protection.json`: replayable ruleset, source of truth.
- `infrastructure/branch-protection.md`: prose explanation of each rule.
- PR #33 (merge commit `5d8e1de`): protection applied 2026-05-06.
- ADR-0004: GitHub App auth, which exists because of this protection's anti-recursion interaction with scheduled workflows.
