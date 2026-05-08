---
title: "ADR-0004: GitHub App for workflow PR creation"
linkTitle: ADR-0004
description: Records the decision to authenticate scheduled-workflow PR creation via a GitHub App rather than a Personal Access Token or pull_request_target trigger swap.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-07
status: Accepted
---

## Status

Accepted. The App was registered and the workflow auth swap landed on 2026-05-08; the decision itself was reached on 2026-05-07 during PR #48 verification.

## Context

ADR-0002 records the decision to enforce branch protection on `main` with no admin bypass. ADR-0003 records the decision to maintain a structured BACKLOG with CI enforcement. Together those two decisions imply that every change to `main` lands via PR with passing required-check workflows.

Two scheduled workflows produce output that is intended to land on `main` automatically:

- **`weekly-digest`** runs every Monday at 13:00 UTC and writes `infrastructure/weekly-digest/YYYY-WNN.md`, a per-week summary of repository activity.
- **`sunday-audit`** runs every Sunday at 18:00 UTC and writes `infrastructure/audit-findings/YYYY-WNN.md`, plus opens GitHub issues for any drift detected.

Under branch protection, neither workflow can push directly to `main`. Both must instead create a PR, satisfy the required-check gate, and merge. That sequence relies on auto-merge: the workflow opens the PR with auto-merge queued, required checks fire, the PR self-merges.

The first end-to-end test of this design (PR #48 verification, 2026-05-07) revealed a structural gap. PRs created using the default `GITHUB_TOKEN` issued to a workflow do not trigger `pull_request`-event workflows on the resulting PR. This is GitHub's anti-recursion safeguard: a workflow's token cannot trigger another workflow, to prevent a workflow from self-amplifying. The consequence: required-check workflows never fire on bot-created PRs, the auto-merge gate never resolves, and the PRs sit open indefinitely.

The decision was how to authenticate the workflow's PR creation step in a way that bypasses the anti-recursion safeguard while preserving the security posture documented in ADR-0002.

## Decision

The PR creation step in the scheduled workflows is authenticated using a GitHub App (`llmo-workflow-bot`, App ID 3645059) registered under the `openllmo` organization and installed on `openllmo/llmo.org`, `openllmo/cli`, and `openllmo/validator`.

- **App permissions:** Contents (write), Issues (write), Pull requests (write), Metadata (read). No webhook, no organization permissions, no user permissions.
- **Secrets:** App ID and private key stored at the organization level, scoped to the three repos. Workflows mint short-lived installation tokens at runtime via `actions/create-github-app-token` (pinned to a commit SHA, not a floating tag).
- **Scope of the App token within each workflow:** only the `gh pr create` and PR-mutation steps use the App token. Branch creation, commits, and pushes continue to use the default `GITHUB_TOKEN` because those operations don't trip the anti-recursion safeguard and don't require the App's broader identity.

PRs created by the App identity (`llmo-workflow-bot[bot]`) trigger `pull_request`-event workflows on the resulting PR. The required-check gate resolves normally. Auto-merge fires when checks pass. The complete unattended path is verified end-to-end by PR #65 (weekly-digest) and PR #66 (sunday-audit), both merged 2026-05-08.

## Alternatives considered

- **Personal Access Token (PAT).** Rejected. PRs created via PAT do trigger workflows, so a PAT solves the immediate technical problem. The structural problem with PATs is identity-binding: the PAT acts as a specific user. When the user rotates the token (required periodically by GitHub) or steps down as steward, the PAT must be re-issued and the secret rotated across three repos. The whole point of the GitHub Actions bot identity is fungibility across stewards; tying scheduled-workflow auth to a specific user's PAT quietly degrades that property. It also concentrates risk: the PAT is a credential for the user's full account scope, not just the repos that need it.

- **`pull_request_target` trigger swap on the required-check workflows.** Rejected. The `pull_request_target` event runs in the base-repo context with secret access, which sidesteps the anti-recursion safeguard. The structural problem is that `pull_request_target` is the wrong default trigger for a project that intends to accept external contributions. LIP-1 specifies a 7-day public discussion window for spec proposals; the project is explicitly designed to receive PRs from people who are not yet trusted contributors. `pull_request_target` running in base-repo context with secrets exposed is appropriate for trusted internal flows and dangerous for untrusted external ones. Setting that as the default trigger now would create a security posture inconsistent with the project's intended openness, and the cost of changing it later (when external contributions arrive) is higher than the cost of choosing the App now.

- **Disable branch protection.** Rejected immediately. ADR-0002 captures the rationale for protection; backing it out to make scheduled workflows work would be a regression that this ADR exists to prevent.

- **Manual close-and-reopen of bot PRs by the operator.** Rejected as a long-term solution. Closing and reopening a PR via a user action does trigger `pull_request`-event workflows, and was used as a stop-gap on 2026-05-07 between identifying the problem and registering the App. As an ongoing operation, it requires weekly manual intervention from the operator and defeats the unattended-cron design.

## Consequences

**Positive.**

- Scheduled workflows operate end-to-end without operator intervention. The Monday weekly-digest fires, opens a PR, the PR self-merges. Same for the Sunday audit.
- The App identity is fungible across stewards. When the editor changes, the App stays. When the App's private key rotates (required periodically), only org-level secrets need updating; the workflows themselves are unchanged.
- App permissions are scoped to exactly what the workflows need. The Contents, Issues, and Pull-Requests write permissions cover the full surface; Metadata read is automatic. No broader access is granted.
- Secrets are at the organization level, scoped to three specific repos. Adding a fourth repo to the App's installations does not require copying secrets; removing a repo is a single uninstall operation.
- The pattern generalizes. Any future scheduled workflow in any of the three installed repos can use the same App auth without additional setup.

**Negative.**

- Two layers must hold for the design to work: the org-level setting "Allow GitHub Actions to create and approve pull requests" must be on, AND the App must be installed and its secrets present. Both are documented in BACKLOG.md as ongoing operational dependencies with detection signals and recovery actions; both are external state that doesn't live in this repo.
- The App's private key is operator-held. It must be backed up; if lost, a new key must be generated via the App's UI and the secret rotated across the three repos. The BACKLOG entry documents the recovery procedure.
- The `actions/create-github-app-token` action's input contract changed between v1 (the version the original investigation prompt assumed) and v3 (the version pinned in the workflows). The current workflows use the deprecated `app-id` input rather than the recommended `client-id`; a follow-up BACKLOG entry tracks the migration. The deprecation warning is benign for now but will eventually become a hard error.

**Neutral.**

- The App identity (`llmo-workflow-bot[bot]`) is visible on PRs and issues created by the workflows. Reviewers see the bot as the author. This is the intended attribution; it makes the automated path transparent without obscuring it under a human's name.
- The App is registered under the `openllmo` organization, not under the editor's personal account. The registration outlives any individual steward. If the organization is migrated or restructured, the App moves with it (or is re-registered in the new org per the BACKLOG entry's recovery action).

## References

- PR #64 (merge SHA `17d397e`, 2026-05-08): workflow auth swap from `GITHUB_TOKEN` to App-installation token.
- PR #65 (2026-05-08T14:15:40Z) and PR #66 (2026-05-08T14:17:24Z): end-to-end verification dispatches that confirmed required-check workflows fire on App-created PRs and auto-merge resolves correctly.
- `infrastructure/BACKLOG.md` entries: "Org-level workflow permissions for PR-creating workflows" (forward-looking dependency) and "Migrate `actions/create-github-app-token` from `app-id` input to `client-id`" (follow-up).
- ADR-0002: branch protection on `main`, the upstream decision that motivated this one.
