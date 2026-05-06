# Contributing to LLMO

The LLMO specification is developed in the open. Bug reports, proposed changes, and extension registrations are welcome from anyone, with no prior affiliation or agreement required beyond the Developer Certificate of Origin sign-off described below.

## Before you contribute

Read the specification at [llmo.org/spec/v0.1](https://llmo.org/spec/v0.1). Contributions that assume familiarity with the spec's scope, terminology, and stated non-goals are substantially more likely to be accepted. The specification is deliberately narrow; contributions that expand its scope require stronger justification than contributions that refine what is already in scope.

## Filing a bug against the specification

Open a [GitHub Issue](https://github.com/openllmo/llmo.org/issues/new/choose) and select the **Spec bug** template. Apply the `spec-bug` label.

Include:

- The specification section reference (e.g., §4.2).
- What the text says or implies.
- What you believe it should say, and why.
- If the bug affects implementations, an example of the resulting ambiguity or incompatibility.

## Proposing a LIP

New claim types (core or extension), changes to the LIP process, and informational guidance are proposed through the LIP (LLMO Improvement Proposal) process, which defines three types: Standards Track (claim type changes), Process (changes to the LIP process or governance), and Informational. The authoritative process document is [LIP-1](https://llmo.org/spec/lips/lip-0001); read it before submitting. For extension claim type proposals, the submission flow is: open a GitHub Discussion, observe a minimum 7-day discussion period with at least one non-author public response, request a LIP number and nonce from the editor, publish a DNS TXT record at `_llmo-lip.<namespace-domain>` as proof of control, then open a pull request adding the LIP document at `/spec/lips/lip-NNNN.mdx`. Core claim type proposals are handled through editor-mediated review using the 14-day substantive-change governance window described on the [governance page](https://llmo.org/about/governance), until a forthcoming Process LIP formalizes the core-proposal submission mechanics. Open the "Core claim type proposal" issue to start the conversation.

## Submitting a pull request

Fork the repository. Branch naming:

- Maintainer branches: `priority-N-short-description`.
- External contributor branches: `proposal-short-description`.

Open a PR against `main`. Reviewers expect:

- Declarative register. Match the specification's tone. No marketing language ("innovative," "powerful," "revolutionary," "we're thrilled to announce" are out of place).
- No em dashes. Use commas, parentheses, or colons.
- Conventional commit messages: `docs: ...`, `feat: ...`, `fix: ...`, `chore: ...`.
- DCO sign-off on every commit (see below).
- The Hugo build passes. Run `hugo --minify` locally before pushing. Use `hugo serve` to preview pages in the browser.

One logical change per PR. Multiple commits per PR are fine if they represent distinct logical units.

## Decision authority

For the current v0.1 draft period, the editor has final merge authority, subject to the decision process described in [Governance](https://llmo.org/about/governance). Substantive changes to normative requirements require a public discussion period of at least 14 days and solicited implementer feedback before acceptance. Editorial revisions (wording, clarifications, non-normative additions) may be merged by the editor without the 14-day period.

Governance transitions as adoption grows. See [Governance](https://llmo.org/about/governance) for the planned transition to a working group with implementer representation.

## Developer Certificate of Origin

Every commit to this repository requires a DCO sign-off. The DCO is a lightweight alternative to a Contributor License Agreement: by signing off, you certify that you have the right to submit the contribution under the project's licenses. The full DCO text is at [developercertificate.org](https://developercertificate.org/).

Sign off by adding a `Signed-off-by` trailer to your commit message, or by committing with `git commit -s`:

```
docs: clarify canonical_urls claim behavior when aliases are present

Signed-off-by: Jane Doe <jane@example.com>
```

The name and email in the sign-off must match the commit's committer identity. Configure your git identity with `git config user.name` and `git config user.email` before committing.

No formal CLA is required. Commits without a sign-off will be asked to amend.

## License

Contributions are accepted under the repository's licenses. Specification prose and documentation are licensed under [CC BY 4.0](https://github.com/openllmo/llmo.org/blob/main/LICENSE); code, schemas, and tools are licensed under [MIT](https://github.com/openllmo/llmo.org/blob/main/LICENSE-CODE). By submitting a contribution, you agree that it may be distributed under these terms.

## Style reference

The specification itself is the style reference. When in doubt about tone, phrasing, or structure, read the corresponding section of [llmo.org/spec/v0.1](https://llmo.org/spec/v0.1) and match it.
