---
title: "ADR-0011: Key compromise response: rotate, retain in JWKS for grace, never register compromised keys in KT"
linkTitle: ADR-0011
description: When a publisher's signing key is observed in any system log the key-holder does not control, the operational response is to generate a fresh keypair, add the new public key to the JWKS alongside the compromised one, re-sign published documents under the new key, and deliberately omit the compromised key from the Key Transparency log. The 90-day JWKS overlap window per spec §4.2 keeps cached documents verifiable during transition; the KT-log omission makes the steward's silence into a meaningful signal.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-12
status: Accepted
---

## Status

Accepted. Codifies the procedure followed during the diverse-2026-01 → diverse-2026-02 rotation that occurred mid-session on 2026-05-12 in response to an in-session exposure of the private scalar, and the deliberate decision NOT to register the compromised key in the LLMO Key Transparency registry specified by [LIP-4](/spec/lips/lip-0004/).

## Context

The LLMO protocol uses publisher-controlled ES256/ES384/EdDSA signing keys to attest the contents of `/.well-known/llmo.json` ([spec v0.1 §4.2](/spec/v0.1#42-signing-algorithms)). The Key Transparency log added by [LIP-4](/spec/lips/lip-0004/) commits to which keys a publisher has registered as authoritative at known times. Together these substrates depend on the publisher's continuing custody of their private key.

Key compromise is the canonical failure mode. The compromise that prompted this ADR was modest in realistic blast radius (a private scalar appeared briefly in a developer-tool transcript, with no observed exploitation) but mechanically clear: from the moment a private key is observed in any system log the key-holder does not control, the cryptographic hygiene principle is that the key is no longer trustworthy for new signatures. This is true regardless of whether the observation was malicious, accidental, or self-inflicted, and regardless of whether realistic exploitation appears feasible.

Two design questions converge in the response:

1. **Continuity of verification for cached documents.** Documents signed by the compromised key before the compromise are still cryptographically valid; consumers who fetched and cached the document yesterday do not know the key has since been compromised. Rotation must preserve their ability to verify what they already have.
2. **Treatment of the compromised key in the Key Transparency log.** LIP-4's KT log is append-only and immutable. A naive operator might expect every signing key a publisher has used to appear in the log. The decision of whether to commit a known-compromised key's fingerprint to the immutable record materially changes the log's semantic meaning.

The forces in tension:

- **Speed.** A rotation is an operational event; sluggish response widens the exposure window for new signatures under the compromised key.
- **Continuity.** Cached documents must keep verifying during the transition. Spec §4.2 grants a 90-day overlap window; using it is the established mitigation.
- **Log integrity.** Registering a key is a positive attestation. The KT log's value to consumers comes from being a record of keys the publisher currently trusts, not a record of every key the publisher has ever held.
- **Documentation.** Future operators (the same steward in N months; a federation peer in v0.2; an auditor reviewing the historical record) need to know what was done and why.

## Decision

When a publisher's signing key is observed in any system log the key-holder does not control, the response follows the procedure below.

### 1. Generate a fresh keypair immediately

The new keypair uses the same algorithm and curve as the compromised one (or stronger, if the rotation is also a posture upgrade). The kid follows the publisher's existing convention, incremented (e.g. `diverse-2026-01` → `diverse-2026-02`).

For the reference implementation, `llmo keygen --alg ES256 --kid <new-kid>` produces a PKCS#8 PEM and the corresponding public JWK. The private material is backed up to a custody backend (1Password secure note per [ADR-0010](/adr/0010-kt-registry-operations/) §4) before any other step proceeds.

### 2. Add the new public JWK to the published JWKS alongside the compromised one

The JWKS at `/.well-known/llmo-keys.json` is amended to include both keys. The old key remains for the 90-day overlap window mandated by [spec §4.2](/spec/v0.1#42-signing-algorithms); during that window any cached document signed under the old key continues to verify against the published JWKS.

### 3. Re-sign published documents under the new key

Each `/.well-known/llmo.json` (and any other signed artifact the publisher serves) is re-signed under the new key. The `document_id` is bumped to reflect the new revision (e.g. `2026-q2-revision-2` → `2026-q2-revision-3`). The validity window (`valid_from`, `valid_until`) is left unchanged because the rotation is not a re-attestation of the document's content semantics; it is a re-attestation of the publisher's signing identity.

Re-signing produces a new signature under the new kid. The previous signature is not retained on the live artifact; consumers see only the new signature on subsequent fetches. Cached copies from before the rotation continue to verify against the old kid via the JWKS overlap.

### 4. Deliberately omit the compromised key from the Key Transparency log

The compromised key MUST NOT be registered via `llmo register` or any equivalent mechanism. This is the architectural choice that distinguishes this ADR from a naive rotation procedure.

The plain version: the KT log records keys the steward stands behind. Registering a compromised key would put a permanent "we vouch for this" commitment on a key the steward no longer trusts. Once a fingerprint is in the log, it is in the historical record forever; you cannot un-register. So compromised keys do not go in. The log's purpose is positive attestation, and absence is the right signal when trust is withdrawn.

The longer reasoning: the KT log is append-only. Once a key's fingerprint is committed to a signed snapshot, it is in the historical record forever. Registering a compromised key tells future consumers (including consumers in years where the original cryptanalytic break or operational details are long forgotten) that the steward attested this key as legitimate at the registration time. That is precisely what the steward no longer wants to assert.

The alternative is the steward's silence. By NOT registering the compromised key, the steward leaves no positive commitment about that key in the log. Consumers who fetched a document signed by the compromised key and consult the KT log find no matching entry, and the registry's `kt_uninlogged` signal correctly flags the situation. Consumers who fetch a document signed by the new key find a matching entry, and X7 passes.

This works only because LIP-4 §3.4 specifies that **absence is meaningful**: the X7 rule fires `kt_uninlogged` when no matching entry exists for a domain's deployed signing key, and consumers treat that signal as evidence of incomplete trust rather than ignoring it. The compromised key benefits from the same signal: the published document still verifies cryptographically (under the JWKS overlap), but the KT log declines to certify the keyholder's continuing trust in the key.

### 5. Register the new key in the KT log

Once the new key is the live signing key, the publisher runs `llmo register` against the registry. The receipt is retained per [LIP-4 §3.3](/spec/lips/lip-0004/) for the publisher's audit trail.

### 6. After the 90-day grace window, remove the compromised key from the JWKS

Spec §4.2 requires the previous key remain in the JWKS for at least 90 days after rotation. After the window elapses, the publisher removes the compromised key from the published JWKS. From that point forward, documents signed by the compromised key no longer verify. This is the intended terminal state.

### 7. Document the rotation in the publisher's operational record

A commit, ADR, or similar artifact records what happened, when, the new kid, and the disposition of the compromised key. The artifact does not need to disclose the precise nature of the compromise; it needs to be sufficient that a future auditor or federation peer can reconstruct the timeline of trust.

## Alternatives considered

- **Register the compromised key in the KT log anyway, for completeness.** Rejected. The KT log's value as a trust signal depends on its entries being keys the steward currently attests as legitimate. Including a known-bad key in the immutable record converts the log into a key-history archive rather than a trust attestation. The naive "more information is better" argument fails on the specific semantics of an append-only signed log.
- **Continue signing under the compromised key, treating the exposure as non-actionable due to low realistic blast radius.** Rejected. Cryptographic hygiene is rule-based, not risk-weighted. The point of a private key is that nobody else has it; once that property is broken, the key is over regardless of whether anyone exploits the break. The cost of rotation is bounded and small; the cost of being wrong about the threat model is potentially unbounded.
- **Use a new key for new signatures but leave the old document live until natural expiry.** Rejected. Spec §2.4 caching semantics mean cached docs continue to be evaluated as authoritative until they expire. Leaving the compromised-key-signed document live for the full window means up to 90 days during which an attacker holding the leaked key could publish a forged variant that consumers cannot distinguish from the legitimate one. Re-signing immediately with the new key shortens the attacker's effective window to whatever cache TTLs apply, typically minutes to hours.
- **Mark the compromised key as revoked in the JWKS rather than retaining it for grace.** Rejected. The v0.1 spec has no mechanism for marking a JWK as revoked in the JWKS. A future revocation registry (v0.1.8 added `revocation_registry` as a top-level optional field) may eventually carry this signal; the operational pattern in this ADR is the right pre-revocation-registry response.
- **Generate a new key with a stronger algorithm (e.g. ES384 instead of ES256) as part of the rotation.** Considered. Acceptable when the rotation is also a posture upgrade, but not required. The diverse-2026-02 rotation kept ES256/P-256 because the compromise was operational (leak), not cryptographic (weakness in the algorithm). When the rotation is cryptographic in motivation (e.g. post-quantum migration via the future LIP-4 §4.7 trigger), upgrade is the point.

## Consequences

**Positive.**

- The procedure is a complete pattern: any future operator (the steward in N years, a federation peer in v0.2, an auditor) can apply it without re-deriving the right move. The diverse-2026-02 rotation followed this procedure exactly and produced clean operational state.
- The KT log's value as a trust signal is preserved. Consumers who consult the log see only keys the publisher currently attests; compromised keys are absent by design, not by omission-as-oversight.
- The grace window is used as the spec intended: continuity for cached consumers, but no extension to new signatures under the compromised key.
- The audit trail is explicit: a documented rotation event is recorded in the publisher's commit history. Future readers reconstruct the timeline by reading the JWKS history (each rotation adds a new key) and the document signature history.

**Negative.**

- Consumers who fetched a document signed by the compromised key and consult the KT log get a `kt_uninlogged` signal. This is the correct signal but may be confusing without context. The X7 advisory note explains the semantics; consumer-side tooling that surfaces X7 should be careful in how it presents `kt_uninlogged` for cached documents (it might mean "publisher hasn't registered yet" or "this is an old cached signature under a now-rotated key").
- The procedure depends on the steward executing the steps in sequence. A rotation that adds the new key to the JWKS but forgets to re-sign live documents leaves the operational state inconsistent (live document still verifies under the old key; new key is just sitting in the JWKS). Operator discipline matters. ADR-0010's tooling (the snapshot Worker, the X7 evaluator) does not enforce this discipline; it is procedural.
- The compromised key remains in the JWKS for 90 days. An attacker holding the leaked key cannot forge a NEW signature on the live document (the live document is signed under the new key and that's what consumers fetch), but they CAN convince a consumer that a cached document the attacker created before the rotation date is legitimate. Consumers with no out-of-band reference (no retained snapshot, no fresh cache invalidation) accept the cached document. This is the inherent limit of the JWKS-overlap model and not unique to this ADR.

**Neutral.**

- The reference tooling (`llmo keygen`, `llmo sign`, `llmo register`, the snapshot Worker, the validator's X7 check) all work without modification under this procedure. No new code is required to follow this ADR. The procedure is operational discipline, codified.
- The procedure scales linearly: the same six-step pattern applies whether the publisher has one signing key or many, whether the steward has one published document or many. Each kid that's compromised gets its own rotation; each document signed under it gets re-signed.

## References

- [Spec v0.1 §4.2 (signing algorithms and key rotation)](/spec/v0.1#42-signing-algorithms): mandates the 90-day overlap window.
- [LIP-4 §3.4 (Rule X7, KT registry inclusion)](/spec/lips/lip-0004/): defines `kt_uninlogged` and the absence-is-meaningful semantics this ADR relies on.
- [ADR-0010 (operating the llmo.org KT registry)](/adr/0010-kt-registry-operations/): operational architecture for the registry whose semantics this ADR makes use of.
- [ADR-0001 (two-entity firewall)](/adr/0001-two-entity-firewall/): structural context for why the steward's rotation procedure matters for the protocol's credibility.
