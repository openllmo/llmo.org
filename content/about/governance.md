---
title: Governance
description: Current governance model and planned transition.
date: 2026-04-17
---

## Maintaining entity

The LLMO specification is maintained by **Diverse.org**, a California nonprofit public benefit corporation with its executive office in Santa Clara, California. Diverse.org is recognized as tax-exempt under Section 501(c)(3) of the Internal Revenue Code. The Diverse.org board has adopted the LLMO specification and related open-standards work as the organization's programmatic focus.

## Editor

The current editor is **Nic Chavez**. The editor drafts and proposes changes, reviews contributions, and maintains the claim types registry. The editor does not have sole authority to adopt substantive normative changes; substantive changes follow the decision process described below.

Editor contact: [spec@llmo.org](mailto:spec@llmo.org) for matters that cannot be discussed in public. Public discussion defaults to [GitHub Issues](https://github.com/openllmo/llmo.org/issues).

## Separation from commercial activity

LLMO is intended to remain a specification in the public interest. A separate commercial entity, **Greyfront, Inc.**, a Delaware corporation with its executive office in Denver, Colorado, operates commercial services at [llmo.com](https://llmo.com) that implement the LLMO specification.

Diverse.org and Greyfront are distinct legal entities with separate governance, separate infrastructure, and separate funding. Decisions about the specification are made by Diverse.org without regard to their commercial effect on Greyfront or any other implementer. Any commercial entity, including Greyfront, is an implementer of the specification on the same terms as any other.

## Decision process

During v0.1 pre-release, the author decides changes without governance windows. See the [versioning policy](/spec/versioning) pre-release section for the full rule. From v0.2 forward, the 14-day governance window applies to substantive changes per the LIP process, and the editor assumes custodial responsibility for the specification. The pre-release regime ends when LLMO is declared Generally Available, beyond limited announcements or beta testing.

From v0.2 forward, **substantive changes** to normative requirements (new MUST/SHOULD/MAY clauses, changes to the JSON Schema, changes to the trust model, changes to discovery, changes to conformance tiers) require a public discussion period of at least 14 days and solicited implementer feedback before acceptance.

**Editorial revisions** (clarifications, additions to non-normative sections such as §8 Open Questions, wording improvements, typo fixes) may be merged by the editor without the 14-day period. Editorial revisions bump the specification's patch version per the [versioning policy](/spec/versioning) and are recorded in the [changelog](/spec/changelog).

As adoption grows, governance will transition to a working group with representation from implementers. The working group will include at least one participant with no commercial relationship to any implementer. The threshold for transition is not fixed in advance; the editor will propose the transition when adoption signals warrant it, and the proposal itself will follow the 14-day public discussion process.

The LLMO Improvement Proposal (LIP) process, defined in [LIP-1](/spec/lips/lip-0001), is the formal mechanism for proposing extension claim types and changes to the LIP process itself. Standards Track LIP proposals for extension claim types include a DNS TXT proof-of-control step and a 7-day public Discussion period, both specified in LIP-1. Core claim type proposals are subject to the 14-day substantive-change window described above; a forthcoming Process LIP will formalize the submission mechanics for core claim type proposals.

## How to propose a change

See [CONTRIBUTING.md](https://github.com/openllmo/llmo.org/blob/main/CONTRIBUTING.md) for the workflow. Bug reports use the `spec-bug` issue template. Core claim type proposals use the `core-proposal` issue template (editor-mediated review pending a forthcoming Process LIP). Extension claim type proposals follow the LIP process defined in [LIP-1](/spec/lips/lip-0001).

## Funding and resources

Diverse.org operates the specification site, the claim types registry, and the reference infrastructure. Infrastructure costs are met by Diverse.org's operating funds. Diverse.org accepts charitable contributions consistent with its tax-exempt purpose.

No contributor, donor, or implementer receives preferential treatment in the specification development process. Commercial implementers, including Greyfront, participate in the specification development process on the same terms as any other contributor.
