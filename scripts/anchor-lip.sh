#!/usr/bin/env bash
# Anchors a LIP file to Bitcoin via OpenTimestamps.
# Usage: bash scripts/anchor-lip.sh content/spec/lips/lip-NNNN.md   (run from repo root)
# Produces <file>.ots alongside the LIP. The proof is initially pending
# (submitted to calendar servers); it becomes confirmed in a Bitcoin block
# within hours to a day. Run scripts/verify-lip-anchor.sh to check status.
# Exit codes: 0 success; 1 validation failure; 2 ots command failure.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "ERROR: exactly one argument required (path to LIP file)." >&2
  echo "Usage: bash scripts/anchor-lip.sh content/spec/lips/lip-NNNN.md" >&2
  exit 1
fi

FILE="$1"

if [[ "$FILE" == spec/lips/*.mdx ]]; then
  echo "ERROR: $FILE uses the pre-migration path and extension." >&2
  echo "       LIPs were migrated to Hugo on 2026-04-26. The new path is:" >&2
  echo "         content/spec/lips/$(basename "${FILE%.mdx}").md" >&2
  echo "       Original .mdx.ots proofs are preserved at static/spec/lips/legacy/." >&2
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: $FILE does not exist or is not a regular file." >&2
  exit 1
fi

if [[ "$FILE" != content/spec/lips/* ]]; then
  echo "ERROR: $FILE is not under content/spec/lips/. Anchoring is restricted to LIP files." >&2
  exit 1
fi

BASE=$(basename "$FILE")
if [[ ! "$BASE" =~ ^lip-[0-9]{4}\.md$ ]]; then
  echo "ERROR: $FILE does not match the lip-NNNN.md pattern." >&2
  echo "Placeholder files (lip-NEW-*.md) are not anchored; their content is not final." >&2
  exit 1
fi

if ! command -v ots > /dev/null 2>&1; then
  echo "ERROR: ots is required but not installed." >&2
  echo "Install with: pip3 install opentimestamps-client" >&2
  echo "Ensure the install location (e.g. ~/Library/Python/3.9/bin) is on PATH." >&2
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
