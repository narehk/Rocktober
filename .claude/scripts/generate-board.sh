#!/usr/bin/env bash
# generate-board.sh — Regenerate BOARD.md from work item files
# Usage: bash .claude/scripts/generate-board.sh [work-dir]
#   work-dir defaults to .claude/work

set -e

WORK_DIR="${1:-.claude/work}"
ITEMS_DIR="$WORK_DIR/items"
ARCHIVE_DIR="$WORK_DIR/archive"
BOARD_FILE="$WORK_DIR/BOARD.md"

# Collect all .md files (skip .gitkeep and non-md)
files=()
for f in "$ITEMS_DIR"/W-*.md "$ARCHIVE_DIR"/W-*.md; do
  [ -f "$f" ] && files+=("$f")
done

if [ ${#files[@]} -eq 0 ]; then
  cat > "$BOARD_FILE" <<'EOF'
# Work Board

## Captured
| ID | Title | Category | Project | Assigned | Added |
|----|-------|----------|---------|----------|-------|

## Shaping
| ID | Title | Category | Project | Assigned | Added |
|----|-------|----------|---------|----------|-------|

## Ready
| ID | Title | Category | Project | Assigned | Added |
|----|-------|----------|---------|----------|-------|

## In Progress
| ID | Title | Category | Project | Assigned | Added | Blocked |
|----|-------|----------|---------|----------|-------|---------|

## In Review
| ID | Title | Category | Project | Assigned | Added | Blocked |
|----|-------|----------|---------|----------|-------|---------|

## Done (Recent)
| ID | Title | Category | Project | Assigned | Completed |
|----|-------|----------|---------|----------|-----------|

## Skipped
| ID | Title | Category | Project | Assigned | Resolution |
|----|-------|----------|---------|----------|------------|
EOF
  echo "Board regenerated — 0 active, 0 archived" >&2
  exit 0
fi

# Use awk to parse all files and produce sorted TSV rows per section
awk '
BEGIN {
  FS = "\n"
  captured_n = 0; shaping_n = 0; ready_n = 0
  inprogress_n = 0; inreview_n = 0; done_n = 0; skipped_n = 0
}

FNR == 1 {
  # Reset per-file vars
  id = ""; title = ""; status = ""; category = ""; project = ""
  assigned = ""; added = ""; blocked = ""; completed = ""; resolution = ""
  in_header = 1
  # Extract ID from filename
  n = split(FILENAME, parts, "/")
  fname = parts[n]
  gsub(/\.md$/, "", fname)
  id = fname
}

{
  line = $0
  # Strip carriage returns
  gsub(/\r/, "", line)

  # Parse H1 for title: "# W-NNN: Title text"
  if (line ~ /^# W-[0-9]+:/) {
    sub(/^# W-[0-9]+:[[:space:]]*/, "", line)
    title = line
    next
  }

  # Stop parsing metadata at first ## heading (body content starts)
  if (line ~ /^## /) {
    in_header = 0
  }

  # Only parse metadata fields in the header section
  if (!in_header) next

  if (line ~ /^\*\*Status\*\*:/) {
    val = line; sub(/^\*\*Status\*\*:[[:space:]]*/, "", val)
    status = val
  }
  if (line ~ /^\*\*Category\*\*:/) {
    val = line; sub(/^\*\*Category\*\*:[[:space:]]*/, "", val)
    category = val
  }
  if (line ~ /^\*\*Project\*\*:/) {
    val = line; sub(/^\*\*Project\*\*:[[:space:]]*/, "", val)
    project = val
  }
  if (line ~ /^\*\*Assigned\*\*:/) {
    val = line; sub(/^\*\*Assigned\*\*:[[:space:]]*/, "", val)
    assigned = val
  }
  if (line ~ /^\*\*Added\*\*:/) {
    val = line; sub(/^\*\*Added\*\*:[[:space:]]*/, "", val)
    added = val
  }
  if (line ~ /^\*\*Blocked By\*\*:/) {
    val = line; sub(/^\*\*Blocked By\*\*:[[:space:]]*/, "", val)
    blocked = val
  }
  if (line ~ /^\*\*Completed\*\*:/) {
    val = line; sub(/^\*\*Completed\*\*:[[:space:]]*/, "", val)
    completed = val
  }
  if (line ~ /^\*\*Resolution\*\*:/) {
    val = line; sub(/^\*\*Resolution\*\*:[[:space:]]*/, "", val)
    resolution = val
  }
}

ENDFILE {
  if (status == "captured") {
    captured[captured_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" added
  } else if (status == "shaping") {
    shaping[shaping_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" added
  } else if (status == "ready") {
    ready[ready_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" added
  } else if (status == "in-progress") {
    inprogress[inprogress_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" added "\t" blocked
  } else if (status == "in-review") {
    inreview[inreview_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" added "\t" blocked
  } else if (status == "done") {
    c = (completed != "") ? completed : added
    done_items[done_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" c
  } else if (status == "skipped") {
    skipped[skipped_n++] = id "\t" title "\t" category "\t" project "\t" assigned "\t" resolution "\t" added
  }
}

END {
  # Sort helper: simple insertion sort by date field
  # For active sections: sort by Added (field index 5, 0-based) ascending
  # For done: sort by Completed (field 5) descending
  # For skipped: sort by Added (field 6) ascending

  # --- Captured ---
  sort_asc(captured, captured_n, 6)
  # --- Shaping ---
  sort_asc(shaping, shaping_n, 6)
  # --- Ready ---
  sort_asc(ready, ready_n, 6)
  # --- In Progress ---
  sort_asc(inprogress, inprogress_n, 6)
  # --- In Review ---
  sort_asc(inreview, inreview_n, 6)
  # --- Done (descending by completed date) ---
  sort_desc(done_items, done_n, 6)
  # --- Skipped (ascending by added date, field 7) ---
  sort_asc(skipped, skipped_n, 7)

  # Print board
  print "# Work Board"
  print ""

  # Captured
  print "## Captured"
  print "| ID | Title | Category | Project | Assigned | Added |"
  print "|----|-------|----------|---------|----------|-------|"
  for (i = 0; i < captured_n; i++) {
    split(captured[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6]
  }
  print ""

  # Shaping
  print "## Shaping"
  print "| ID | Title | Category | Project | Assigned | Added |"
  print "|----|-------|----------|---------|----------|-------|"
  for (i = 0; i < shaping_n; i++) {
    split(shaping[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6]
  }
  print ""

  # Ready
  print "## Ready"
  print "| ID | Title | Category | Project | Assigned | Added |"
  print "|----|-------|----------|---------|----------|-------|"
  for (i = 0; i < ready_n; i++) {
    split(ready[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6]
  }
  print ""

  # In Progress
  print "## In Progress"
  print "| ID | Title | Category | Project | Assigned | Added | Blocked |"
  print "|----|-------|----------|---------|----------|-------|---------|"
  for (i = 0; i < inprogress_n; i++) {
    split(inprogress[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6], f[7]
  }
  print ""

  # In Review
  print "## In Review"
  print "| ID | Title | Category | Project | Assigned | Added | Blocked |"
  print "|----|-------|----------|---------|----------|-------|---------|"
  for (i = 0; i < inreview_n; i++) {
    split(inreview[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6], f[7]
  }
  print ""

  # Done (Recent)
  print "## Done (Recent)"
  print "| ID | Title | Category | Project | Assigned | Completed |"
  print "|----|-------|----------|---------|----------|-----------|"
  for (i = 0; i < done_n; i++) {
    split(done_items[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6]
  }
  print ""

  # Skipped
  print "## Skipped"
  print "| ID | Title | Category | Project | Assigned | Resolution |"
  print "|----|-------|----------|---------|----------|------------|"
  for (i = 0; i < skipped_n; i++) {
    split(skipped[i], f, "\t")
    printf "| %s | %s | %s | %s | %s | %s |\n", f[1], f[2], f[3], f[4], f[5], f[6]
  }

  active = captured_n + shaping_n + ready_n + inprogress_n + inreview_n
  archived = done_n + skipped_n
  printf "Board regenerated — %d active, %d archived\n", active, archived > "/dev/stderr"
}

# Sort ascending by date (field nfields), tiebreak by ID ascending (field 1)
function sort_asc(arr, n, nfields,    i, j, tmp, ai, aj) {
  for (i = 1; i < n; i++) {
    tmp = arr[i]
    split(tmp, ai, "\t")
    j = i - 1
    while (j >= 0) {
      split(arr[j], aj, "\t")
      if (aj[nfields] > ai[nfields] || (aj[nfields] == ai[nfields] && aj[1] > ai[1])) {
        arr[j+1] = arr[j]
        j--
      } else break
    }
    arr[j+1] = tmp
  }
}

# Sort descending by date (field nfields), tiebreak by ID descending (field 1)
function sort_desc(arr, n, nfields,    i, j, tmp, ai, aj) {
  for (i = 1; i < n; i++) {
    tmp = arr[i]
    split(tmp, ai, "\t")
    j = i - 1
    while (j >= 0) {
      split(arr[j], aj, "\t")
      if (aj[nfields] < ai[nfields] || (aj[nfields] == ai[nfields] && aj[1] < ai[1])) {
        arr[j+1] = arr[j]
        j--
      } else break
    }
    arr[j+1] = tmp
  }
}
' "${files[@]}" > "$BOARD_FILE"
