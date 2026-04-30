---
title: Versioning
linkTitle: Versioning
description: "How LLMO specification versions are numbered, published, and superseded."
date: 2026-04-17
---

## Version format

LLMO specification versions use three-part numbering: **vMAJOR.MINOR.PATCH**.

- **Major** (0 → 1, 1 → 2). Reserved for declarations that the specification has reached a new stability tier. The transition from v0 to v1 marks the specification as ready for broad production use.

- **Minor** (v0.1 → v0.2). Substantive protocol changes. New or modified core claim types, schema changes, changes to normative requirements, and other changes that alter what a conformant document looks like or what a conformant verifier checks. Minor bumps follow the LIP process.

- **Patch** (v0.1.0 → v0.1.1). Editorial revisions. Wording changes, typo corrections, clarification of existing normative text without altering its meaning, and validator behavior fixes that correct bugs in prior conformance judgments.

The `llmo_version` field in published `llmo.json` documents matches the specification version.

## Path convention

Each minor version has a single canonical path: `/spec/v<major>.<minor>/`.

Changes within a minor version (patch revisions) happen in place at that path. The changelog records each revision. Git history preserves the exact prior text.

When a new minor version is published, the prior minor's path is frozen. Documents that conformed to the prior minor continue to reach its frozen state at its path, stable indefinitely.

Patch versions do not get sibling paths. Readers who need exact historical text of a specific patch consult the commit history.

## Stability guarantee

Once a minor version is superseded by a newer minor version, its canonical path is frozen. The specification text, JSON schema, and test vectors at that path are not modified. Implementations that depend on a specific minor version can rely on that version's published text remaining unchanged indefinitely.

Before supersession, a minor version is the active line. Patch revisions are published in place during this period, each recorded in the changelog.

## Author and editor roles

Two distinct roles govern changes to the specification:

- **Author**. Creates the v0.1 specification during its initial build. Authorship includes drafting, structural revision, policy establishment, and all other decisions that give the initial specification its shape. During v0.1 pre-release, the author decides changes.

- **Editor**. Maintains the specification and process from v0.2 forward. Editor responsibilities include shepherding LIPs, applying editorial revisions, maintaining the registry, and coordinating governance windows. The author may continue to serve as editor after v0.1, but the roles are distinct.

This distinction matters because the two roles operate under different rules. Authorship is creative and decisive; editorship is custodial and procedural.

## Who decides a version bump

Minor and major version bumps from v0.2 forward are governance decisions and follow the LIP process. A minor bump is typically triggered by the acceptance of one or more LIPs that change normative content; the LIP process determines when the bump occurs and what it contains.

Patch revisions from v0.2 forward are editorial and are applied by the editor under the editorial policy described in the [governance page](/about/governance).

During v0.1 pre-release, the author decides all changes, including the initial structure and subsequent refinement. See the pre-release section below.

## How version bumps are announced

Every version bump produces:

- A changelog entry at [spec/changelog](/spec/changelog)
- A git tag on the main branch matching the version (e.g., `v0.1.0`, `v0.2.0`)

Major version transitions are accompanied by a public announcement. Minor and patch versions rely on the changelog and git tag alone.

## Pre-release versioning

LLMO is currently in its pre-v1 initial build. During this period:

- All editorial and substantive changes to the specification, schema, test vectors, governance pages, supporting infrastructure, and any other repository content are decided by the author. No governance window applies.
- The LIP process is available for contributors who wish to propose changes, but is not required for author-driven work during v0.1 pre-release.
- The 14-day governance window referenced in LIP-1 and in the governance page applies only to substantive changes made from v0.2 forward. It does not apply during the initial build.
- Changes are recorded in the [changelog](/spec/changelog) and in commit history. Anyone following the project's GitHub repository or subscribed to its changelog sees changes as they land.

The rationale for this posture: LLMO has no external implementers during pre-v1. A governance window whose purpose is protecting implementers from surprising protocol changes serves no function when no implementers exist. The window becomes meaningful at v0.2 and beyond, when the pre-v1 initial build has shipped and implementations depend on stable semantics.

The pre-release author-decides regime ends when LLMO is declared Generally Available, beyond limited announcements or beta testing. At that point, v0.2 development begins under the full LIP process and the editor assumes custodial responsibilities from the author. From v0.2 forward, the governance window applies to substantive changes per the LIP process, and the editor role takes over custodial responsibilities from the author.

## Relationship to implementations

The reference [validator](/validator/) tracks the specification version it implements. When the specification bumps, the validator bumps to match. Validator-only housekeeping (UI improvements, copy changes, non-behavioral fixes) does not produce a version bump.

Alternative implementations of LLMO, when they exist, are expected to declare which specification version they conform to. They are not expected to match the reference validator's release cadence.
