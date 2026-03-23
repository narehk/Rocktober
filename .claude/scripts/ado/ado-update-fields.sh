#!/usr/bin/env bash
# ado-update-fields.sh — Update arbitrary fields on an ADO work item
# Usage: bash .claude/scripts/ado/ado-update-fields.sh <ado_id> <field=value> [field=value ...]
#   e.g.: bash .claude/scripts/ado/ado-update-fields.sh 12345 "Custom.Scenario=Login Flow" "Custom.Given=Given a user exists"
# Output: JSON to stdout
# Note: Uses MSYS_NO_PATHCONV=1 for Windows/Git Bash path safety with Custom.* fields

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 2 ]] || usage_exit "ado-update-fields.sh <ado_id> <field=value> [field=value ...]"

ADO_ID="$1"
shift

FIELD_ARGS=()
for f in "$@"; do
  FIELD_ARGS+=(-f "$f")
done

check_az_auth
ORG="$(get_ado_org)"

result=$(MSYS_NO_PATHCONV=1 az boards work-item update \
  --id "$ADO_ID" \
  --org "$ORG" \
  "${FIELD_ARGS[@]}" \
  -o json 2>&1) || {
  log_error "Failed to update fields on ADO #$ADO_ID"
  log_error "$result"
  exit 1
}

echo "$result"
log_info "Updated fields on ADO #$ADO_ID"
