---
title: LIP Registry
linkTitle: Registry
description: Index of LLMO Improvement Proposals.
date: 2026-04-21
---

The LIP (LLMO Improvement Proposal) registry is the permanent, numbered record of proposals to change or extend the LLMO specification, its extension claim registry, or its governance. Every LIP has a named author, a declared status, a declared type, and a permanent place in this registry.

The authoritative process document is [LIP-1](/spec/lips/lip-0001), which defines how LIPs are proposed, numbered, discussed, and recorded. The overall decision process for the LLMO specification (of which the LIP process is one part) is described on the [governance page](/about/governance).

## Current LIPs

| Number | Title | Author | Status | Type | Created |
| --- | --- | --- | --- | --- | --- |
| [LIP-1](/spec/lips/lip-0001/) | LIP Purpose and Guidelines | Nic Chavez | Active | Process | 2026-04-21 |
| LIP-2 | (placeholder withdrawn before merge) |  | Withdrawn | Process | 2026-04-21 |
| [LIP-3](/spec/lips/lip-0003/) | LIP Authoring Conventions | Nic Chavez | Final | Informational | 2026-04-21 |
| [LIP-4](/spec/lips/lip-0004/) | Key Transparency: registry membership as a Strict-tier requirement | Nic Chavez | Final | Standards Track | 2026-05-12 |
| [LIP-5](/spec/lips/lip-0005/) | Disavowal category discriminator and S6 binding enforcement | Nic Chavez | Final | Standards Track | 2026-05-12 |

LIP numbers are not necessarily contiguous. LIP-2 was reserved during initial scaffolding for a Process LIP defining core claim type submission mechanics. The placeholder was removed from the repository before being formally numbered, and the number is permanently retained as withdrawn per the registry's append-only rule.

A machine-readable version of this index is served at [/spec/lips/index.json](/spec/lips/index.json) for tooling.

## How to propose a LIP

LIPs fall into three types: Standards Track (new extension claim types), Process (changes to the LIP process or related governance), and Informational (advisory guidance). Standards Track LIPs require a DNS TXT proof-of-control record at submission, a minimum 7-day public [GitHub Discussion](https://github.com/openllmo/llmo.org/discussions) period, and at least one non-author public response before a LIP number and nonce are issued. Process and Informational LIPs are authored by the editor, or by community members whose proposals the editor agrees to author or co-author.

The full submission process, including numbering rules, lifecycle states, editor role, anti-flood provisions, and namespace rules, is specified in [LIP-1](/spec/lips/lip-0001/). Contributors proposing a LIP should read LIP-1 in full, then open a [GitHub Discussion](https://github.com/openllmo/llmo.org/discussions) describing the proposal.

## About this registry

The registry is append-only. Every LIP that has ever received a committed number remains in the registry forever, with its original author, original namespace (where applicable), and its current status attached. This includes LIPs in Withdrawn, Rejected, and Superseded status. Permanence is a deliberate property of the system: it ensures that the record of what was proposed, by whom, and how the proposal fared is not lost, rewritten, or quietly retired.

LIP numbers are never reused once committed. A number reserved via nonce issuance that does not reach merge within the nonce window is released and may be reassigned. A number committed at merge time is permanent.

The registry is maintained by the editor. Corrections to registry entries (status transitions, typo fixes, clarifications) are made through pull requests following the editorial revision policy on the [governance page](/about/governance).
