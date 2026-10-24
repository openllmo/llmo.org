---
title: Governance
description: Current governance model and planned transition.
date: 2026-04-17
use_lastmod: true
---

## Steward

The LLMO specification is stewarded by **Nic Chavez** as an individual. Governance decisions follow the model documented below. A broader stewarding structure (working group or similar) is on the roadmap as adoption grows; the current structure is recorded in [ADR-0014](/adr/0014-single-steward-individual/) and [ADR-0015](/adr/0015-full-collapse-individual/).

## Editor

The editor is **Nic Chavez**. The editor drafts and proposes changes, reviews contributions, and maintains the claim types registry. The editor does not have sole authority to adopt substantive normative changes from v0.2 forward; substantive changes follow the decision process described below.

Editor contact: [spec@llmo.org](mailto:spec@llmo.org) for matters that cannot be discussed in public. Public discussion defaults to [GitHub Issues](https://github.com/openllmo/llmo.org/issues).

## Commercial activity

The `llmo.com` domain is operated by the LLMO steward. Any commercial products that ship there (a validator-as-a-service, publisher tooling, or similar) are built by the same individual who stewards the specification. The protocol remains the open layer; llmo.com is one commercial implementation on top of it.

Protocol decisions are made on protocol merits. Any commercial product that ships on top of LLMO, whether at llmo.com or elsewhere, participates in the specification development process on the same terms as any other implementer, and protocol decisions are documented in LIPs and ADRs so the record is public.

## Decision process

During v0.1 pre-release, the author decides changes without governance windows. See the [versioning policy](/spec/versioning) pre-release section for the full rule. From v0.2 forward, the 14-day governance window applies to substantive changes per the LIP process, and the editor assumes custodial responsibility for the specification. The pre-release regime ends when LLMO is declared Generally Available, beyond limited announcements or beta testing.

From v0.2 forward, **substantive changes** to normative requirements (new MUST/SHOULD/MAY clauses, changes to the JSON Schema, changes to the trust model, changes to discovery, changes to conformance tiers) require a public discussion period of at least 14 days and solicited implementer feedback before acceptance.

**Editorial revisions** (clarifications, additions to non-normative sections such as §8 Open Questions, wording improvements, typo fixes) may be merged by the editor without the 14-day period. Editorial revisions bump the specification's patch version per the [versioning policy](/spec/versioning) and are recorded in the [changelog](/spec/changelog).

As adoption grows, governance will transition to a working group with representation from implementers. The working group will include at least one participant with no commercial relationship to any implementer. The threshold for transition is not fixed in advance; the editor will propose the transition when adoption signals warrant it, and the proposal itself will follow the 14-day public discussion process.

The LLMO Improvement Proposal (LIP) process, defined in [LIP-1](/spec/lips/lip-0001), is the formal mechanism for proposing extension claim types and changes to the LIP process itself. Standards Track LIP proposals for extension claim types include a DNS TXT proof-of-control step and a 7-day public Discussion period, both specified in LIP-1. Core claim type proposals are subject to the 14-day substantive-change window described above; a forthcoming Process LIP will formalize the submission mechanics for core claim type proposals.

## How to propose a change

See [CONTRIBUTING.md](https://github.com/openllmo/llmo.org/blob/main/CONTRIBUTING.md) for the workflow. Bug reports use the `spec-bug` issue template. Core claim type proposals use the `core-proposal` issue template (editor-mediated review pending a forthcoming Process LIP). Extension claim type proposals follow the LIP process defined in [LIP-1](/spec/lips/lip-0001).

## Funding and resources

The specification site, the claim types registry, and the reference infrastructure are operated by the steward. Funding mechanisms will evolve as the project matures.

No contributor or implementer receives preferential treatment in the specification development process. Commercial implementers, including any built by the steward at llmo.com, participate on the same terms as any other contributor.
