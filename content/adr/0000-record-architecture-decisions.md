---
title: "ADR-0000: Record architecture decisions"
linkTitle: ADR-0000
description: Bootstrap entry establishing the ADR practice for operational decisions.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-06
status: Accepted
---

## Status

Accepted.

## Context

LLMO has two classes of decisions that need a durable record:

1. **Protocol decisions.** Schema fields, signature semantics, claim type definitions, normative requirements that apply to all conforming implementations. These are spec-level decisions, recorded as LIPs in [/spec/lips/](/spec/lips/), with a 14-day discussion window and editor-mediated review per [LIP-1](/spec/lips/lip-0001/).

2. **Operational decisions.** AWS account structure, signing key custody mechanisms, CI/CD authentication, deployment region, organizational structure separating non-profit stewardship from commercial activity. These do not change the protocol but shape how the project's reference deployment is run. Without a record, the reasons behind these choices are lost as the project grows beyond a single editor.

LIPs are not the right surface for operational decisions. A choice between AWS Organizations structures or between key custody mechanisms is not a normative protocol question; subjecting it to LIP-level governance would slow operational work without producing better protocol outcomes. Conversely, recording such choices nowhere creates the same problem the LIP process was designed to prevent: future contributors inheriting decisions whose context was never written down.

The standard solution for this class of artifact is the Architecture Decision Record, originally proposed by Michael Nygard in 2011. ADRs are short, single-decision documents in a standard format, kept in a project directory alongside the code or specifications they affect.

## Decision

The LLMO project records operational architecture decisions as ADRs in `content/adr/`, using Nygard's format:

- **Status**: one of Proposed, Accepted, Superseded, Deprecated, or Rejected. Accepted is the terminal state for in-effect decisions.
- **Context**: the forces in tension at the time of the decision. What was at stake, what alternatives existed, what constraints applied.
- **Decision**: the choice made, stated in declarative present tense.
- **Consequences**: what the decision produces, both positive and negative. Trade-offs are stated honestly. An ADR whose Consequences section claims only benefits is not credible.

ADRs are numbered sequentially with four-digit zero-padded identifiers (`0001`, `0002`, etc.). ADR-0000 is reserved for this bootstrap entry establishing the practice itself; subsequent ADRs document specific operational decisions.

The ADR directory is append-only. Numbers, once committed, are never reused. A decision that has been overturned is not edited; a new ADR is added that supersedes the old one, and the old one's status is updated to Superseded with a pointer to the replacement.

LIP-vs-ADR scope rule: a decision that changes `content/spec/` is a LIP candidate. A decision that changes `infrastructure/` or operational practice is an ADR candidate. When a single decision touches both, the LIP is authoritative and the ADR (if needed for operational context) cross-references it.

Cross-linking discipline: from ADR-0001 onward, operational ADRs include a `## References` section listing relevant pull requests and changelog versions where the decision is load-bearing or visible. Cross-references use immutable identifiers (PR numbers, changelog version anchors) so they remain valid as the project evolves. ADRs with no applicable cross-references omit the section rather than pad it with tenuous links. ADR-0000 is exempt as bootstrap: it establishes the practice rather than demonstrating it.

Amendment vs supersession: clarifying amendments that do not change the decided position MAY be made to a decided ADR in-place (typo and factual corrections, sharpening of practice that does not reverse the decision, context that was always implicit). Substantive overturns MUST go through supersession: the prior ADR moves to Superseded, and a new ADR with a new number records the new decision and references the old. The distinguishing test is whether the edit changes what the ADR decided or clarifies what it already decided; if the former, supersede; if the latter, amend in-place. This rule applies to ADRs only and is consistent with how IETF errata and PEP post-history handle equivalent cases; the LIP process has its own amendment rules per LIP-1.

## Consequences

**Positive.**

- Operational decisions gain durable written context. Future contributors can understand why a choice was made without reconstructing it from chat logs, commit messages, or institutional memory.
- The LIP process is preserved for protocol-level decisions where the 14-day governance window provides real value. Operational decisions do not flow through that window, which keeps both surfaces' deliberation costs proportional to their stakes.
- The append-only rule, mirroring the LIP registry, means the record of historical decisions remains intact even when those decisions are overturned. Superseded ADRs document what was tried and why it was replaced.

**Negative.**

- One more documentation surface to maintain. The ADR directory adds an authoring burden alongside the spec, the changelog, the LIP registry, and the various README and operational documents. The marginal cost is small per ADR but accumulates.
- Judgment is required to decide which decisions warrant an ADR, which warrant a LIP, and which warrant neither. The boundaries between operational practice and protocol normative content are sometimes ambiguous; key custody mechanisms shape signing behavior, and signing behavior is part of the protocol. Edge cases will arise; the editor will have to make calls and may sometimes get them wrong.
- Backfilling ADRs for decisions already made carries a risk of revisionist history. An ADR written months after the decision may rationalize the choice rather than honestly record the trade-offs that were actually weighed at the time. The mitigation is to be explicit when an ADR is a backfill rather than a contemporaneous record, and to preserve any genuine uncertainty that existed rather than smooth it over.
- Public ADRs commit the project to transparency about operational choices, including those that may later be considered mistakes. This is a feature, not a bug, but it does mean operational decisions cannot be quietly reversed.

**Neutral.**

- ADRs are public. The directory is part of the llmo.org repository and rendered at [/adr/](/adr/). Decisions whose specifics are too sensitive to publish (specific credential storage details, vendor pricing terms) are documented privately and referenced from a public ADR by category, not by detail.
