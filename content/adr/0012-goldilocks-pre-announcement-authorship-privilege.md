---
title: "ADR-0012: Pre-announcement authorship privilege abbreviates governance windows"
linkTitle: ADR-0012
description: During the pre-announcement period before the v0.1 public launch, the editor abbreviates or skips self-imposed governance windows (LIP-1 §10 14-day substantive-change window, in-LIP grace periods) under authorship privilege. The choice is recorded in each affected LIP's transitions log so the abbreviation is documented and auditable. Full window observance resumes for substantive normative changes after the v0.1 public announcement.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-12
status: Accepted
---

## Status

Accepted. Codifies an operating principle invoked during the 2026-05-12 session that took LIP-4 and LIP-5 from Draft to Final without observing the LIP-1 §10 14-day governance window, and revised LIP-4 §5's 90-day grace period to 14 days in the same Final-transition PR. Both LIPs' transitions logs reference this ADR; this document is the public anchor.

## Context

The LLMO LIP process inherits a procedural posture from prior proposal systems (BIP, PEP) that assume a community of stakeholders watching for review opportunities. LIP-1 §10 specifies a 14-day substantive-change window for Process LIPs and for Standards Track LIPs affecting core claim semantics. Individual LIPs may specify their own grace periods (LIP-4 §5 originally specified 90 days before X7 enforcement bound to tier outcome).

These windows are valuable when there is a community to give feedback. They are theatre when there is not. Pre-launch, the LLMO project has a community of one (the editor). The 14-day window collapses to "the editor talks to themselves for 14 days while nothing happens." Self-imposed grace periods inside LIPs collapse the same way: the only publishers needing grace are those who already exist, and pre-launch the only such publisher is the steward at llmo.org, whose document is updated in the same release window as the spec change that affects it.

Three forces in tension:

- **Pace.** Pre-launch is the time when the protocol can move fast without coordination cost. Enforcing post-launch procedural discipline pre-launch costs throughput without buying anything.
- **Credibility.** The procedural windows exist to make the protocol's governance defensible to future external review. Skipping them silently leaves no public record; future auditors see only the merged PRs and have to reconstruct intent.
- **Discipline transition.** When the protocol launches publicly and a community exists, the windows become real. The transition from "editor moves at will" to "editor observes the process" needs to be visible so external reviewers can audit when each posture applied.

## Decision

During the pre-announcement period (from the present through the v0.1 public launch announcement), the editor MAY abbreviate or skip self-imposed governance windows under authorship privilege. Specifically:

1. **LIP-1 §10 14-day substantive-change window**: observed informally; the editor may transition a Standards Track or Process LIP from Draft to Final at any cadence, including same-day acceptance.
2. **In-LIP grace periods** (e.g., LIP-4 §5's originally-specified 90-day X7 enforcement delay): revised down to a value proportional to the actual pre-launch state. The default proportional value is 14 days from Final transition; an individual LIP may select a different value with explicit reasoning. The original window value is preserved in commit history as the post-launch default the LIP would have used.
3. **ADR review cycles**: same logic. The editor accepts ADRs directly without a community-review pause.

The abbreviation MUST be recorded in the affected LIP's `transitions` frontmatter array. The transitions log entry naming the abbreviation references this ADR. The change is therefore visible in three places: the LIP's permanent registry record, this ADR's text, and the commit history of the merge.

Pre-announcement period ends at the v0.1 public launch. The launch is a discrete event (typically a coordinated announcement on social channels and developer-facing communities); the date is operator-determined and recorded in the changelog at the time. From that date forward, the windows specified in LIP-1 and in individual LIPs bind the editor for substantive normative changes.

This ADR has no expiration condition; it is the permanent record of the pre-launch posture and remains in the registry after the privilege ends. Future readers consulting the LIP-4 or LIP-5 transitions logs (or any future LIPs that invoke the privilege before launch) follow the reference here.

## Alternatives considered

- **Observe full windows in all states.** Rejected. The 14-day window before a community exists costs throughput without producing any review. The 90-day grace period for documents that don't exist costs nothing in the abstract but signals to readers of the LIP that publishers are expected; pre-launch this signal is misleading.
- **Skip windows silently without documenting the choice.** Rejected. Future external reviewers (auditors, federation peers, the model-of-Claude reading the LIP for context) cannot distinguish "editor chose to abbreviate" from "editor forgot to observe." The audit trail is load-bearing for the protocol's credibility once a community exists.
- **Declare a "launch readiness" gate beyond which full windows apply, but allow the editor to decide when that gate fires.** Effectively the chosen approach, but with explicit framing. Naming the privilege Goldilocks rather than launch-readiness emphasizes that the period is bounded by external observability (a launch event) rather than internal readiness criteria; the editor cannot extend it indefinitely.
- **Apply the privilege per-LIP rather than as a blanket pre-announcement rule.** Considered. Per-LIP framing produces more deliberation per decision and risks the editor justifying each abbreviation case-by-case (overhead). The blanket rule with required transitions-log recording is the cheaper enforcement mechanism.

## Consequences

**Positive.**

- The editor moves at full pace during the period when no community is watching. Substantive normative changes (LIP-4, LIP-5, both Final on 2026-05-12 same-day) can land alongside the implementation work that depends on them, in the same session.
- The audit trail is intact. Each abbreviated transition is recorded in the affected LIP's transitions log with a reference to this ADR. Future external reviewers see the choice explicitly.
- The transition to post-launch discipline is visible. The first substantive normative change that observes the full LIP-1 §10 window (after the v0.1 public announcement) implicitly marks the privilege's end; subsequent changes follow the same observance.

**Negative.**

- The pre-launch period is when the protocol's design decisions cement. Abbreviated review means decisions land without the friction that catches second-order problems. This is mitigated by the editor's responsibility for those decisions (named author on every LIP) but not eliminated.
- An editor who informally abbreviates without recording the choice in the transitions log violates this ADR's protocol-trail requirement. The protection against that is procedural (write down what you do) not enforced by tooling. Post-launch, CI may add a check that newly-Final LIPs include a transitions log entry referencing either an explicit window observance or this ADR; that's follow-up work.
- The privilege's scope is self-imposed windows only. External requirements (any future regulatory disclosure, IETF process for an Internet-Draft submission, OpenSSF disclosure timelines) remain binding regardless of pre-launch state.

**Neutral.**

- The Goldilocks framing implies a finite period. The launch date is unset at the time of this ADR (the v0.1 public announcement has not happened; the operator targets it after the engineering-complete posture is reached). The ADR remains valid as a record of the posture without committing to a specific end date.
- The ADR does not constrain ordinary patch releases (typo fixes, editorial revisions, schema clarifications that preserve back-compat). Those follow the patch policy in [ADR-0006](/adr/0006-version-bump-and-release-cut/) and do not invoke the authorship privilege.

## References

- [LIP-1 §10](/spec/lips/lip-0001/): defines the 14-day substantive-change window this ADR may abbreviate during pre-launch.
- [LIP-4](/spec/lips/lip-0004/): first invocation of this privilege; transitions log references this ADR.
- [LIP-5](/spec/lips/lip-0005/): second invocation; same.
- [ADR-0006](/adr/0006-version-bump-and-release-cut/): patch policy that this ADR works alongside; patches are not LIPs and do not invoke the privilege.
