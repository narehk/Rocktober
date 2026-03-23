#!/usr/bin/env bash
# common.sh — Shared library for provider scripts
# Source this file: source "$(dirname "$0")/../lib/common.sh"

set -e
export PYTHONIOENCODING=utf-8
export MSYS_NO_PATHCONV=1

# --- Logging (structured, to stderr) ---

_SCRIPT_NAME="$(basename "${BASH_SOURCE[1]:-$0}" .sh)"

log_info()  { echo "level=info component=$_SCRIPT_NAME msg=\"$*\"" >&2; }
log_warn()  { echo "level=warn component=$_SCRIPT_NAME msg=\"$*\"" >&2; }
log_error() { echo "level=error component=$_SCRIPT_NAME msg=\"$*\"" >&2; }

# --- Argument helpers ---

usage_exit() {
  echo "Usage: $*" >&2
  exit 1
}

# --- Prerequisite checks ---

require_cmd() {
  local cmd="$1" label="${2:-$1}"
  if ! command -v "$cmd" &>/dev/null; then
    # On Windows, az may resolve as az.cmd
    if [[ "$cmd" == "az" ]] && command -v az.cmd &>/dev/null; then
      return 0
    fi
    log_error "$label not found. Install it before running this script."
    exit 1
  fi
}

check_az_auth() {
  require_cmd az "Azure CLI"
  if ! az account show --query user.name -o tsv &>/dev/null; then
    log_error "Azure CLI not authenticated. Run: az login"
    exit 1
  fi
}

check_gh_auth() {
  require_cmd gh "GitHub CLI"
  if ! gh auth status &>/dev/null; then
    log_error "GitHub CLI not authenticated. Run: gh auth login"
    exit 1
  fi
}

# --- JSON helpers (no python/node/jq dependency) ---

# Extract a field from JSON output
# json_field "id"        → first numeric value for "id" (e.g., 12345)
# json_field_str "title" → first string value for "title"
# Note: For ADO JSON, the top-level numeric "id" appears after nested GUID "id" fields,
# so json_field specifically matches numeric values to get the work item ID.
json_field() {
  local field="$1"
  grep -oP "\"${field}\":\\s*\\K[0-9]+" | head -1
}

json_field_str() {
  local field="$1"
  grep -oP "\"${field}\":\\s*\"\\K[^\"]*" | head -1
}

# --- CONTEXT.md field extraction ---

# Extract a **Field**: value from CONTEXT.md
# Usage: read_context_field "Organization"
read_context_field() {
  local field="$1"
  local context_file=".claude/skills/CONTEXT.md"
  if [[ ! -f "$context_file" ]]; then
    log_error "CONTEXT.md not found at $context_file"
    exit 1
  fi
  grep -oP "\\*\\*${field}\\*\\*:\\s*\\K.+" "$context_file" | head -1 | sed 's/^`//;s/`$//' | xargs
}

# --- ADO defaults ---

# Read org from CONTEXT.md and set as default for az commands
get_ado_org() {
  local org
  org="$(read_context_field "Organization")"
  if [[ -z "$org" ]]; then
    log_error "Organization not found in CONTEXT.md"
    exit 1
  fi
  echo "$org"
}

get_ado_project() {
  local project
  project="$(read_context_field "Project")"
  if [[ -z "$project" ]]; then
    log_error "Project not found in CONTEXT.md"
    exit 1
  fi
  echo "$project"
}
