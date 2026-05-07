#!/usr/bin/env bash
# Verifies that every external URL referenced in committed documents resolves.
# Catches the failure mode where a documented link silently 404s after a
# publishing-path change without any visual signal in review.
#
# Strategy:
#   - For URLs whose host is llmo.org, verify the corresponding path exists
#     in the locally-built Hugo output at public/. This catches the bug on
#     the PR itself, before the live site has caught up.
#   - For external URLs (anywhere else), curl the live URL and require 2xx.
#
# Currently checks SECURITY.md. To extend coverage, add paths to FILES below.
# Each new file adds a few seconds of CI time and increases the surface where
# a transient external outage can block a merge. Grow the list deliberately.
#
# Usage: bash scripts/check-doc-urls.sh
# Exit codes: 0 = all URLs resolve; 1 = one or more failures.

set -euo pipefail

FILES=("SECURITY.md")

# URLs the maintainer has reviewed and intentionally allows to fail. Each entry
# is a full URL. Keep this list short; entries should expire as soon as the
# referenced resource is fixed.
ALLOW_FAIL=()

USER_AGENT="Mozilla/5.0 (compatible; llmo-doc-url-check/1.0; +https://llmo.org/)"
MAX_TIME=15
LOCAL_HOST="llmo.org"
PUBLIC_DIR="public"

# Build Hugo's output if it isn't already there. `hugo --minify` is a no-op if
# nothing changed; cheap to run.
if [[ ! -d "$PUBLIC_DIR" ]] || [[ -z "$(ls -A "$PUBLIC_DIR" 2>/dev/null)" ]]; then
  echo "Building Hugo output to $PUBLIC_DIR/..."
  hugo --minify > /dev/null
fi

errors=0
checked=0

is_allowed() {
  local url="$1"
  for a in "${ALLOW_FAIL[@]:-}"; do
    [[ "$url" == "$a" ]] && return 0
  done
  return 1
}

# For an llmo.org URL, return success if the path exists in public/. Two cases:
#  - Path ends in / or has no extension: Hugo serves index.html, so look for
#    public/<path>index.html (or public/<path>/index.html if no trailing /).
#  - Path has an extension: look for the file directly.
check_local_url() {
  local url="$1"
  # Strip protocol+host, leaving the path.
  local path="${url#https://$LOCAL_HOST}"
  # Normalize: empty -> /
  [[ -z "$path" ]] && path="/"
  local fs_path
  if [[ "$path" == */ ]]; then
    fs_path="$PUBLIC_DIR${path}index.html"
  elif [[ "$(basename "$path")" == *.* ]]; then
    fs_path="$PUBLIC_DIR$path"
  else
    fs_path="$PUBLIC_DIR$path/index.html"
  fi
  if [[ -e "$fs_path" ]]; then
    return 0
  fi
  echo "  FAIL (no $fs_path): $url"
  return 1
}

# For an external URL, HEAD then fall back to GET. Some servers reject HEAD.
check_remote_url() {
  local url="$1"
  local code
  code=$(curl -sIL -A "$USER_AGENT" -o /dev/null -w "%{http_code}" --max-time "$MAX_TIME" "$url" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    return 0
  fi
  code=$(curl -sL -A "$USER_AGENT" -o /dev/null -w "%{http_code}" --max-time "$MAX_TIME" "$url" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    return 0
  fi
  echo "  FAIL ($code): $url"
  return 1
}

check_url() {
  local url="$1"
  if [[ "$url" == https://$LOCAL_HOST/* ]] || [[ "$url" == "https://$LOCAL_HOST" ]]; then
    check_local_url "$url"
  else
    check_remote_url "$url"
  fi
}

extract_urls() {
  # Pull every https:// URL from the file, then strip trailing punctuation
  # that is almost certainly a sentence terminator rather than part of the URL.
  grep -oE 'https://[^ <>")(]+' "$1" \
    | sed -E 's/[],.:;)>]+$//' \
    | sort -u
}

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: $f does not exist" >&2
    errors=$((errors + 1))
    continue
  fi
  echo "Checking $f..."
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    checked=$((checked + 1))
    if is_allowed "$url"; then
      echo "  ALLOWED-FAIL (skipped): $url"
      continue
    fi
    if ! check_url "$url"; then
      errors=$((errors + 1))
    else
      echo "  OK: $url"
    fi
  done < <(extract_urls "$f")
done

echo ""
echo "Checked $checked URL(s); $errors failure(s)."

if [[ $errors -gt 0 ]]; then
  echo ""
  echo "One or more documented URLs failed to resolve. Readers following these"
  echo "links will hit errors. Either fix the underlying resource, update the"
  echo "document to point at a working URL, or add the URL to ALLOW_FAIL in"
  echo "scripts/check-doc-urls.sh with a comment explaining why."
  exit 1
fi
