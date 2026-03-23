#!/usr/bin/env bash
# ado-post-comment.sh — Post a discussion comment to an ADO work item
# Usage: bash .claude/scripts/ado/ado-post-comment.sh <ado_id> <html_comment>
# Output: JSON to stdout
# Note: Non-blocking on failure (exits 0 with warning) per ADO Comment Protocol

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 2 ]] || usage_exit "ado-post-comment.sh <ado_id> <html_comment>"

ADO_ID="$1"
COMMENT_HTML="$2"

check_az_auth
ORG="$(get_ado_org)"

result=$(az boards work-item update \
  --id "$ADO_ID" \
  --discussion "$COMMENT_HTML" \
  --org "$ORG" \
  --output json 2>&1) || {
  log_warn "Comment post failed for ADO #$ADO_ID (non-blocking)"
  log_warn "$result"
  exit 0
}

echo "$result"
log_info "Posted comment to ADO #$ADO_ID"
