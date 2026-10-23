---
title: "ADR-0015: Collapse to a single individual on both open-spec and commercial sides"
linkTitle: ADR-0015
description: "Extends ADR-0014. Greyfront, Inc. is withdrawn from public materials for the same reason Diverse.org was in ADR-0014 (never operationally stood up, no infrastructure, aspirational). Nicholas Chavez operates both the open-spec stewardship and any commercial activity at llmo.com, as an individual. The former two-entity firewall story is fully retired."
author: Nic Chavez <spec@llmo.org>
date: 2026-10-22
status: Accepted
---

## Status

Accepted. Extends and completes [ADR-0014](/adr/0014-single-steward-individual/), which withdrew Diverse.org on the open-spec side only. Partially supersedes [ADR-0001](/adr/0001-two-entity-firewall/) on the commercial side (already fully superseded on the open-spec side by ADR-0014). Accepted under the pre-launch authorship privilege of [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/); the LIP-1 §10 14-day governance window was not observed and no LIP was filed. The decision is recorded here so future external review can audit the rationale.

## Context

[ADR-0014](/adr/0014-single-steward-individual/) recorded that Diverse.org, Inc. was never operationally stood up as the stewarding entity of LLMO and withdrew it from public materials. ADR-0014 left the commercial-side framing in place: "Greyfront, Inc. continues to exist as a separate commercial vehicle operating at llmo.com." It noted that the former two-entity structural firewall ([ADR-0001](/adr/0001-two-entity-firewall/)) was now behavioral (steward's own hat discipline between protocol and commercial roles) rather than structural.

The honest extension is that Greyfront is in the same operational state Diverse.org was: a Delaware C-corp was reserved, three related domains (`greyfront.com`, `grayfront.com`, `llmo.com`) are parked, and no live infrastructure has been deployed under the entity's name. The commercial product the entity was reserved to operate (a Trust Pack / validator-as-a-service at llmo.com, a WordPress plugin, etc.) has not been built. The entity has no employees, no revenue, no live customers, and no distinct operational systems. The two-entity story therefore misrepresents the current structure on both sides, not just the open-spec side.

Continuing to describe LLMO's commercial-side as "operated by Greyfront, Inc., a Delaware C-corporation legally separate from the protocol steward" on public surfaces is the same category of misrepresentation ADR-0014 withdrew: aspirational structure described as if it existed operationally. The honest statement is that any commercial activity at llmo.com, if and when it exists, is operated by Nicholas Chavez as an individual.

The alternative — standing Greyfront up for real (operational governance, financial separation, employees or contractors, distinct infrastructure) — is premature at the current scale, in the same way standing up Diverse.org's stewardship for real was premature. The protocol has not yet reached the adoption threshold where a commercial counterpart entity is load-bearing.

## Decision

Public surfaces of LLMO are updated to describe reality: Nicholas Chavez operates both the open-spec stewardship of LLMO and any commercial activity at llmo.com, as an individual. Greyfront, Inc. is not named as the operator of llmo.com or any related product on any current surface. The former two-entity firewall is retired on both sides.

- **Legal:** No commercial entity named on public surfaces. Nicholas Chavez holds both roles individually. The Greyfront, Inc. Delaware C-corp registration remains filed (the registration is operationally cheap to maintain) but is not described as an active commercial vehicle. Future entity re-formation (either resurrecting Greyfront or forming a new vehicle) remains available on terms chosen when adoption warrants it.
- **Governance:** The individual decides. Commercial-side decisions and protocol-side decisions are both the individual's, with no entity firewall separating them. External reviewers evaluating vendor-neutrality of the protocol should treat protocol decisions and commercial decisions as made by the same person; the former structural separation claim is fully retracted. See the governance page for the current conflict-of-interest acknowledgment.
- **Protocol integrity:** Protocol decisions continue to be made on protocol merits, not on commercial advantage. This is now a behavioral commitment with no structural backstop. It is weaker than ADR-0014's "individual hat discipline between individual-owned entity and individual-owned entity" and much weaker than ADR-0001's "two entities, two boards, two sets of filings." External parties should calibrate trust accordingly.
- **llmo.com domain:** Owned by Nicholas Chavez, parked. If and when a commercial product ships there, it ships under individual operation. Prior references to "Greyfront operates llmo.com" are revised to "the LLMO steward operates llmo.com" or dropped where the entity designation was load-bearing.
- **Infrastructure:** Greyfront's parked domains (`greyfront.com`, `grayfront.com`, `llmo.com`) are listed under the individual steward's resource inventory in `infrastructure/ACCOUNTS.md`. No separate Cloudflare account, GitHub organization, or email identity has ever been provisioned for the entity; none is created now.
- **Historical records:** audit findings, weekly digests, prior ADR-0001, and prior public materials describing the two-entity structure are left intact as a snapshot of what was claimed at the time. Only current and forward-looking surfaces are updated.
- **Anchored artifacts:** LIP-1, LIP-3, and the v0.1 schema do not reference Greyfront and are untouched. No signed `/.well-known/llmo.json` ever asserted Greyfront as an aliased or subsidiary entity (the Diverse.org disavowal claim in prior documents in fact disavowed any commercial subsidiary of Diverse.org, which is strictly correct — Greyfront was never a subsidiary of Diverse.org and both were separately individually-held).

## Consequences

**Positive.**

- Public surfaces describe reality end to end. Neither the open-spec steward nor the commercial-side operator is misrepresented. External review (donors, journalists, prospective implementers, security researchers) sees the actual structure: one individual, open protocol, no entity apparatus on either side.
- The project's story stops leaning on structural separations that do not operationally exist. Vendor-neutrality claims are honest: the protocol is maintained by an individual who may at some point ship commercial products on top of it, and consumers should calibrate accordingly.
- The administrative overhead of maintaining a two-entity narrative (with its separate "about" sections, firewall language, cross-references in ADRs and governance pages) is eliminated.
- Future entity re-formation remains available on terms chosen when adoption warrants it, without being locked into either Diverse.org or Greyfront specifically.

**Negative.**

- The two-entity firewall is fully retracted. Any external party who extended credibility to LLMO on the strength of "a nonprofit steward structurally firewalled from a separate commercial entity" has that credibility withdrawn in full. The honest statement is that no structural separation currently exists; the project runs on the individual's commitment to keep protocol decisions on protocol merits.
- The commercial-side narrative is now weaker on insurability / institutional-review surfaces. "Operated by a Delaware C-corp" was a shorthand for ordinary commercial governance; "operated by an individual" is more unusual and may require additional disclosure in regulated contexts.
- Protocol-level decisions are now made by the same person who stands to benefit commercially from the protocol's shape. This conflict of interest is unavoidable in the current structure. The governance page documents it as a known limitation.
- Bus-factor exposure concentrates further. ADR-0014 already noted bus-factor as a consequence of individual stewardship on the open-spec side; ADR-0015 extends that concentration to the commercial side as well. If the individual becomes unavailable, continuity of both the protocol and the commercial activity depends on estate handling or future entity formation.

**Neutral.**

- The Greyfront, Inc. Delaware registration itself is unchanged by this decision. Keeping the registration costs very little and preserves optionality; using it as an operational vehicle requires work that is not planned at this time.
- Backlog items referencing a future commercial product (WordPress plugin, Trust Pack, llmo.com commercial site) remain in BACKLOG.md but are reattributed from "Greyfront's commercial arc" to "the steward's commercial side-plans"; the work itself is unaffected.

## References

- [ADR-0001](/adr/0001-two-entity-firewall/) (Superseded on the open-spec side by ADR-0014, on the commercial side by this ADR): the original two-entity firewall.
- [ADR-0014](/adr/0014-single-steward-individual/) (Accepted): removed Diverse.org from the open-spec side; left Greyfront in place on the commercial side.
- [ADR-0009](/adr/0009-llmo-skill-scope/): the `/llmo` skill-scope decision rested on the firewall; its scope rules are preserved because they are still useful product discipline, even without an entity boundary enforcing them.
- [ADR-0012](/adr/0012-goldilocks-pre-announcement-authorship-privilege/): the pre-launch authorship privilege under which this ADR was accepted without a 14-day window.
