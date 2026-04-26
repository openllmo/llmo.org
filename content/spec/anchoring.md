---
title: Anchoring LIP Documents
linkTitle: Anchoring
description: "How LLMO anchors LIP documents to Bitcoin via OpenTimestamps."
date: 2026-04-17
---

## Purpose

LLMO anchors accepted LIP documents to the Bitcoin blockchain via [OpenTimestamps](https://opentimestamps.org). An anchored document has a cryptographic proof that its exact content existed at a specific time, verifiable against the Bitcoin blockchain independent of any specific entity continuing to operate.

Anchoring is tamper-evidence, not tamper-proof. It does not prevent modification; it ensures that modification is detectable. Anchoring is also not a guarantee of content correctness. A LIP may be accurately anchored and still be wrong on the merits. The only claim the anchor supports is that the document bytes present at verification time match the document bytes present at anchoring time.

## How it works

OpenTimestamps is a timestamping protocol that commits the hash of a document to the Bitcoin blockchain. The process has three stages:

1. **Hash submission.** The document is hashed (SHA-256) and submitted to one or more calendar servers. Each calendar batches submitted hashes into a Merkle tree.
2. **Bitcoin commitment.** Periodically (roughly once per hour), each calendar commits the Merkle root of its current batch into a Bitcoin transaction. The Merkle root becomes part of the Bitcoin ledger.
3. **Proof construction.** The `.ots` file records the path from the document hash through the Merkle tree to the Bitcoin transaction. Verification walks that path, reproducing the Merkle root from the document hash and confirming the root appears in the cited Bitcoin block.

Note that the calendar URLs shown during stamping and during verification may differ. OpenTimestamps uses pool endpoints (for example, `a.pool.opentimestamps.org`) for submission load balancing and per-calendar endpoints (for example, `alice.btc.calendar.opentimestamps.org`) for direct attestation fetch. Different URLs, same infrastructure.

## Two phases: pending and confirmed

An OpenTimestamps proof passes through two states:

- **Pending.** Immediately after stamping, the proof contains only the calendar attestation. The calendar has received the hash and committed to batching it, but the Merkle root has not yet been folded into a Bitcoin block. A pending proof is a valid cryptographic commitment by the calendar, but does not yet have Bitcoin anchoring.
- **Confirmed.** After the calendar commits its next batch (typically within an hour), the `.ots` file can be upgraded to include the Bitcoin attestation. Once upgraded, the proof references a specific Bitcoin block, and verification does not require contacting the calendar.

Both states are meaningful proofs; confirmed is stronger. Running the verification script upgrades the proof in place when the Bitcoin attestation becomes available.

## Anchoring a LIP

To anchor a LIP file:

```
bash scripts/anchor-lip.sh spec/lips/lip-NNNN.mdx
```

The script validates that the path points to a non-placeholder LIP (four-digit numbered filename) and submits the file hash to the default OpenTimestamps calendars. It produces a `.ots` file adjacent to the LIP (for example, `spec/lips/lip-0001.mdx.ots`).

Commit both the LIP and its `.ots` file together. The proof attests to the exact bytes of the LIP at stamp time; any subsequent edit to the LIP invalidates the proof.

Re-anchoring an already-anchored LIP is refused by the script. A new stamp at a later time would claim existence at the later time, erasing the earlier claim. If re-anchoring is legitimately required (for example, the proof is corrupted and no off-site copy exists), remove the existing `.ots` file explicitly before re-running the script.

An anchor timestamp reflects when the stamp was created, not when the LIP was originally drafted. A LIP drafted in April and anchored in July carries a July proof; the earlier drafting date is recorded in git history, not in the anchor. Readers comparing commit dates to anchor timestamps should expect a gap when LIPs are anchored retroactively.

## Verifying an anchor

To verify a LIP's anchor:

```
bash scripts/verify-lip-anchor.sh spec/lips/lip-NNNN.mdx
```

The script first runs `ots upgrade` on the `.ots` file, which pulls any newly available Bitcoin attestations from the calendar servers. This operation is idempotent and best-effort; if the calendars are unreachable or the proof has no new attestations to pull, upgrade returns silently and verification proceeds.

If `ots upgrade` modifies the `.ots` file (a pending proof became confirmed, or a confirmed proof gained additional attestations), the script emits a note advising the caller to commit the updated proof. The update reflects a stronger attestation state and is worth preserving.

The script then runs `ots verify` and reports one of three outcomes:

- `Pending: submitted to calendar servers, not yet confirmed in Bitcoin.` Exit 0. The proof is valid as a calendar commitment; Bitcoin confirmation has not yet landed.
- `Confirmed: anchored in Bitcoin at <timestamp> (block <number>).` Exit 0. The proof is fully anchored. The timestamp and block number are recorded for the editor's reference.
- `Verification failed:` followed by the underlying `ots verify` output. Exit 1. Either the file content no longer matches the anchored hash, or the proof is structurally invalid.

## Security considerations

Anchoring inherits Bitcoin's security model for the confirmed state. Reorgs deep enough to invalidate OpenTimestamps attestations (several blocks deep) have not occurred in years of Bitcoin operation, though they are not cryptographically impossible. For the pending state, the attesting calendar is trusted only for the interval between stamp submission and Bitcoin block inclusion, typically hours. A calendar compromised during this window cannot produce a pending proof that later upgrades to a valid Bitcoin attestation; it can only fail to commit to a real block. Upgrading pending proofs to confirmed state closes the trust-the-calendar window and reduces the proof to a pure Bitcoin-security artifact.

## Reference

OpenTimestamps was created by [Peter Todd](https://petertodd.org), a Bitcoin Core contributor. The reference client (`opentimestamps-client`, written in Python) is the tool the LLMO scripts wrap. Specification and tooling: [opentimestamps.org](https://opentimestamps.org).

RFC 3161 specifies the Time-Stamp Protocol used by traditional timestamping authorities. OpenTimestamps differs in that it commits to a public blockchain rather than a trusted authority; the security model derives from Bitcoin's proof of work rather than from the reputation of a timestamping vendor.

## Current status

Anchoring is currently **optional** for LIPs. The LLMO editor anchors accepted LIPs as part of the merge workflow, but the registry validator does not require the presence of a `.ots` file. A future Process LIP may introduce a mandatory anchoring requirement; until then, the presence or absence of an anchor is an editorial decision recorded in the LIP's commit history.

At the time of this writing, LIP-1 and LIP-3 carry initial anchor proofs in their pending state. LIP-2 will be anchored when its PR merges.
