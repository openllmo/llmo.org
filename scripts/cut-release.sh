#!/usr/bin/env bash
# Cuts a release section from `## [Unreleased]` in content/spec/changelog.md
# into a new `## [<version>] - <date>` section just below it. Idempotent:
# a no-op if `[Unreleased]` is empty.
#
# Usage: scripts/cut-release.sh <version> [date]
#   version: MAJOR.MINOR.PATCH (e.g. 0.1.7)
#   date:    YYYY-MM-DD (defaults to today UTC)
#
# Run from the repo root. Exit codes: 0 success or idempotent no-op; 1 input
# error; 2 changelog state error.
#
# ADR-0006 covers the version-bump and release-cut policy this script
# implements.

set -euo pipefail

VERSION="${1:?Usage: $0 <version> [date]}"
DATE="${2:-$(date -u +%Y-%m-%d)}"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: version must be MAJOR.MINOR.PATCH (got: '$VERSION')" >&2
  exit 1
fi

if [[ ! "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "ERROR: date must be YYYY-MM-DD (got: '$DATE')" >&2
  exit 1
fi

CHANGELOG="content/spec/changelog.md"

if [[ ! -f "$CHANGELOG" ]]; then
  echo "ERROR: $CHANGELOG not found. Run from repo root." >&2
  exit 2
fi

if grep -q "^## \[$VERSION\] " "$CHANGELOG"; then
  echo "ERROR: version $VERSION already present in $CHANGELOG. Releases are append-only; pick a new version." >&2
  exit 2
fi

# Idempotency check: scan for any non-blank line between `## [Unreleased]`
# and the next `## [` section header. If none, [Unreleased] is empty.
HAS_CONTENT=$(awk '
  /^## \[Unreleased\]/ { in_unreleased=1; next }
  in_unreleased && /^## \[/ { print "no"; exit }
  in_unreleased && NF > 0 { print "yes"; exit }
  END { if (!found) print "no" }
' "$CHANGELOG")

if [[ "$HAS_CONTENT" != "yes" ]]; then
  echo "OK: [Unreleased] is empty. Idempotent no-op."
  exit 0
fi

# Insert "## [<version>] - <date>" after the [Unreleased] line, with a blank
# line above the new header for Keep-a-Changelog spacing.
TMP=$(mktemp)
awk -v version="$VERSION" -v date="$DATE" '
  /^## \[Unreleased\]/ {
    print
    print ""
    print "## [" version "] - " date
    next
  }
  { print }
' "$CHANGELOG" > "$TMP"

if ! grep -q "^## \[$VERSION\] - $DATE\$" "$TMP"; then
  rm -f "$TMP"
  echo "ERROR: cut transformation did not produce the expected header in $CHANGELOG." >&2
  exit 2
fi

mv "$TMP" "$CHANGELOG"
echo "OK: cut [Unreleased] to [$VERSION] - $DATE in $CHANGELOG."
