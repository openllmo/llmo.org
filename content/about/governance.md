---
title: Governance
description: Current governance model and planned transition.
date: 2026-04-17
use_lastmod: true
---

## Steward

The LLMO specification is currently stewarded by **Nicholas Chavez** as an individual. There is no stewarding entity at this time. Earlier public materials described LLMO as stewarded by Diverse.org, a California 501(c)(3) nonprofit; that stewardship was never formally stood up and is withdrawn. The decision and its tradeoffs are recorded in [ADR-0014](/adr/0014-single-steward-individual/), which supersedes [ADR-0001](/adr/0001-two-entity-firewall/).

Standing up a formal stewarding entity (nonprofit or working group) remains an option when adoption warrants it. It is not promised.

## Editor

The editor is **Nic Chavez**. The editor drafts and proposes changes, reviews contributions, and maintains the claim types registry. The editor does not have sole authority to adopt substantive normative changes from v0.2 forward; substantive changes follow the decision process described below.

Editor contact: [spec@llmo.org](mailto:spec@llmo.org) for matters that cannot be discussed in public. Public discussion defaults to [GitHub Issues](https://github.com/openllmo/llmo.org/issues).

## Commercial activity and conflicts of interest

A separate commercial entity, **Greyfront, Inc.**, a Delaware corporation with its executive office in Denver, Colorado, operates commercial services at [llmo.com](https://llmo.com) that implement the LLMO specification. The individual steward of LLMO also operates Greyfront.

This is a conflict-of-interest surface and is stated as such. Earlier public materials described a structural two-entity firewall between protocol stewardship and commercial activity. That firewall was aspirational; the stewarding nonprofit was never formally stood up, so the structural separation did not operationally exist. The current separation is behavioral — the steward's own discipline in distinguishing protocol-stewardship decisions from commercial-product decisions — which is a weaker guarantee than a structural firewall. External parties relying on vendor-neutrality should understand this limitation.

Decisions about the specification are made on protocol merits, not on commercial advantage to Greyfront or any other implementer. Any commercial entity, including Greyfront, is an implementer of the specification on the same terms as any other.

## Decision process

During v0.1 pre-release, the author decides changes without governance windows. See the [versioning policy](/spec/versioning) pre-release section for the full rule. From v0.2 forward, the 14-day governance window applies to substantive changes per the LIP process, and the editor assumes custodial responsibility for the specification. The pre-release regime ends when LLMO is declared Generally Available, beyond limited announcements or beta testing.

From v0.2 forward, **substantive changes** to normative requirements (new MUST/SHOULD/MAY clauses, changes to the JSON Schema, changes to the trust model, changes to discovery, changes to conformance tiers) require a public discussion period of at least 14 days and solicited implementer feedback before acceptance.

**Editorial revisions** (clarifications, additions to non-normative sections such as §8 Open Questions, wording improvements, typo fixes) may be merged by the editor without the 14-day period. Editorial revisions bump the specification's patch version per the [versioning policy](/spec/versioning) and are recorded in the [changelog](/spec/changelog).

As adoption grows, governance will transition to a working group with representation from implementers. The working group will include at least one participant with no commercial relationship to any implementer. The threshold for transition is not fixed in advance; the editor will propose the transition when adoption signals warrant it, and the proposal itself will follow the 14-day public discussion process.

The LLMO Improvement Proposal (LIP) process, defined in [LIP-1](/spec/lips/lip-0001), is the formal mechanism for proposing extension claim types and changes to the LIP process itself. Standards Track LIP proposals for extension claim types include a DNS TXT proof-of-control step and a 7-day public Discussion period, both specified in LIP-1. Core claim type proposals are subject to the 14-day substantive-change window described above; a forthcoming Process LIP will formalize the submission mechanics for core claim type proposals.

## How to propose a change

See [CONTRIBUTING.md](https://github.com/openllmo/llmo.org/blob/main/CONTRIBUTING.md) for the workflow. Bug reports use the `spec-bug` issue template. Core claim type proposals use the `core-proposal` issue template (editor-mediated review pending a forthcoming Process LIP). Extension claim type proposals follow the LIP process defined in [LIP-1](/spec/lips/lip-0001).

## Funding and resources

The specification site, the claim types registry, and the reference infrastructure are operated by the steward out of personal funds. There is no 501(c)(3) at this time, so tax-deductible charitable contributions are not available. If a stewarding entity is formed in the future, funding mechanisms will be revisited.

No contributor, donor, or implementer receives preferential treatment in the specification development process. Commercial implementers, including Greyfront, participate in the specification development process on the same terms as any other contributor.
