#!/usr/bin/env bash
# ado-create-item.sh — Create a new ADO work item
# Usage: bash .claude/scripts/ado/ado-create-item.sh <type> <title> [--parent <id>] [--assigned-to <name>] [--field key=val ...]
# Output: JSON to stdout

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 2 ]] || usage_exit "ado-create-item.sh <type> <title> [--parent <id>] [--assigned-to <name>] [--field key=val ...]"

TYPE="$1"
TITLE="$2"
shift 2

PARENT_ID=""
ASSIGNED_TO=""
FIELDS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --parent) PARENT_ID="$2"; shift 2 ;;
    --assigned-to) ASSIGNED_TO="$2"; shift 2 ;;
    --field) FIELDS+=("$2"); shift 2 ;;
    *) log_warn "Unknown flag: $1"; shift ;;
  esac
done

check_az_auth
ORG="$(get_ado_org)"
PROJECT="$(get_ado_project)"

# Build create command
CREATE_ARGS=(
  --type "$TYPE"
  --title "$TITLE"
  --project "$PROJECT"
  --org "$ORG"
  --output json
)

[[ -n "$ASSIGNED_TO" ]] && CREATE_ARGS+=(--assigned-to "$ASSIGNED_TO")

result=$(az boards work-item create "${CREATE_ARGS[@]}" 2>&1) || {
  log_error "Failed to create $TYPE '$TITLE'"
  log_error "$result"
  exit 1
}

echo "$result"
NEW_ID=$(echo "$result" | json_field "id")
log_info "Created $TYPE #$NEW_ID: '$TITLE'"

# Link to parent if specified
if [[ -n "$PARENT_ID" ]]; then
  link_result=$(az boards work-item relation add \
    --id "$NEW_ID" \
    --relation-type "Parent" \
    --target-id "$PARENT_ID" \
    --org "$ORG" \
    --output json 2>&1) || {
    log_warn "Created item #$NEW_ID but parent link to #$PARENT_ID failed"
    log_warn "$link_result"
  }
  [[ $? -eq 0 ]] && log_info "Linked #$NEW_ID as child of #$PARENT_ID"
fi

# Update custom fields if specified
if [[ ${#FIELDS[@]} -gt 0 ]]; then
  FIELD_ARGS=()
  for f in "${FIELDS[@]}"; do
    FIELD_ARGS+=(-f "$f")
  done
  field_result=$(MSYS_NO_PATHCONV=1 az boards work-item update \
    --id "$NEW_ID" \
    --org "$ORG" \
    "${FIELD_ARGS[@]}" \
    -o json 2>&1) || {
    log_warn "Created item #$NEW_ID but field update failed"
    log_warn "$field_result"
  }
fi
