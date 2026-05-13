# Phase 11: Enable auto-re-sign on push

## Goal

Wire up the [`openllmo/llmo-action`](https://github.com/openllmo/llmo-action) GitHub Action in the publisher's source repo so that future edits to `llmo.json` are signed automatically on push. After this phase, the publisher edits the JSON like any other file in their repo, commits, pushes — and the deployed document's signature stays current without manual `llmo sign` invocations. The publisher does not touch the cryptography again until key rotation.

## Inputs

- Publisher's deployed live URL (from phase 10).
- Publisher's source-control posture: do they push their site's content (including the `llmo.json`) to a GitHub repo, or do they deploy via a non-GitHub flow (SFTP, CMS API, raw S3, etc.)?
- The repo's `owner/repo` slug (if GitHub).
- The repo-relative path of `llmo.json` (from phase 09 deploy walk-through; typically `static/.well-known/llmo.json` for Hugo or `public/.well-known/llmo.json` for Next.js).
- The signing key's `kid` (from phase 07).
- The local path of the private PEM file (from phase 07).

## Outputs

Either:

- A committed-and-pushed `.github/workflows/llmo.yml` in the publisher's source repo, AND a configured `LLMO_PRIVATE_KEY` repo secret in the same repo. Auto-re-sign is now live.

Or:

- An explicit, recorded decision to skip this phase (because the publisher does not use GitHub, or declines the offer). The closing report from phase 10 is amended with a "Auto-re-sign: not configured" line and a `/llmo` re-invocation reminder.

## Recipe

1. Ask the publisher:

   > "Do you push your site's content (including the `llmo.json` you just deployed) to a GitHub repo?"

   If **no**: explain that the auto-re-sign action requires GitHub Actions as its execution surface. Offer two alternatives:

   - The publisher manually re-runs `llmo sign` and redeploys whenever they edit `llmo.json`. (Same flow as phase 08 + phase 09.)
   - The publisher waits for GitLab/CodeBerg/Bitbucket equivalents, which are planned for v0.2 of the action repo.

   Record the decision and exit the phase.

   If **yes**: proceed.

2. Identify the repo. If the publisher's working directory IS the checked-out repo, run:

   ```
   git remote get-url origin
   ```

   Parse the `owner/repo` from the URL. Confirm with the publisher. If the working directory is NOT the repo, ask the publisher for `owner/repo` directly.

3. Confirm the doc-path-in-repo. Phase 09 established this; surface it explicitly:

   > "Your `llmo.json` lives at `<doc-path>` in your repo, correct?"

4. Confirm the default branch. Default assumption: `main`. If the publisher uses a different default branch, capture that.

5. Generate the workflow YAML. Substitute the captured values into this template:

   ```yaml
   name: Re-sign llmo.json

   on:
     push:
       branches: [<default-branch>]
       paths:
         - '<doc-path>'

   permissions:
     contents: write

   jobs:
     sign:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: openllmo/llmo-action@v0.1
           with:
             doc-path: <doc-path>
             key: ${{ secrets.LLMO_PRIVATE_KEY }}
             kid: <kid>
   ```

   Write the file to `.github/workflows/llmo.yml` in the publisher's repo checkout. Create the `.github/workflows/` directory if missing.

6. Add the `LLMO_PRIVATE_KEY` secret to the repo. Preferred path uses the GitHub CLI:

   ```
   gh secret set LLMO_PRIVATE_KEY --repo <owner>/<repo> < <private-pem-path>
   ```

   If `gh` is installed and the publisher is authenticated, run this directly. If not, walk them through the browser path:

   - Open: `https://github.com/<owner>/<repo>/settings/secrets/actions/new`
   - Name: `LLMO_PRIVATE_KEY`
   - Value: the full contents of the local `.pem` file (everything from `-----BEGIN PRIVATE KEY-----` through `-----END PRIVATE KEY-----`).
   - Save.

7. Commit the workflow file and push. If the publisher is comfortable with you running the git commands:

   ```
   git add .github/workflows/llmo.yml
   git commit -m "ci: auto-re-sign llmo.json via openllmo/llmo-action"
   git push
   ```

   Otherwise, show them the commands and let them run them.

8. Verify the workflow registered. Check the GitHub Actions tab:

   - Open: `https://github.com/<owner>/<repo>/actions`
   - Confirm the "Re-sign llmo.json" workflow is listed and active.

9. (Optional) trigger a no-op test. Make a trivial whitespace-only edit to the `llmo.json`, commit, push. Watch the workflow run and confirm it produces a new signature commit on top. The publisher sees the action working end-to-end.

10. Update phase 10's closing report. Add:

    ```
    Auto-re-sign:       configured (openllmo/llmo-action@v0.1 in <owner>/<repo>)
    Re-sign trigger:    push to <default-branch> touching <doc-path>
    Secret name:        LLMO_PRIVATE_KEY (repo secret)
    ```

11. Final word to the publisher:

    > "You're done. Edit `llmo.json` in your repo the same way you edit anything else. On push, GitHub re-signs it for you and commits the refreshed signature back. You don't touch the cryptography again until you rotate keys (annual cadence; re-invoke `/llmo` when the time comes)."

## CLI calls

- `git remote get-url origin` — repo discovery (when running in the publisher's checkout).
- `gh secret set LLMO_PRIVATE_KEY --repo <owner>/<repo> < <pem-path>` — set the signing-key secret.
- `git add .github/workflows/llmo.yml && git commit && git push` — commit the workflow file.
- `gh workflow list --repo <owner>/<repo>` — confirm workflow registration (optional verification).

## Defaults

- **Action version pin**: `openllmo/llmo-action@v0.1` (floating major). Publishers who want strict reproducibility can pin to `@v0.1.0` (or a later exact patch tag) at their discretion. The floating tag receives v0.1.x patches automatically; the exact tag does not.
- **Trigger branch**: `main`. Adjust if the publisher's repo uses a different default.
- **Trigger paths filter**: limited to the one `doc-path`. Prevents unrelated pushes from triggering re-signs.
- **Commit message** for the action's push-back commits: the action's built-in default, which includes `[skip ci]` to prevent recursion. Do not override unless the publisher has a specific reason.

## Decisions

- **GitHub-only in v0.1.** This phase only handles GitHub-hosted source repos. Publishers on GitLab, CodeBerg, Bitbucket, or self-hosted Forgejo get a "not yet" response and the manual-re-sign fallback. Cross-platform porting is planned for v0.2 of the action repo, not this skill.
- **No PAT escalation by default.** The action uses the default `GITHUB_TOKEN` for the push-back commit. If the publisher's `main` branch has protection rules that block `github-actions[bot]`, surface the three workarounds in the action's README (allow bypass, PAT secret, PR mode) and let the publisher choose. Do not auto-create PATs on the publisher's behalf.
- **Secret set via `gh` vs browser.** Prefer `gh secret set` when available — it's faster, less error-prone, and never has the PEM contents in a clipboard. Fall back to the browser flow only if `gh` is unavailable or the publisher is not authenticated.
- **Verification via test push.** Optional but recommended for first-time setups; gives the publisher visual confirmation. Skip if the publisher is in a hurry.

## Failure modes

- **Publisher's repo uses branch protection that blocks `GITHUB_TOKEN` pushes.** The first action run will fail at the commit-back step. Three resolutions, in order of operational simplicity: (a) add `github-actions[bot]` to the repo's branch-protection bypass list; (b) provide a PAT in a secret named `LLMO_BOT_TOKEN` and pass it to `actions/checkout` via `token:`; (c) wait for the action's PR-mode (planned for v0.2). Walk the publisher through (a) by default.
- **`gh` CLI not installed and the publisher is not browser-comfortable.** Stay with the manual paste flow but be explicit about each click. Verify the secret was saved by listing repo secrets afterward (the value is not retrievable, but the name should appear).
- **Workflow file commit blocked by pre-commit hooks** in the publisher's repo. Bypass is the publisher's call; do not run with `--no-verify`. Default response: ask the publisher to address the hook, then re-run the commit.
- **Action run fails with `doc-path '<path>' does not exist`.** The captured doc-path doesn't match the repo's actual layout. Re-check the path in the publisher's repo, edit `.github/workflows/llmo.yml`, commit, push, retrigger.
- **Action run succeeds but the live URL still serves the old signature.** The publisher's deployment pipeline (Hugo build, Next.js build, Cloudflare Pages, etc.) is not triggered by the auto-re-sign commit, OR is configured to ignore the commit. Confirm the deploy hook is wired; this is the publisher's hosting concern, not the action's.
- **Publisher declines the phase entirely.** Record the decision in the closing report. Re-invoke `/llmo` (or run `llmo sign && llmo verify` manually) before each next deploy. This is a valid posture; the phase is offered, not required.
