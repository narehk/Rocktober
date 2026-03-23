#!/usr/bin/env bash
# ado-update-state.sh — Update an ADO work item's state
# Usage: bash .claude/scripts/ado/ado-update-state.sh <ado_id> <new_state>
# Output: JSON to stdout

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 2 ]] || usage_exit "ado-update-state.sh <ado_id> <new_state>"

ADO_ID="$1"
NEW_STATE="$2"

check_az_auth
ORG="$(get_ado_org)"

result=$(az boards work-item update \
  --id "$ADO_ID" \
  --state "$NEW_STATE" \
  --org "$ORG" \
  --output json 2>&1) || {
  log_error "Failed to update ADO #$ADO_ID state to '$NEW_STATE'"
  log_error "$result"
  exit 1
}

echo "$result"
log_info "Updated ADO #$ADO_ID state to '$NEW_STATE'"
