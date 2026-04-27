#!/usr/bin/env bash
# Verifies the OpenTimestamps anchor proof for a LIP file.
# Usage: bash scripts/verify-lip-anchor.sh content/spec/lips/lip-NNNN.md   (run from repo root)
#
# Reads <file>.ots, runs 'ots upgrade' (best effort; pulls latest Bitcoin
# attestations from calendar servers), then extracts the Bitcoin block
# height and merkleroot from the proof via 'ots info' and verifies the
# merkleroot against three independent public block explorers in fallback
# order:
#
#   1. blockstream.info   (Blockstream)
#   2. mempool.space      (independent open source)
#   3. blockchain.info    (Blockchain.com)
#
# Verification succeeds if any explorer's reported merkleroot matches the
# proof. No local Bitcoin node required. Network access to one of the three
# explorers is required.
#
# Trust trade-off: this trusts at least one of the three independent
# explorer operators to report block headers correctly. For higher-trust
# verification, run 'ots verify' directly against a local Bitcoin node.
#
# If 'ots upgrade' modifies the .ots file, the script notes it so the
# caller knows to commit the updated proof.
#
# Exit codes:
#   0  proof is valid (Bitcoin-confirmed and merkleroot verified, or pending)
#   1  validation failure, environment problem, or merkleroot mismatch

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "ERROR: exactly one argument required (path to LIP file)." >&2
  echo "Usage: bash scripts/verify-lip-anchor.sh content/spec/lips/lip-NNNN.md" >&2
  exit 1
fi

FILE="$1"

if [[ "$FILE" == spec/lips/*.mdx ]]; then
  echo "ERROR: $FILE uses the pre-migration path and extension." >&2
  echo "       LIPs were migrated to Hugo on 2026-04-26. The new path is:" >&2
  echo "         content/spec/lips/$(basename "${FILE%.mdx}").md" >&2
  echo "       Original .mdx.ots proofs are preserved at static/spec/lips/legacy/;" >&2
  echo "       verifying those requires the original .mdx bytes from git history" >&2
  echo "       (e.g. git show <commit>:spec/lips/lip-NNNN.mdx)." >&2
  exit 1
fi

PROOF="$FILE.ots"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: $FILE does not exist or is not a regular file." >&2
  exit 1
fi

if [[ "$FILE" != content/spec/lips/* ]]; then
  echo "ERROR: $FILE is not under content/spec/lips/." >&2
  exit 1
fi

if [[ ! -f "$PROOF" ]]; then
  echo "ERROR: $PROOF does not exist. Run scripts/anchor-lip.sh $FILE first." >&2
  exit 1
fi

if ! command -v ots > /dev/null 2>&1; then
  echo "ERROR: ots is required but not installed." >&2
  echo "Install with: pip3 install opentimestamps-client" >&2
  echo "Ensure the install location (e.g. ~/Library/Python/3.9/bin) is on PATH." >&2
  exit 1
fi

if ! command -v shasum > /dev/null 2>&1; then
  echo "ERROR: shasum is required but not installed." >&2
  exit 1
fi

if ! command -v jq > /dev/null 2>&1; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

if ! command -v curl > /dev/null 2>&1; then
  echo "ERROR: curl is required but not installed." >&2
  exit 1
fi

BEFORE_HASH=$(shasum -a 256 "$PROOF" | awk '{print $1}')

# Best-effort upgrade: pulls any new Bitcoin attestations from calendar
# servers. Harmless on a confirmed proof (idempotent). May fail if the
# calendars are unreachable or the proof is already fully upgraded; we
# tolerate either outcome and move on to verify.
ots upgrade "$PROOF" > /dev/null 2>&1 || true

AFTER_HASH=$(shasum -a 256 "$PROOF" | awk '{print $1}')

UPGRADED_NOTE=""
if [[ "$BEFORE_HASH" != "$AFTER_HASH" ]]; then
  UPGRADED_NOTE="Note: $PROOF was modified by ots upgrade during verification.
      Commit the updated proof to record the new attestation."
fi

# Parse the proof via 'ots info'. This both confirms the file parses as
# a valid OTS proof (structural integrity) and extracts the Bitcoin
# attestation block height and claimed merkleroot for explorer comparison.
INFO=$(ots info "$PROOF" 2>&1)
INFO_EXIT=$?
if [[ $INFO_EXIT -ne 0 ]] || [[ -z "$INFO" ]]; then
  echo "ERROR: ots info failed on $PROOF. Proof file may be corrupt." >&2
  printf '%s\n' "$INFO" >&2
  exit 1
fi

HEIGHT=$(printf '%s\n' "$INFO" | grep -oE 'BitcoinBlockHeaderAttestation\([0-9]+\)' | head -n1 | grep -oE '[0-9]+' || true)
CLAIMED_MR=$(printf '%s\n' "$INFO" | grep -oE 'Bitcoin block merkle root [0-9a-f]{64}' | head -n1 | awk '{print $NF}' || true)

if [[ -z "$HEIGHT" || -z "$CLAIMED_MR" ]]; then
  # No Bitcoin attestation extracted. Proof either has only calendar
  # attestations (pending Bitcoin block confirmation) or is malformed.
  if printf '%s\n' "$INFO" | grep -q 'PendingAttestation'; then
    echo "Pending: proof has only calendar attestations, no Bitcoin block yet."
    echo "         Re-run this script after Bitcoin block confirmation (~1-3 hours)."
    [[ -n "$UPGRADED_NOTE" ]] && echo "$UPGRADED_NOTE"
    exit 0
  fi
  echo "ERROR: proof has no recognizable attestations." >&2
  printf '%s\n' "$INFO" >&2
  exit 1
fi

# Three independent explorers in fallback order. Each function prints the
# merkleroot to stdout and returns 0 on success, non-zero on any failure
# (network, parse, missing field).

verify_via_blockstream() {
  local h="$1" hash mr
  hash=$(curl -sf -m 10 "https://blockstream.info/api/block-height/$h") || return 1
  [[ -n "$hash" ]] || return 1
  mr=$(curl -sf -m 10 "https://blockstream.info/api/block/$hash" | jq -r '.merkle_root') || return 1
  [[ -n "$mr" && "$mr" != "null" ]] || return 1
  printf '%s' "$mr"
}

verify_via_mempool() {
  local h="$1" hash mr
  hash=$(curl -sf -m 10 "https://mempool.space/api/block-height/$h") || return 1
  [[ -n "$hash" ]] || return 1
  mr=$(curl -sf -m 10 "https://mempool.space/api/block/$hash" | jq -r '.merkle_root') || return 1
  [[ -n "$mr" && "$mr" != "null" ]] || return 1
  printf '%s' "$mr"
}

verify_via_blockchain() {
  local h="$1" mr
  mr=$(curl -sf -m 10 "https://blockchain.info/block-height/$h?format=json" | jq -r '.blocks[0].mrkl_root') || return 1
  [[ -n "$mr" && "$mr" != "null" ]] || return 1
  printf '%s' "$mr"
}

ACTUAL_MR=""
EXPLORER_NAME=""
for entry in "blockstream.info:verify_via_blockstream" "mempool.space:verify_via_mempool" "blockchain.info:verify_via_blockchain"; do
  name="${entry%%:*}"
  fn="${entry##*:}"
  if result=$("$fn" "$HEIGHT" 2>/dev/null); then
    ACTUAL_MR="$result"
    EXPLORER_NAME="$name"
    break
  fi
  echo "FAILED: $name (network or parse error)" >&2
done

if [[ -z "$ACTUAL_MR" ]]; then
  echo "ERROR: could not fetch block $HEIGHT merkleroot from any of three explorers." >&2
  exit 1
fi

if [[ "$ACTUAL_MR" != "$CLAIMED_MR" ]]; then
  echo "ERROR: merkleroot mismatch at block $HEIGHT." >&2
  echo "       Proof claims: $CLAIMED_MR" >&2
  echo "       $EXPLORER_NAME says: $ACTUAL_MR" >&2
  exit 1
fi

echo "OK: Bitcoin attestation verified against $EXPLORER_NAME at block $HEIGHT."
echo "    Merkleroot: $CLAIMED_MR"
[[ -n "$UPGRADED_NOTE" ]] && echo "$UPGRADED_NOTE"
exit 0
