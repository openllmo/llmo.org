#!/usr/bin/env bash
# Verifies the OpenTimestamps anchor proof for a LIP file.
# Usage: bash scripts/verify-lip-anchor.sh content/spec/lips/lip-NNNN.md   (run from repo root)
# Reads <file>.ots, runs 'ots upgrade' (best effort; pulls latest Bitcoin
# attestations from calendar servers), then 'ots verify'. Reports pending
# or confirmed. If 'ots upgrade' modifies the .ots file, notes it so the
# caller knows to commit the updated proof.
# Exit codes: 0 pending or confirmed; 1 verification failure.

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

BEFORE_HASH=$(shasum -a 256 "$PROOF" | awk '{print $1}')

# Best-effort upgrade: pulls any new Bitcoin attestations from calendar
# servers. Harmless on a confirmed proof (idempotent). May fail if the
# calendar is unreachable or the proof is already fully upgraded; we
# tolerate either outcome and move on to verify.
ots upgrade "$PROOF" > /dev/null 2>&1 || true

AFTER_HASH=$(shasum -a 256 "$PROOF" | awk '{print $1}')

if [[ "$BEFORE_HASH" != "$AFTER_HASH" ]]; then
  echo "Note: $PROOF was modified by ots upgrade during verification."
  echo "      Commit the updated proof to record the new attestation."
fi

set +e
VERIFY_OUTPUT=$(ots verify "$PROOF" 2>&1)
VERIFY_EXIT=$?
set -e

if [[ $VERIFY_EXIT -eq 0 ]]; then
  BLOCK=$(printf '%s\n' "$VERIFY_OUTPUT" | grep -oE 'Bitcoin block [0-9]+' | head -n1 | awk '{print $3}')
  TIMESTAMP=$(printf '%s\n' "$VERIFY_OUTPUT" | grep -oE 'as of [0-9-]+ [0-9:]+ UTC' | head -n1 | sed 's/^as of //')
  if [[ -n "$BLOCK" && -n "$TIMESTAMP" ]]; then
    echo "Confirmed: anchored in Bitcoin at $TIMESTAMP (block $BLOCK)."
  else
    echo "Confirmed: ots verify reported success."
    echo "$VERIFY_OUTPUT"
  fi
  exit 0
fi

if printf '%s\n' "$VERIFY_OUTPUT" | grep -qiE 'pending|not found|not ready|not yet|Try running .ots upgrade.'; then
  echo "Pending: submitted to calendar servers, not yet confirmed in Bitcoin."
  echo "         Re-run this script later to check for Bitcoin block inclusion."
  exit 0
fi

echo "Verification failed:" >&2
printf '%s\n' "$VERIFY_OUTPUT" >&2
exit 1
