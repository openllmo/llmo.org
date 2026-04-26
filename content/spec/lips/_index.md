---
title: LIP Registry
sidebarTitle: Registry
description: Index of LLMO Improvement Proposals.
---

The LIP (LLMO Improvement Proposal) registry is the permanent, numbered record of proposals to change or extend the LLMO specification, its extension claim registry, or its governance. Every LIP has a named author, a declared status, a declared type, and a permanent place in this registry.

The authoritative process document is [LIP-1](/spec/lips/lip-0001), which defines how LIPs are proposed, numbered, discussed, and recorded. The overall decision process for the LLMO specification (of which the LIP process is one part) is described on the [governance page](/about/governance).

## Current LIPs

| Number | Title | Author | Status | Type | Created |
| --- | --- | --- | --- | --- | --- |
| [LIP-1](/spec/lips/lip-0001) | LIP Purpose and Guidelines | Nic Chavez | Active | Process | 2026-04-21 |

A machine-readable version of this index is served at [/spec/lips/index.json](/spec/lips/index.json) for tooling.

## How to propose a LIP

LIPs fall into three types: Standards Track (new extension claim types), Process (changes to the LIP process or related governance), and Informational (advisory guidance). Standards Track LIPs require a DNS TXT proof-of-control record at submission, a minimum 7-day public GitHub Discussion period, and at least one non-author public response before a LIP number and nonce are issued. Process and Informational LIPs are authored by the editor, or by community members whose proposals the editor agrees to author or co-author.

The full submission process, including numbering rules, lifecycle states, editor role, anti-flood provisions, and namespace rules, is specified in [LIP-1](/spec/lips/lip-0001). Contributors proposing a LIP should read LIP-1 in full before opening a Discussion.

## About this registry

The registry is append-only. Every LIP that has ever received a committed number remains in the registry forever, with its original author, original namespace (where applicable), and its current status attached. This includes LIPs in Withdrawn, Rejected, and Superseded status. Permanence is a deliberate property of the system: it ensures that the record of what was proposed, by whom, and how the proposal fared is not lost, rewritten, or quietly retired.

LIP numbers are never reused once committed. A number reserved via nonce issuance that does not reach merge within the nonce window is released and may be reassigned. A number committed at merge time is permanent.

The registry is maintained by the editor. Corrections to registry entries (status transitions, typo fixes, clarifications) are made through pull requests following the editorial revision policy on the [governance page](/about/governance).
