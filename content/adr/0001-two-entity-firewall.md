---
title: "ADR-0001: Two-entity firewall between protocol stewardship and commercial activity"
linkTitle: ADR-0001
description: Records the structural separation between Diverse.org (501(c)(3) stewarding the LLMO protocol) and Greyfront (Delaware C-corporation pursuing commercial activity).
author: Nic Chavez <spec@llmo.org>
date: 2026-05-06
status: Accepted
---

## Status

Accepted. Backfill: this records a structural decision that predates the ADR practice itself.

## Context

LLMO is a public protocol stewarded by Diverse.org, a California 501(c)(3) nonprofit. The same individual who stewards Diverse.org also operates Greyfront, a Delaware C-corporation pursuing commercial activity adjacent to the protocol's domain.

The two entities serve incompatible purposes:

- **Diverse.org** must be vendor-neutral. Its credibility as protocol steward depends on the protocol not being tilted toward any specific implementer, including any operated by the steward. Donors, contributors, and adopters of the protocol need confidence that protocol decisions are made on protocol merits, not on commercial advantage.
- **Greyfront** pursues commercial outcomes that may build on the protocol but are not the protocol. Its activities are subject to ordinary commercial governance, which is different from (and sometimes incompatible with) the open-spec stewardship Diverse.org practices.

Without a clean separation, the two interests collide. Decisions about the protocol could be (or could be perceived to be) shaped by Greyfront's commercial position. Conversely, Greyfront's commercial agility could be (or could be perceived to be) constrained by Diverse.org's stewardship obligations. The conflict-of-interest surface is large enough that a structural firewall, not policy alone, is warranted.

## Decision

Diverse.org and Greyfront are maintained as separate legal entities with separate governance, separate finances, and separate operational infrastructure.

- **Legal:** Diverse.org is a California 501(c)(3) nonprofit; Greyfront is a Delaware C-corporation. Neither owns or controls the other.
- **Governance:** each entity has its own board, charter, and decision-making process. The shared individual (the editor) wears each hat in distinct contexts and does not blend authority across them.
- **Finances:** funding flows are kept distinct. Diverse.org operates on donations and grants supporting protocol stewardship; Greyfront operates on commercial revenue. There is no cross-subsidy in either direction.
- **Infrastructure:** operational systems (cloud accounts, code repositories, signing keys, key custody) are separated. Specific separation mechanisms are operational details documented in successor ADRs as those mechanisms are formalized; this ADR captures the structural commitment they implement.

## Consequences

**Positive.**

- The firewall is structural rather than aspirational. Conflicts of interest are prevented at the entity boundary, not by reliance on the editor's good judgment in each instance.
- Diverse.org's credibility as a vendor-neutral protocol steward is defensible to external review (donors, auditors, future board members, regulators). The separation is visible in legal filings, not only in stated intent.
- Greyfront's commercial activity is unconstrained by Diverse.org's stewardship obligations. Each entity can pursue its purpose without the other's governance constraints applying.

**Negative.**

- Two entities, two governance regimes, two sets of operational infrastructure. The administrative overhead is real: two sets of filings, two sets of accounts, two attack surfaces.
- The shared individual must maintain genuine separation in practice, not only in paperwork. Failure to maintain hat-discipline erodes the firewall over time. The cost of preventing this is ongoing attention.
- Any contributor or external party interacting with both entities must understand which entity they are interacting with in any given context. The boundary requires explicit communication and cannot be assumed.
- The structural firewall does not, by itself, prevent every form of conflict of interest. Information asymmetries (the editor knowing both organizations' strategies) cannot be eliminated by entity separation alone. Disclosure and recusal practices for specific cases are out of scope for this ADR.

**Neutral.**

- The two-entity structure is visible in external surfaces where it is load-bearing (Diverse.org's stewardship statement on [/about/](/about/) and the protocol's licensing) but is not the project's headline narrative. The intent is to make the separation findable for those who look, not to foreground it gratuitously.
