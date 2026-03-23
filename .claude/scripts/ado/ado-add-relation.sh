#!/usr/bin/env bash
# ado-add-relation.sh — Add a relation between ADO work items or a hyperlink
# Usage: bash .claude/scripts/ado/ado-add-relation.sh <source_id> <relation_type> <target_id_or_url>
#   relation_type: Parent, Child, Predecessor, Successor, Related, Duplicate, "Duplicate Of", Hyperlink
#   target: ADO work item ID (numeric) or URL (for Hyperlink type)
# Output: JSON to stdout

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 3 ]] || usage_exit "ado-add-relation.sh <source_id> <relation_type> <target_id_or_url>"

SOURCE_ID="$1"
RELATION_TYPE="$2"
TARGET="$3"

check_az_auth
ORG="$(get_ado_org)"

# Determine if target is a URL (Hyperlink) or an ID
if [[ "$RELATION_TYPE" == "Hyperlink" ]]; then
  TARGET_ARG="--target-url $TARGET"
else
  TARGET_ARG="--target-id $TARGET"
fi

result=$(az boards work-item relation add \
  --id "$SOURCE_ID" \
  --relation-type "$RELATION_TYPE" \
  $TARGET_ARG \
  --org "$ORG" \
  --output json 2>&1) || {
  log_error "Failed to add '$RELATION_TYPE' relation from #$SOURCE_ID to $TARGET"
  log_error "$result"
  exit 1
}

echo "$result"
log_info "Added '$RELATION_TYPE' relation: #$SOURCE_ID → $TARGET"
