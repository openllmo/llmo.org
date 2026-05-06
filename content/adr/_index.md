---
title: Architecture Decision Records
linkTitle: ADRs
description: Index of operational decisions for the LLMO project.
date: 2026-05-06
---

The Architecture Decision Records (ADR) directory captures operational decisions about how the LLMO project is built and run: infrastructure choices, key custody, CI/CD configuration, deployment topology, organizational structure. Each ADR is a permanent, numbered record of one decision and the context that produced it.

ADRs differ from LIPs in scope. [LIPs](/spec/lips/) propose changes to the LLMO specification itself: claim types, schema, signature semantics, normative requirements that apply to all conforming implementations. ADRs propose changes to the project's operational practice: AWS account structure, signing key custody, build pipeline configuration, hosting choices. As a practical rule, a decision that changes `content/spec/` is a LIP candidate; a decision that changes `infrastructure/` or operational practice is an ADR candidate. [ADR-0000](/adr/0000-record-architecture-decisions/) establishes the practice and discusses the LIP-vs-ADR boundary in more detail.

## Current ADRs

| Number | Title | Author | Status | Date |
| --- | --- | --- | --- | --- |
| [ADR-0000](/adr/0000-record-architecture-decisions/) | Record architecture decisions | Nic Chavez | Accepted | 2026-05-06 |
| [ADR-0001](/adr/0001-two-entity-firewall/) | Two-entity firewall between protocol stewardship and commercial activity | Nic Chavez | Accepted | 2026-05-06 |

## Format

ADRs follow Michael Nygard's format: Status, Context, Decision, Consequences. Each ADR states one decision in the present tense. The Consequences section documents both the benefits and the costs honestly; an ADR with no negatives is not credible.

## About this directory

The ADR directory is append-only. Numbers, once committed, are never reused. A decision that has been overturned is not edited; a new ADR is added that supersedes the old one, and the old one's status is updated to Superseded with a pointer to the replacement. The history of what was decided, by whom, and when remains intact.

This append-only property mirrors the [LIP registry](/spec/lips/) and exists for the same reason: operational decisions accumulate context that future contributors need to understand even after the decision is overturned.
