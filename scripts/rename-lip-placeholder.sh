#!/usr/bin/env bash
# Renames placeholder LIP files (lip-NEW-<slug>.mdx) to numbered files
# (lip-NNNN.mdx) at merge time, per LIP-2 Section 5.
# Appends the new LIP to spec/lips/index.json in numerical order and
# updates the 'generated' field. Commits with DCO sign-off and pushes
# to the PR branch.
# Invoked by .github/workflows/rename-lip-placeholder.yml when a PR
# receives the 'editor-approved' label. Expects PR_NUMBER and PR_BODY
# in the environment.
# Exit codes: 0 = success or idempotent no-op; 1 = validation failure.

set -euo pipefail

PR_NUMBER="${PR_NUMBER:?PR_NUMBER env var required}"
PR_BODY="${PR_BODY:-}"
INDEX="spec/lips/index.json"

# Post a comment on the PR (if gh is available and GH_TOKEN set) and exit 1.
fail() {
  local message="$1"
  echo "FAIL: $message" >&2
  if command -v gh > /dev/null 2>&1 && [[ -n "${GH_TOKEN:-}" ]]; then
    gh pr comment "$PR_NUMBER" --body "**Rename automation failed**

$message

The editor can correct the underlying issue and re-apply the \`editor-approved\` label to re-trigger." || true
  fi
  exit 1
}

# -------- Step 1: Parse LIP number from PR description --------
lip_num=$(printf '%s\n' "$PR_BODY" | awk '/^LIP number:[[:space:]]+[0-9]+[[:space:]]*$/ { print $3; exit }')
if [[ -z "$lip_num" ]] || ! [[ "$lip_num" =~ ^[0-9]+$ ]]; then
  fail "Could not parse LIP number from PR description. The description must contain a line of the form 'LIP number: NNNN' where NNNN is a positive integer."
fi

lip_num_padded=$(printf '%04d' "$lip_num")
numbered_file="spec/lips/lip-${lip_num_padded}.mdx"

# -------- Idempotency check --------
# If rename already occurred (no placeholders, numbered file present,
# number in registry), exit cleanly without making changes.
shopt -s nullglob
placeholder_files=(spec/lips/lip-NEW-*.mdx)
shopt -u nullglob

num_in_registry=0
if jq -e --argjson n "$lip_num" 'any(.lips[]; .lip == $n)' "$INDEX" > /dev/null 2>&1; then
  num_in_registry=1
fi

if (( ${#placeholder_files[@]} == 0 )) && [[ -f "$numbered_file" ]] && (( num_in_registry )); then
  echo "OK: LIP-${lip_num} already renamed and registered. Idempotent no-op."
  exit 0
fi

# -------- Step 2: Verify number not already in registry --------
if (( num_in_registry )); then
  fail "LIP-${lip_num} is already present in ${INDEX}. LIP numbers are permanent and cannot be reused."
fi

# -------- Step 3: Verify exactly one placeholder file --------
if (( ${#placeholder_files[@]} == 0 )); then
  fail "No placeholder file (spec/lips/lip-NEW-*.mdx) found on this branch. Expected exactly one."
fi
if (( ${#placeholder_files[@]} > 1 )); then
  fail "Multiple placeholder files found: ${placeholder_files[*]}. Expected exactly one."
fi

placeholder="${placeholder_files[0]}"

# -------- Step 4: Rename placeholder to numbered filename --------
echo "Renaming ${placeholder} -> ${numbered_file}"
git mv "$placeholder" "$numbered_file"

# -------- Step 5: Parse frontmatter, construct registry entry --------
extract_fm() {
  local field="$1"
  awk -v f="$field" '
    /^---$/ { count++; if (count == 2) exit; next }
    count == 1 && $0 ~ "^" f ":[[:space:]]" {
      sub("^" f ":[[:space:]]*", "")
      sub(/[[:space:]]+$/, "")
      sub(/^"/, ""); sub(/"$/, "")
      print
      exit
    }
  ' "$numbered_file"
}

fm_title=$(extract_fm "title")
fm_author_raw=$(extract_fm "author")
fm_status=$(extract_fm "status")
fm_type=$(extract_fm "type")
fm_created=$(extract_fm "created")

# Strip email portion from author: "Nic Chavez <spec@llmo.org>" -> "Nic Chavez"
fm_author="${fm_author_raw%%<*}"
fm_author="${fm_author%"${fm_author##*[![:space:]]}"}"

missing=""
[[ -n "$fm_title"   ]] || missing="${missing}title, "
[[ -n "$fm_author"  ]] || missing="${missing}author, "
[[ -n "$fm_status"  ]] || missing="${missing}status, "
[[ -n "$fm_type"    ]] || missing="${missing}type, "
[[ -n "$fm_created" ]] || missing="${missing}created, "
if [[ -n "$missing" ]]; then
  fail "Frontmatter of ${numbered_file} is missing required field(s): ${missing%, }"
fi

# -------- Step 6: Append entry and update 'generated' --------
today=$(date -u +%Y-%m-%d)
jq --argjson n "$lip_num" \
   --arg title "$fm_title" \
   --arg author "$fm_author" \
   --arg status "$fm_status" \
   --arg type "$fm_type" \
   --arg created "$fm_created" \
   --arg path "/$numbered_file" \
   --arg today "$today" \
   '.generated = $today
    | .lips = (
        .lips + [{
          lip: $n,
          title: $title,
          author: $author,
          status: $status,
          type: $type,
          created: $created,
          path: $path
        }]
      )
    | .lips |= sort_by(.lip)' "$INDEX" > "${INDEX}.tmp"
mv "${INDEX}.tmp" "$INDEX"

# -------- Step 7: Commit (DCO sign-off, bot identity) --------
git config user.name "llmo-bot"
git config user.email "bot@llmo.org"

git add "$INDEX"
git commit -s -m "chore(spec): rename LIP placeholder to lip-${lip_num_padded} and add registry entry"

# -------- Step 8: Push to PR branch --------
git push origin HEAD

echo "OK: renamed ${placeholder} -> ${numbered_file}; ${INDEX} updated; pushed to PR branch."
