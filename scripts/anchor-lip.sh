#!/usr/bin/env bash
# Anchors a LIP file to Bitcoin via OpenTimestamps.
# Usage: bash scripts/anchor-lip.sh spec/lips/lip-NNNN.mdx   (run from repo root)
# Produces <file>.ots alongside the LIP. The proof is initially pending
# (submitted to calendar servers); it becomes confirmed in a Bitcoin block
# within hours to a day. Run scripts/verify-lip-anchor.sh to check status.
# Exit codes: 0 success; 1 validation failure; 2 ots command failure.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "ERROR: exactly one argument required (path to LIP file)." >&2
  echo "Usage: bash scripts/anchor-lip.sh spec/lips/lip-NNNN.mdx" >&2
  exit 1
fi

FILE="$1"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: $FILE does not exist or is not a regular file." >&2
  exit 1
fi

if [[ "$FILE" != spec/lips/* ]]; then
  echo "ERROR: $FILE is not under spec/lips/. Anchoring is restricted to LIP files." >&2
  exit 1
fi

BASE=$(basename "$FILE")
if [[ ! "$BASE" =~ ^lip-[0-9]{4}\.mdx$ ]]; then
  echo "ERROR: $FILE does not match the lip-NNNN.mdx pattern." >&2
  echo "Placeholder files (lip-NEW-*.mdx) are not anchored; their content is not final." >&2
  exit 1
fi

if ! command -v ots > /dev/null 2>&1; then
  echo "ERROR: ots is required but not installed." >&2
  echo "Install with: pip3 install opentimestamps-client" >&2
  exit 2
fi

if [[ -e "$FILE.ots" ]]; then
  echo "ERROR: $FILE.ots already exists. Refusing to overwrite an existing proof." >&2
  exit 1
fi

echo "Anchoring $FILE to OpenTimestamps calendar servers..."
if ! ots stamp "$FILE"; then
  echo "ERROR: ots stamp failed for $FILE." >&2
  exit 2
fi

if [[ ! -f "$FILE.ots" ]]; then
  echo "ERROR: ots stamp completed but $FILE.ots was not produced." >&2
  exit 2
fi

echo "Created $FILE.ots (status: pending calendar attestation)."
echo "Run 'bash scripts/verify-lip-anchor.sh $FILE' to check confirmation status."
