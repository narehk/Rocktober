#!/usr/bin/env bash
# ado-query.sh — Execute a WIQL query against ADO
# Usage: bash .claude/scripts/ado/ado-query.sh <wiql_where_clause>
#   e.g.: bash .claude/scripts/ado/ado-query.sh "[System.State] <> 'Archived'"
#   The SELECT and FROM clauses are auto-generated; provide only the WHERE clause.
# Output: JSON to stdout

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 1 ]] || usage_exit "ado-query.sh <wiql_where_clause>"

WHERE_CLAUSE="$1"

check_az_auth
ORG="$(get_ado_org)"
PROJECT="$(get_ado_project)"

WIQL="SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] FROM workitems WHERE [System.TeamProject] = '$PROJECT' AND $WHERE_CLAUSE ORDER BY [System.ChangedDate] DESC"

result=$(az boards query \
  --wiql "$WIQL" \
  --org "$ORG" \
  --output json 2>&1) || {
  log_error "WIQL query failed"
  log_error "$result"
  exit 1
}

echo "$result"
log_info "Query returned results"
