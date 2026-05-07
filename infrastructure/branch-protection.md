# Branch Protection on `main`

Documents the branch protection ruleset applied to `main` on `openllmo/llmo.org`. The machine-recoverable source of truth is `infrastructure/branch-protection.json`; this document is the human-readable companion that explains why each rule is set the way it is.

## Purpose

Branch protection makes CI rules and merge discipline mechanical rather than honor-system. The CI workflows landed in `.github/workflows/` (backlog-discipline, validate-lip-registry) only have effect if a misconfigured push cannot bypass them. Protection enforces the gate.

The bus-factor framing applies: rules that admins can bypass don't survive operator absence, because a future contributor reads the config and assumes admin-bypass is the convention. `enforce_admins: true` is a deliberate choice, not a default.

## Current rules

Applied 2026-05-06. Verified by `gh api repos/openllmo/llmo.org/branches/main/protection`.

| Field | Value |
|---|---|
| `required_status_checks.strict` | `true` |
| `required_status_checks.contexts` | `["check", "validate", "check-urls"]` |
| `enforce_admins` | `true` |
| `required_pull_request_reviews` | `null` |
| `required_signatures` | `false` |
| `allow_force_pushes` | `false` |
| `allow_deletions` | `false` |
| `required_linear_history` | `false` |
| `required_conversation_resolution` | `true` |
| `lock_branch` | `false` |
| `allow_fork_syncing` | `false` |
| `block_creations` | `false` |
| `restrictions` | `null` |

## Why each rule

### `required_status_checks.contexts: ["check", "validate", "check-urls"]`

These are the exact check names reported by the GitHub Actions API on `pull_request` runs:

- `check`: the job in `.github/workflows/backlog-discipline.yml`. Enforces that artifact-producing commits include a `Resolves: BACKLOG#item-id` line or modify `infrastructure/BACKLOG.md` in the same commit.
- `validate`: the job in `.github/workflows/validate-lip-registry.yml`. Validates the LIP registry's six invariants (generated freshness, file/registry agreement, frontmatter agreement, etc.).
- `check-urls`: the job in `.github/workflows/check-doc-urls.yml`. Verifies that every external URL referenced in scoped documents (currently `SECURITY.md`) resolves: for `llmo.org`-hosted URLs, the corresponding path must exist in the locally-built Hugo output (catches publishing-path drift on the PR itself); for external URLs, an HTTP HEAD or GET must return 2xx. The script is `scripts/check-doc-urls.sh`. The check was added 2026-05-07 after a Hugo-migration-era directory mismatch silently broke the SECURITY.md PGP key URL for 11 days; mechanically gating documented URLs makes that class of bug impossible to reach `main`.

These are the names as reported by GitHub, not the workflow filenames. GitHub matches required-checks against the check name from the workflow run, not the workflow file. Mismatched names silently fail to enforce.

The `weekly-digest` workflow is intentionally not required: it runs on schedule and `workflow_dispatch`, not on `pull_request`, so it never produces a check on PR commits. The Cloudflare Pages deploy preview is also not required: it is a deploy check, not a CI check, and deploy flake should not block merges.

### `required_status_checks.strict: true`

`strict: true` requires the PR branch to be up to date with `main` before merging. Without strict, a PR could pass CI on a stale base, then merge into a `main` that has diverged. CI green on a stale base is meaningless: the workflow could pass on the stale state and fail on the current state, and the merge happens anyway.

### `enforce_admins: true`

Rules apply to admins. The operator is currently the only admin; without `enforce_admins`, the rules apply to nobody who would actually break them. The escape hatch (temporary disable via `gh api -X DELETE`) is preserved as a deliberate, auditable action; that is materially different from an invisible always-on bypass.

### `required_pull_request_reviews: null`

PR reviews are not required. The project is currently single-operator (`spec@llmo.org`); requiring approving reviews from a second person would block all merges.

The combination of `required_pull_request_reviews: null` and required status checks means: PRs are not strictly mandated by the protection ruleset, but they are the only practical path to landing a commit, since direct pushes cannot satisfy the required checks (the checks have not run on a freshly-pushed commit).

### `required_signatures: false`

GPG-signed commits are not required. The project's authentication-of-author convention is DCO sign-off (`Signed-off-by: Name <email>` on every commit, enforced by `git commit -s`). DCO is a legal sign-off that the contributor has the right to submit the work; GPG signatures are a separate, additive concern. Requiring both adds friction without changing the legal posture of contributions. If GPG-signing becomes a requirement in the future (e.g., to anchor commits cryptographically against author identity infrastructure), this field flips to `true` in a follow-up commit.

### `allow_force_pushes: false`, `allow_deletions: false`

`main` cannot be force-pushed and cannot be deleted. Both protect against accidental loss of history. Force-push in particular invalidates anchored references: anyone who has cited a SHA on `main` (in spec text, in OpenTimestamps anchors, in external references) loses their reference if `main`'s history is rewritten.

### `required_linear_history: false`

Merge commits are permitted. Some past merges to `main` used merge commits (the Hugo migration cutover, for example); requiring linear history would have rejected those flows retroactively. Squash and rebase merges are still available; this rule just doesn't force one of them.

### `required_conversation_resolution: true`

Outstanding PR review conversations must be resolved before merge. Ensures comments aren't silently merged-around. Low cost, real value when there are reviewers.

### `lock_branch: false`

`main` accepts new commits via PR. Locking would freeze the branch entirely, which is the wrong posture for a branch that receives ongoing work.

### `allow_fork_syncing: false`

Forks cannot syncretly write to `main` via fork-sync. Defensive setting against fork-based attack vectors.

### `block_creations: false`

Branches and tags can be created normally. The protection rule is about `main`'s history, not about restricting branch creation across the repo.

### `restrictions: null`

No user/team push restrictions beyond the rules above. The required-checks gate is the primary control; there is no secondary "only these users may push" layer.

## How to restore

If GitHub loses the configuration or the UI is changed inadvertently, replay the JSON via:

```sh
gh api -X PUT repos/openllmo/llmo.org/branches/main/protection \
  --input infrastructure/branch-protection.json
```

Verify the result:

```sh
gh api repos/openllmo/llmo.org/branches/main/protection
```

The response is structurally different from the PUT payload (GET returns nested objects with metadata URLs; PUT takes a flat config). Compare the meaningful fields, not byte-for-byte. The verification block in `infrastructure/branch-protection.md` (the "Current rules" table above) is the human-readable reference for what should match.

## Disabling temporarily

If a protection rule blocks legitimate work and the right answer is to fix the workflow rather than the protection, the workflow is the thing to fix. If a protection rule blocks legitimate work and the rule itself is wrong, change `branch-protection.json` and replay. Either way: do not add `enforce_admins: false`, do not silently bypass via the UI. The point of the protection is that it cannot be bypassed silently.

To remove protection entirely (rare, e.g., for a deliberate history rewrite):

```sh
gh api -X DELETE repos/openllmo/llmo.org/branches/main/protection
```

After the destructive operation completes, immediately replay the JSON to restore.

## Updating this document

If the ruleset changes, update both `branch-protection.json` and this file in the same commit. Drift between the two defeats the purpose: the JSON must remain replayable and accurate.
