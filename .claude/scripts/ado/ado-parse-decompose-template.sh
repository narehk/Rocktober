#!/usr/bin/env bash
# ado-parse-decompose-template.sh — Parse and validate a decomposition template file
# Usage: bash .claude/scripts/ado/ado-parse-decompose-template.sh <template-path>
# Output: JSON to stdout with structured decomposition data
# Exit 1 on validation failure (error message to stderr)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

[[ $# -ge 1 ]] || usage_exit "ado-parse-decompose-template.sh <template-path>"

TEMPLATE="$1"

if [[ ! -f "$TEMPLATE" ]]; then
  log_error "Template file not found: $TEMPLATE"
  exit 1
fi

if [[ ! -s "$TEMPLATE" ]]; then
  log_error "Template file is empty: $TEMPLATE"
  exit 1
fi

# --- Extract header metadata ---

PARENT_LINE=$(grep -m1 '^Parent:' "$TEMPLATE" 2>/dev/null || true)
TYPE_LINE=$(grep -m1 '^Type:' "$TEMPLATE" 2>/dev/null || true)

if [[ -z "$PARENT_LINE" ]]; then
  log_error "Missing 'Parent:' line in template header"
  exit 1
fi

PARENT_ADO_ID=$(echo "$PARENT_LINE" | grep -oP '#\K[0-9]+' | head -1)
if [[ -z "$PARENT_ADO_ID" ]]; then
  log_error "Could not extract ADO ID from Parent line: $PARENT_LINE"
  exit 1
fi

PARENT_TYPE=""
if [[ -n "$TYPE_LINE" ]]; then
  PARENT_TYPE=$(echo "$TYPE_LINE" | sed 's/^Type:\s*//' | xargs)
fi

# --- Extract table rows ---
# Find lines that match the table row pattern: | Type | Title | Parent | Description |
# Skip the header row and separator row

ROWS=()
TABLE_LINE_NUM=0

while IFS= read -r line; do
  # Detect table rows (lines starting with |)
  if [[ "$line" =~ ^\| ]]; then
    TABLE_LINE_NUM=$((TABLE_LINE_NUM + 1))
    # Skip header row (line 1) and separator row (line 2)
    if [[ $TABLE_LINE_NUM -le 2 ]]; then
      continue
    fi
    ROWS+=("$line")
  else
    # Reset if we hit a non-table line after the table started
    if [[ $TABLE_LINE_NUM -gt 2 ]]; then
      break  # End of table
    fi
  fi
done < "$TEMPLATE"

if [[ ${#ROWS[@]} -eq 0 ]]; then
  log_error "No data rows found in template table"
  exit 1
fi

# --- Parse and validate rows ---

DETAIL_COUNT=0
TASK_COUNT=0
ERRORS=()
TITLES=()

# Arrays to hold parsed data
declare -a ROW_TYPES ROW_TITLES ROW_PARENTS ROW_DESCS

for i in "${!ROWS[@]}"; do
  row="${ROWS[$i]}"
  row_num=$((i + 1))

  # Split on | and trim whitespace
  IFS='|' read -ra cols <<< "$row"

  # cols[0] is empty (before first |), cols[1]=Type, cols[2]=Title, cols[3]=Parent, cols[4]=Description
  if [[ ${#cols[@]} -lt 5 ]]; then
    ERRORS+=("Row $row_num: Expected 4 columns (Type|Title|Parent|Description), got $((${#cols[@]} - 1))")
    continue
  fi

  type=$(echo "${cols[1]}" | xargs)
  title=$(echo "${cols[2]}" | xargs)
  parent=$(echo "${cols[3]}" | xargs)
  desc=$(echo "${cols[4]}" | xargs)

  # Normalize type
  type_lower=$(echo "$type" | tr '[:upper:]' '[:lower:]')

  # Validate type
  if [[ "$type_lower" != "detail" && "$type_lower" != "task" ]]; then
    ERRORS+=("Row $row_num: Type must be 'Detail' or 'Task', got '$type'")
    continue
  fi

  # Validate title
  if [[ -z "$title" ]]; then
    ERRORS+=("Row $row_num: Title is empty")
    continue
  fi

  if [[ ${#title} -gt 255 ]]; then
    ERRORS+=("Row $row_num: Title exceeds 255 characters")
  fi

  # Check duplicate titles (case-insensitive)
  title_lower=$(echo "$title" | tr '[:upper:]' '[:lower:]')
  for existing in "${TITLES[@]}"; do
    if [[ "$existing" == "$title_lower" ]]; then
      ERRORS+=("Row $row_num: Duplicate title '$title'")
      break
    fi
  done
  TITLES+=("$title_lower")

  # Validate description
  if [[ -z "$desc" ]]; then
    ERRORS+=("Row $row_num: Description is empty (required for ADO Task state transitions)")
  fi

  # Validate parent reference
  if [[ "$type_lower" == "detail" ]]; then
    if [[ "$parent" != "-" ]]; then
      ERRORS+=("Row $row_num: Detail rows must have Parent '-', got '$parent'")
    fi
    DETAIL_COUNT=$((DETAIL_COUNT + 1))
  elif [[ "$type_lower" == "task" ]]; then
    if [[ ! "$parent" =~ ^Detail\ [0-9]+$ ]]; then
      ERRORS+=("Row $row_num: Task Parent must be 'Detail N' (e.g., 'Detail 1'), got '$parent'")
    else
      ref_num=$(echo "$parent" | grep -oP '[0-9]+')
      if [[ $ref_num -lt 1 || $ref_num -gt 100 ]]; then
        ERRORS+=("Row $row_num: Detail reference $ref_num is out of range")
      fi
    fi
    TASK_COUNT=$((TASK_COUNT + 1))
  fi

  ROW_TYPES+=("$type_lower")
  ROW_TITLES+=("$title")
  ROW_PARENTS+=("$parent")
  ROW_DESCS+=("$desc")
done

# Validate at least one Detail
if [[ $DETAIL_COUNT -eq 0 ]]; then
  ERRORS+=("Template must contain at least one Detail row")
fi

# Validate Task parent references point to existing Details
for i in "${!ROW_TYPES[@]}"; do
  if [[ "${ROW_TYPES[$i]}" == "task" ]]; then
    parent="${ROW_PARENTS[$i]}"
    if [[ "$parent" =~ ^Detail\ ([0-9]+)$ ]]; then
      ref_num="${BASH_REMATCH[1]}"
      if [[ $ref_num -gt $DETAIL_COUNT ]]; then
        ERRORS+=("Row $((i+1)): Parent 'Detail $ref_num' references non-existent Detail (only $DETAIL_COUNT Details defined)")
      fi
    fi
  fi
done

# Warn (not error) if no Tasks
if [[ $TASK_COUNT -eq 0 ]]; then
  log_warn "No Task rows found — Details will be created without Tasks"
fi

# Report errors
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  log_error "Template validation failed with ${#ERRORS[@]} error(s):"
  for err in "${ERRORS[@]}"; do
    log_error "  - $err"
  done
  exit 1
fi

# --- Build JSON output ---
# Using printf to construct JSON without jq

escape_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/}"
  s="${s//$'\t'/\\t}"
  echo -n "$s"
}

# Build details array with nested tasks
JSON='{"parentAdoId":'$PARENT_ADO_ID
if [[ -n "$PARENT_TYPE" ]]; then
  JSON+=',"parentType":"'"$(escape_json "$PARENT_TYPE")"'"'
fi
JSON+=',"details":['

DETAIL_IDX=0
FIRST_DETAIL=true

for i in "${!ROW_TYPES[@]}"; do
  if [[ "${ROW_TYPES[$i]}" == "detail" ]]; then
    DETAIL_IDX=$((DETAIL_IDX + 1))
    if ! $FIRST_DETAIL; then JSON+=','; fi
    FIRST_DETAIL=false

    JSON+='{"index":'$DETAIL_IDX
    JSON+=',"title":"'"$(escape_json "${ROW_TITLES[$i]}")"'"'
    JSON+=',"description":"'"$(escape_json "${ROW_DESCS[$i]}")"'"'
    JSON+=',"tasks":['

    # Find tasks belonging to this detail
    FIRST_TASK=true
    for j in "${!ROW_TYPES[@]}"; do
      if [[ "${ROW_TYPES[$j]}" == "task" ]]; then
        parent="${ROW_PARENTS[$j]}"
        if [[ "$parent" =~ ^Detail\ ([0-9]+)$ ]]; then
          ref="${BASH_REMATCH[1]}"
          if [[ $ref -eq $DETAIL_IDX ]]; then
            if ! $FIRST_TASK; then JSON+=','; fi
            FIRST_TASK=false
            JSON+='{"title":"'"$(escape_json "${ROW_TITLES[$j]}")"'"'
            JSON+=',"description":"'"$(escape_json "${ROW_DESCS[$j]}")"'"}'
          fi
        fi
      fi
    done

    JSON+=']}'
  fi
done

JSON+='],"summary":{"details":'$DETAIL_COUNT',"tasks":'$TASK_COUNT'}}'

echo "$JSON"
log_info "Parsed template: $DETAIL_COUNT Details, $TASK_COUNT Tasks"
