---
title: "ADR-0014: Collapse to single individual steward"
linkTitle: ADR-0014
description: Supersedes ADR-0001. Diverse.org was never formally stood up as the stewarding entity for LLMO. The structure collapses to Nicholas Chavez as sole individual steward. The two-entity firewall is withdrawn. A future stewarding entity remains an option but is not promised.
author: Nic Chavez <spec@llmo.org>
date: 2026-10-22
status: Accepted
---

## Status

Accepted. Supersedes [ADR-0001](/adr/0001-two-entity-firewall/) on the open-spec side. Extended by [ADR-0015](/adr/0015-full-collapse-individual/) on the commercial side (Greyfront, Inc. withdrawn on the same day, 2026-10-22, for the same reasons): references below to "Greyfront continues to exist as a separate commercial vehicle" describe the state between the two decisions and are no longer current. Accepted under the pre-launch authorship privilege of [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/); the LIP-1 §10 14-day governance window was not observed and no LIP was filed. The decision is recorded here so future external review can audit the rationale.

## Context

ADR-0001 recorded a two-entity structure: Diverse.org as a California 501(c)(3) stewarding the LLMO protocol, and Greyfront, Inc. as a Delaware C-corporation pursuing commercial activity. The ADR described legal, governance, financial, and infrastructural separation between the two.

That ADR described an aspiration that was never realized. Diverse.org as the stewarding entity for LLMO was never formally stood up: the specification was not assigned to Diverse.org by instrument, the entity's board did not formally adopt LLMO as programmatic focus, no stewardship charter was executed, and operational infrastructure (signing keys, repository ownership, DNS, service accounts) remained under the individual steward rather than being transferred to the entity.

Continuing to describe LLMO as "stewarded by Diverse.org, a California 501(c)(3)" on public surfaces is therefore a misrepresentation. The structure described in ADR-0001 does not exist as operational fact. The honest statement is that LLMO is stewarded by Nicholas Chavez as an individual.

The alternative — standing up Diverse.org's stewardship for real — is a nontrivial program of entity work (board resolution, programmatic adoption, asset transfer, operational hand-over, financial separation, ongoing filings) that is not justified at the current scale of the protocol. The protocol has not yet reached the adoption or external-review threshold where a formal nonprofit steward is load-bearing.

## Decision

Public surfaces of LLMO are updated to describe stewardship accurately: Nicholas Chavez stewards the specification as an individual. Diverse.org is not named as steward on any current surface. Copyright on code and schemas vests in Nicholas Chavez.

- **Legal:** No stewarding entity. Nicholas Chavez holds the role individually.
- **Governance:** The decision model documented in [/about/governance/](/about/governance/) applies to the individual steward: during pre-release, the author decides; from v0.2 forward, substantive changes require a 14-day public window per LIP-1 §10. A future transition to a working group or entity remains an option; neither is promised.
- **Commercial separation:** Greyfront, Inc. continues to exist as a separate commercial vehicle operating at llmo.com. The firewall between protocol stewardship and commercial activity remains a stated commitment but is enforced individually (steward's hat discipline) rather than structurally (two legal entities). This is a weaker guarantee than ADR-0001 claimed. External parties relying on structural separation should understand that only individual discipline backs it.
- **Infrastructure:** signing keys, repositories, DNS, and service accounts remain under the individual steward. Key custody and rotation follow [SIGNING-CEREMONY.md](https://github.com/openllmo/llmo.org/blob/main/infrastructure/SIGNING-CEREMONY.md). The former `diverse-` key ID prefix is retired; new keys are issued under a non-entity-bound `kid`.
- **Historical records:** audit findings, weekly digests, and other backward-looking records that mention Diverse.org are left intact as a snapshot of what was true at the time. Only current and forward-looking surfaces are updated.
- **Anchored artifacts:** LIP-1, LIP-3, and the v0.1 schema are Bitcoin-anchored and do not reference Diverse.org, so no superseding chain is required for the anchored surface. The signed `/.well-known/llmo.json` is re-signed under a new document with a `supersedes` claim pointing at the prior Diverse.org-named document.

## Consequences

**Positive.**

- Public surfaces now describe reality. The protocol does not depend on an entity structure that does not operationally exist. External review (donors, journalists, prospective implementers) sees the actual structure, not an aspirational one.
- Decision latency drops. Entity work was consuming attention disproportionate to its benefit at current scale.
- Future entity formation remains available on terms chosen when adoption warrants it, without being locked into Diverse.org specifically.

**Negative.**

- The vendor-neutral credibility story weakens. "Nonprofit steward, structurally firewalled from the commercial entity" was a durable argument for the protocol's neutrality; "individual steward with hat discipline between protocol and commercial roles" is a materially weaker argument and must be acknowledged as such.
- The firewall between stewardship and commercial activity is now behavioral rather than structural. The individual steward operates both the protocol and Greyfront. This is a known conflict-of-interest surface and is called out as such on the governance page.
- Code copyright vests in an individual rather than a stewarding entity. If the individual becomes unavailable, continuity depends on estate handling or future entity transfer, not on an institutional holder. This is an acknowledged bus-factor exposure.
- Donors or sponsors seeking a 501(c)(3) recipient for protocol-stewardship contributions have no such recipient at this time.

**Neutral.**

- Greyfront's existence and role are unchanged. Only the stewardship side changes.
- Memory and documentation about the two-entity structure in historical records (ADR-0001, prior press/governance text, prior signed llmo.json documents) is preserved as the structural picture at that time.
