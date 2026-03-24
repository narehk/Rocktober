#!/usr/bin/env bash
# ado-wiki-publish.sh — Create or update a wiki page on an ADO code wiki
# Works around az CLI bug where wiki page update/delete fails on code wikis
# with "versionType should be 'branch'" error. Uses REST API instead.
#
# Usage: bash .claude/scripts/ado/ado-wiki-publish.sh <wiki_name> <page_path> <content_file>
#   wiki_name    — Name of the ADO wiki (e.g., "Digital-Proving-Ground")
#   page_path    — Wiki page path (e.g., "/Rocktober/Reviews/W-11969-author-quiz")
#   content_file — Local file whose content will be published to the wiki page
#
# Output: JSON response to stdout
# Exit: 0 on success, 1 on failure
#
# See AAR #13: https://github.com/southbendin/WorkSpaceFramework/issues/13

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 3 ]] || usage_exit "ado-wiki-publish.sh <wiki_name> <page_path> <content_file>"

WIKI_NAME="$1"
PAGE_PATH="$2"
CONTENT_FILE="$3"

if [[ ! -f "$CONTENT_FILE" ]]; then
  log_error "Content file not found: $CONTENT_FILE"
  exit 1
fi

check_az_auth
ORG="$(get_ado_org)"
PROJECT="$(get_ado_project)"

# --- Step 1: Get wiki ID and project GUID ---

log_info "Looking up wiki '$WIKI_NAME'..."
WIKI_JSON=$(az devops wiki list --org "$ORG" --project "$PROJECT" -o json 2>&1) || {
  log_error "Failed to list wikis: $WIKI_JSON"
  exit 1
}

# Parse wiki list — extract the block for our wiki and get its id and projectId
# The JSON may be pretty-printed (az CLI) or compact, so match flexibly
WIKI_BLOCK=$(echo "$WIKI_JSON" | grep -A20 "\"name\":\\s*\"$WIKI_NAME\"" || true)

if [[ -z "$WIKI_BLOCK" ]]; then
  log_error "Wiki '$WIKI_NAME' not found. Available wikis:"
  echo "$WIKI_JSON" | grep -oP '"name":\s*"\K[^"]*' >&2
  exit 1
fi

# For code wikis, the id is a GUID string
WIKI_ID=$(echo "$WIKI_BLOCK" | grep -oP '"id":\s*"\K[^"]*' | head -1 || true)
# Also try the remoteUrl to extract wiki ID (reliable fallback)
if [[ -z "$WIKI_ID" ]]; then
  WIKI_ID=$(echo "$WIKI_BLOCK" | grep -oP '/wikis/\K[a-f0-9-]+' | head -1 || true)
fi

if [[ -z "$WIKI_ID" ]]; then
  log_error "Could not extract wiki ID for '$WIKI_NAME'"
  exit 1
fi

PROJECT_ID=$(echo "$WIKI_BLOCK" | grep -oP '"projectId":\s*"\K[^"]*' | head -1)

if [[ -z "$PROJECT_ID" ]]; then
  log_error "Could not extract project ID from wiki listing"
  exit 1
fi

log_info "Wiki ID: $WIKI_ID, Project: $PROJECT_ID"

# --- Step 2: Get access token ---

TOKEN=$(az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv 2>&1) || {
  log_error "Failed to get access token: $TOKEN"
  exit 1
}

# --- Step 3: Check if page exists and get eTag ---

ORG_BASE=$(echo "$ORG" | sed 's|/$||')
API_BASE="$ORG_BASE/$PROJECT_ID/_apis/wiki/wikis/$WIKI_ID/pages"

log_info "Checking if page exists at '$PAGE_PATH'..."
# Use -i to capture response headers (eTag comes in headers for wiki pages)
SHOW_FULL=$(curl -si \
  "$API_BASE?path=$PAGE_PATH&includeContent=false&api-version=7.1" \
  -H "Authorization: Bearer $TOKEN" 2>&1)

HTTP_CODE=$(echo "$SHOW_FULL" | grep -oP 'HTTP/\S+\s+\K[0-9]+' | tail -1)
SHOW_BODY=$(echo "$SHOW_FULL" | sed -n '/^{/,$p')
# eTag is in the response header, not the body — extract from ETag header
PAGE_ETAG=$(echo "$SHOW_FULL" | grep -oP 'ETag:\s*"?\K[a-f0-9]+' | head -1 || true)

# --- Step 4: Read content and build JSON payload ---

# Read file content and escape for JSON (handle newlines, quotes, backslashes)
CONTENT=$(cat "$CONTENT_FILE")
# Use a heredoc + python-free JSON escaping via bash
JSON_CONTENT=$(printf '%s' "$CONTENT" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

PAYLOAD="{\"content\":\"$JSON_CONTENT\"}"

if [[ "$HTTP_CODE" == "200" ]]; then
  # Page exists — update it (need eTag for If-Match header)
  if [[ -z "$PAGE_ETAG" ]]; then
    log_warn "Could not extract eTag from response headers, using wildcard"
    PAGE_ETAG="*"
  fi

  log_info "Page exists (eTag: ${PAGE_ETAG:0:12}...). Updating via REST API..."
  RESULT=$(curl -s -w "\n%{http_code}" -X PUT \
    "$API_BASE?path=$PAGE_PATH&versionDescriptor.version=main&versionDescriptor.versionType=branch&api-version=7.1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "If-Match: \"$PAGE_ETAG\"" \
    --data-binary "$PAYLOAD" 2>&1)
else
  # Page doesn't exist — create it
  log_info "Page not found (HTTP $HTTP_CODE). Creating via REST API..."
  RESULT=$(curl -s -w "\n%{http_code}" -X PUT \
    "$API_BASE?path=$PAGE_PATH&api-version=7.1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "$PAYLOAD" 2>&1)
fi

# --- Step 5: Check result ---

RESULT_CODE=$(echo "$RESULT" | tail -1)
RESULT_BODY=$(echo "$RESULT" | sed '$d')

if [[ "$RESULT_CODE" == "200" || "$RESULT_CODE" == "201" ]]; then
  echo "$RESULT_BODY"
  REMOTE_URL=$(echo "$RESULT_BODY" | json_field_str "remoteUrl")
  log_info "Published wiki page at '$PAGE_PATH'"
  log_info "URL: $REMOTE_URL"
else
  log_error "Wiki publish failed (HTTP $RESULT_CODE)"
  log_error "$RESULT_BODY"

  # If update failed due to eTag mismatch, try getting fresh eTag
  if echo "$RESULT_BODY" | grep -q "does not match"; then
    log_info "eTag mismatch — fetching fresh eTag and retrying..."
    FRESH_SHOW=$(curl -s "$API_BASE?path=$PAGE_PATH&includeContent=false&api-version=7.1" \
      -H "Authorization: Bearer $TOKEN")
    # Extract the git commit hash for the page (used as eTag for code wikis)
    FRESH_ETAG=$(echo "$FRESH_SHOW" | grep -oP '"gitItemPath":"[^"]*"' | head -1)
    # For code wikis, we need the actual page version — try the REST response eTag header approach
    RETRY=$(curl -s -w "\n%{http_code}" -X PUT \
      "$API_BASE?path=$PAGE_PATH&versionDescriptor.version=main&versionDescriptor.versionType=branch&api-version=7.1" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "If-Match: *" \
      --data-binary "$PAYLOAD" 2>&1)

    RETRY_CODE=$(echo "$RETRY" | tail -1)
    RETRY_BODY=$(echo "$RETRY" | sed '$d')
    if [[ "$RETRY_CODE" == "200" || "$RETRY_CODE" == "201" ]]; then
      echo "$RETRY_BODY"
      log_info "Published wiki page at '$PAGE_PATH' (retry with wildcard eTag)"
    else
      log_error "Retry also failed (HTTP $RETRY_CODE): $RETRY_BODY"
      exit 1
    fi
  else
    exit 1
  fi
fi
