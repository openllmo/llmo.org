#!/usr/bin/env bash
# Validates the integrity of the LLMO Improvement Proposal (LIP) registry.
# Checks six invariants across static/spec/lips/index.json and content/spec/lips/lip-NNNN.md:
# (1) 'generated' matches latest commit to LIP files; (2) every LIP file has
# a registry entry; (3) every registry entry points at an existing file;
# (4) LIP numbers are unique and entries are sorted ascending by number;
# (5) frontmatter agrees with the registry on six fields;
# (6) the frontmatter 'status' field agrees with the 'to' field of the last
#     entry in the transitions array.
#
# The 'path' field in index.json is the public URL where each LIP is
# published (e.g., /spec/lips/lip-0001/), not a filesystem path. This
# script maps URL to filesystem path internally via url_to_fs_path().
# Usage: bash scripts/validate-lip-registry.sh   (run from repo root)
# Exit codes: 0 = all invariants satisfied; 1 = one or more violations reported.

set -euo pipefail

INDEX="static/spec/lips/index.json"
ERRORS=0

report() {
  printf '%s\n\n' "$1" >&2
  ERRORS=$((ERRORS + 1))
}

# Map a published URL (as carried in index.json's path field) to the
# filesystem path of the LIP's source markdown file.
# Example: /spec/lips/lip-0001/ -> content/spec/lips/lip-0001.md
url_to_fs_path() {
  local url="$1"
  url="${url#/}"
  url="${url%/}"
  echo "content/${url}.md"
}

if [[ ! -f "$INDEX" ]]; then
  echo "ERROR: $INDEX does not exist. Cannot validate registry." >&2
  exit 1
fi

if ! command -v jq > /dev/null 2>&1; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

# -------- Invariant 1: 'generated' freshness --------
GENERATED=$(jq -r '.generated' "$INDEX")
REF_DATE=$(git log -1 --format=%cs -- content/spec/lips/ static/spec/lips/ 2>/dev/null || true)

if [[ -z "$REF_DATE" ]]; then
  echo "NOTE: No commits to LIP files yet. Invariant 1 (generated freshness) skipped." >&2
  echo "This state should only occur during initial repo setup. If you see this in" >&2
  echo "a non-bootstrap context, something is wrong with the git history." >&2
elif [[ "$GENERATED" != "$REF_DATE" ]]; then
  report "ERROR: $INDEX 'generated' field is out of date.
  Current value:  $GENERATED
  Expected value: $REF_DATE  (date of most recent commit to LIP files)
  Fix: update the 'generated' field in $INDEX to match the latest commit date."
fi

# -------- Invariant 2: every LIP file has a registry entry --------
shopt -s nullglob
for file in content/spec/lips/lip-????.md; do
  base=$(basename "$file" .md)
  num_str="${base#lip-}"
  # Reject filenames that do not match the strict four-digit pattern.
  if [[ ! "$num_str" =~ ^[0-9]{4}$ ]]; then
    continue
  fi
  num=$((10#$num_str))
  if ! jq -e --argjson n "$num" 'any(.lips[]; .lip == $n)' "$INDEX" > /dev/null; then
    report "ERROR: LIP file has no registry entry.
  Orphaned file: $file
  Fix: add an entry for LIP-$num to $INDEX, or remove the file."
  fi
done
shopt -u nullglob

# -------- Invariant 3: every registry entry points at an existing file --------
while IFS=$'\t' read -r lip_num path; do
  rel_path=$(url_to_fs_path "$path")
  if [[ ! -f "$rel_path" ]]; then
    report "ERROR: Registry entry points at non-existent file.
  Broken entry: LIP-$lip_num (URL: $path; expected source: $rel_path)
  Fix: create the missing file, or remove the entry from $INDEX."
  fi
done < <(jq -r '.lips[] | [.lip, .path] | @tsv' "$INDEX")

# -------- Invariant 4: unique and sorted ascending --------
NUMS=()
while IFS= read -r _n; do
  NUMS+=("$_n")
done < <(jq -r '.lips[].lip' "$INDEX")

for ((i = 0; i < ${#NUMS[@]}; i++)); do
  for ((j = i + 1; j < ${#NUMS[@]}; j++)); do
    if [[ "${NUMS[i]}" == "${NUMS[j]}" ]]; then
      report "ERROR: Duplicate LIP number in registry.
  LIP-${NUMS[i]} appears at index positions $i and $j in $INDEX
  Fix: remove the duplicate entry. LIP numbers are permanent once committed and must be unique."
    fi
  done
done

for ((i = 0; i + 1 < ${#NUMS[@]}; i++)); do
  if (( NUMS[i] > NUMS[i+1] )); then
    report "ERROR: Registry entries are not sorted by LIP number.
  Entry at index position $i (LIP-${NUMS[i]}) appears after entry at index position $((i+1)) (LIP-${NUMS[i+1]}).
  Fix: sort the 'lips' array in $INDEX in ascending order by 'lip' field."
  fi
done

# -------- Invariant 5: frontmatter agrees with registry --------
extract_fm_field() {
  local file="$1"
  local field="$2"
  awk -v f="$field" '
    /^---$/ { count++; if (count == 2) exit; next }
    count == 1 {
      pat = "^" f ":"
      if ($0 ~ pat) {
        sub("^" f ":[[:space:]]*", "")
        sub(/[[:space:]]+$/, "")
        sub(/^"/, ""); sub(/"$/, "")
        print
        exit
      }
    }
  ' "$file"
}

has_two_fm_delims() {
  local file="$1"
  [[ "$(head -n 1 "$file" 2>/dev/null)" == "---" ]] || return 1
  awk 'NR > 1 && /^---$/ { found = 1; exit } END { exit !found }' "$file"
}

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

fm_report() {
  local rel_path="$1" lip_num="$2" field="$3" fm_val="$4" idx_val="$5"
  report "ERROR: Frontmatter disagrees with registry entry.
  LIP-$lip_num ($rel_path)
  Field: $field
  Frontmatter value: $fm_val
  Registry value:    $idx_val
  Fix: update either the LIP frontmatter or the registry entry so they agree. The authoritative value depends on intent; consult LIP-1 Section 3 (LIP lifecycle) to determine which value is correct."
}

while IFS=$'\t' read -r lip_num idx_title idx_author idx_status idx_type idx_created path; do
  rel_path=$(url_to_fs_path "$path")
  [[ -f "$rel_path" ]] || continue  # Invariant 3 will have reported the missing file.

  if ! has_two_fm_delims "$rel_path"; then
    report "ERROR: Cannot parse LIP frontmatter.
  File: $rel_path
  Problem: missing closing '---' delimiter on frontmatter block (or file does not begin with '---').
  Fix: ensure the frontmatter block begins and ends with a line containing only '---', and that all six required fields (lip, title, author, status, type, created) are present and well-formed."
    continue
  fi

  fm_lip=$(extract_fm_field "$rel_path" "lip")
  fm_title=$(extract_fm_field "$rel_path" "title")
  fm_author_raw=$(extract_fm_field "$rel_path" "author")
  fm_status=$(extract_fm_field "$rel_path" "status")
  fm_type=$(extract_fm_field "$rel_path" "type")
  fm_created=$(extract_fm_field "$rel_path" "created")

  missing=""
  [[ -n "$fm_lip" ]]         || missing="${missing}lip, "
  [[ -n "$fm_title" ]]       || missing="${missing}title, "
  [[ -n "$fm_author_raw" ]]  || missing="${missing}author, "
  [[ -n "$fm_status" ]]      || missing="${missing}status, "
  [[ -n "$fm_type" ]]        || missing="${missing}type, "
  [[ -n "$fm_created" ]]     || missing="${missing}created, "
  if [[ -n "$missing" ]]; then
    missing="${missing%, }"
    report "ERROR: Cannot parse LIP frontmatter.
  File: $rel_path
  Problem: missing required field(s): $missing
  Fix: ensure the frontmatter block begins and ends with a line containing only '---', and that all six required fields (lip, title, author, status, type, created) are present and well-formed."
    continue
  fi

  fm_author_name=$(trim "${fm_author_raw%%<*}")
  idx_author_trim=$(trim "$idx_author")

  [[ "$fm_lip"         == "$lip_num"        ]] || fm_report "$rel_path" "$lip_num" "lip"     "$fm_lip"         "$lip_num"
  [[ "$fm_title"       == "$idx_title"      ]] || fm_report "$rel_path" "$lip_num" "title"   "$fm_title"       "$idx_title"
  [[ "$fm_author_name" == "$idx_author_trim" ]] || fm_report "$rel_path" "$lip_num" "author" "$fm_author_name" "$idx_author_trim"
  [[ "$fm_status"      == "$idx_status"     ]] || fm_report "$rel_path" "$lip_num" "status"  "$fm_status"      "$idx_status"
  [[ "$fm_type"        == "$idx_type"       ]] || fm_report "$rel_path" "$lip_num" "type"    "$fm_type"        "$idx_type"
  [[ "$fm_created"     == "$idx_created"    ]] || fm_report "$rel_path" "$lip_num" "created" "$fm_created"     "$idx_created"
done < <(jq -r '.lips[] | [.lip, .title, .author, .status, .type, .created, .path] | @tsv' "$INDEX")

# -------- Invariant 6: status agrees with last transition --------
extract_last_transition_to() {
  local file="$1"
  awk '
    /^---$/ { count++; if (count == 2) exit; next }
    count == 1 {
      if ($0 ~ /^transitions:[[:space:]]*$/) { in_t = 1; next }
      if (in_t && $0 ~ /^[^[:space:]#]/) { in_t = 0 }
      if (in_t && $0 ~ /^[[:space:]]+to:[[:space:]]*/) {
        sub(/^[[:space:]]+to:[[:space:]]*/, "")
        sub(/[[:space:]]+$/, "")
        sub(/^"/, ""); sub(/"$/, "")
        last_to = $0
      }
    }
    END { if (last_to != "") print last_to }
  ' "$file"
}

while IFS=$'\t' read -r lip_num path; do
  rel_path=$(url_to_fs_path "$path")
  [[ -f "$rel_path" ]] || continue
  has_two_fm_delims "$rel_path" || continue  # Invariant 5 already reported.

  fm_status=$(extract_fm_field "$rel_path" "status")
  last_to=$(extract_last_transition_to "$rel_path")

  if [[ -z "$last_to" ]]; then
    report "ERROR: Cannot parse LIP frontmatter.
  File: $rel_path
  Problem: transitions array is missing, empty, or malformed (no 'to:' field found in any list entry).
  Fix: ensure the frontmatter contains a 'transitions:' array with at least one entry that includes a 'to:' field."
    continue
  fi

  if [[ -n "$fm_status" ]] && [[ "$fm_status" != "$last_to" ]]; then
    report "ERROR: LIP status contradicts transition log.
  LIP-$lip_num ($rel_path)
  Status field:               $fm_status
  Last transition 'to' field: $last_to
  Fix: either update the status field to match the last transition, or append a new transition entry that ends at the declared status."
  fi
done < <(jq -r '.lips[] | [.lip, .path] | @tsv' "$INDEX")

# -------- Summary --------
if (( ERRORS > 0 )); then
  echo "FAIL: $ERRORS LIP registry integrity violation(s) found." >&2
  exit 1
fi

echo "OK: LIP registry integrity validated."
exit 0
