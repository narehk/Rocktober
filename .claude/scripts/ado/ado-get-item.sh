#!/usr/bin/env bash
# ado-get-item.sh — Query an ADO work item by ID
# Usage: bash .claude/scripts/ado/ado-get-item.sh <ado_id> [--expand relations]
# Output: JSON to stdout

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 1 ]] || usage_exit "ado-get-item.sh <ado_id> [--expand relations]"

ADO_ID="$1"
shift

EXPAND_FLAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --expand) EXPAND_FLAG="--expand $2"; shift 2 ;;
    *) log_warn "Unknown flag: $1"; shift ;;
  esac
done

check_az_auth
ORG="$(get_ado_org)"

result=$(az boards work-item show \
  --id "$ADO_ID" \
  --org "$ORG" \
  $EXPAND_FLAG \
  --output json 2>&1) || {
  log_error "Failed to fetch ADO #$ADO_ID"
  log_error "$result"
  exit 1
}

echo "$result"
log_info "Fetched ADO #$ADO_ID"
