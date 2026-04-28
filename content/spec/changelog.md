---
title: Changelog
description: Version history for the LLMO specification.
date: 2026-04-26
---

## About this changelog

This changelog records substantive and editorial changes to the LLMO specification. Entries are grouped by version per the [versioning policy](/spec/versioning). Patch revisions within an active minor version are listed in reverse chronological order under that minor's entry.

During v0.1 pre-release, changes are author-decided and no governance window applies. From v0.2 forward, changes follow the LIP process and the editor applies editorial revisions per the [governance page](/about/governance).

## v0.1

**Published:** 2026-04-17.

**Status:** active initial line. Currently being refined during the pre-v1 initial build per the versioning policy. The specification text, schema, and test vectors at `/spec/v0.1/` may receive author-decided revisions during this period. When v0.1 is superseded by v0.2, the path will be frozen.

### Author-decided revisions in v0.1

- **2026-04-27 (v0.1.1):** Clarified §4.3 to specify standard (attached) JWS per RFC 7515 as the required signing mode. Prohibited detached-payload JWS (RFC 7797, `b64: false`); verifiers MUST reject documents whose protected header asserts `b64: false` or whose `crit` parameter is non-empty. Inserted new §4.3.1 (JWS payload encoding) and renumbered prior §4.3.1 (Canonicalization) to §4.3.2 and §4.3.2 (Publisher guidance) to §4.3.3. Tightened the schema at `/spec/v0.1/schema.json`: `signature.protected` description carries the `b64`/`crit` prohibition, and both `signature.protected` and `signature.signature` gain a `minLength: 16` floor. On-disk shape of the `signature` field is unchanged; the live document at `https://llmo.org/.well-known/llmo.json` and the published test vectors at `/spec/v0.1/test-vectors/` were already in standard mode and remain conforming without modification. Patch-level revision under §[Versioning] line 16 (editorial revisions, including clarification of ambiguous normative text); author-decided per the pre-release section.
- **2026-04-22:** Removed em-dashes from specification text per authoring conventions (LIP-3). Renamed §8 from "Open Questions for v0.2" to "Open Questions for Future Versions" and retired version-specific commitments throughout the section. Added §8.11 covering post-quantum cryptographic readiness. Added adjacent anchor reference update in claims.mdx.

## Initial release

- **v0.1 (2026-04-17):** Initial publication of the LLMO specification.
