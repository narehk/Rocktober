# Bug Report: install.ps1 Fails on Windows (Encoding Issue)

**Repository:** southbendin/WorkSpaceFramework
**File:** `install.ps1`
**Date:** 2026-03-19
**Severity:** High — blocks the recommended install method on Windows

## Summary

The PowerShell installer (`install.ps1`) fails to parse on Windows due to Unicode character encoding issues. Em-dash characters (`—`, U+2014) in string literals are corrupted during execution, causing PowerShell to throw multiple parse errors and abort the install.

## Steps to Reproduce

1. Clone the repo:
   ```
   git clone --depth 1 https://github.com/southbendin/WorkSpaceFramework.git
   ```
2. Run the installer:
   ```powershell
   powershell -ExecutionPolicy Bypass -File install.ps1 -TargetDir "C:\path\to\project"
   ```
3. Installer fails immediately with parse errors.

The remote one-liner (`irm ... | iex`) would hit the same issue.

## Error Output

```
At install.ps1:205 char:64
+ if (-not (Test-Path "$TargetDir\.claude\settings.local.json")) {
+                                                                ~
Missing closing '}' in statement block or type definition.

At install.ps1:211 char:103
+ ... cal.json (local provider — run /setup to add provider permissions)"
+                                                                        ~
The Try statement is missing its Catch or Finally block.

At install.ps1:222 char:44
+ Write-Host "  .claude\rules\           (12 behavioral rules)"
+                                            ~~~~~~~~~~
Unexpected token 'behavioral' in expression or statement.

Not all parse errors were reported.  Correct the reported errors and try again.
```

## Root Cause

The script contains em-dash characters (`—`, U+2014) in several `Write-Host` string literals, e.g.:

```powershell
Write-Host "  .claude\work\            (work tracking — BOARD.md generated on first use)"
```

When PowerShell reads the file, these characters are decoded as `�?"` (replacement characters), which breaks string delimiters and causes a cascade of parse failures. This is likely a BOM/encoding mismatch — the file is UTF-8 but PowerShell may be reading it as Windows-1252 or another legacy encoding.

## Affected Lines

Lines containing em-dashes in `install.ps1` (approximate):

- Line ~211: `"local provider — run /setup to add provider permissions"`
- Line ~227: `"work tracking — BOARD.md generated on first use"`
- Line ~229: `"interaction analytics — sessions + insights"`

## Suggested Fix

**Option 1 (recommended):** Replace em-dash characters with ASCII-safe alternatives:

```powershell
# Before
Write-Host "  .claude\work\            (work tracking — BOARD.md generated on first use)"

# After
Write-Host "  .claude\work\            (work tracking - BOARD.md generated on first use)"
```

**Option 2:** Add a UTF-8 BOM to `install.ps1` so PowerShell correctly detects the encoding.

**Option 3:** Add encoding declaration at the top of the script or ensure the file is saved as UTF-8 with BOM.

## Workaround

Use the bash installer (`install.sh`) instead, which handles the encoding correctly:

```bash
git clone --depth 1 https://github.com/southbendin/WorkSpaceFramework.git /tmp/wsf-install
echo "Y" | bash /tmp/wsf-install/install.sh "C:\path\to\project"
rm -rf /tmp/wsf-install
```

This works on Windows via Git Bash, WSL, or any bash-compatible shell.

## Environment

- **OS:** Windows 11 Pro 10.0.26200
- **Shell:** PowerShell (via bash invocation)
- **Git:** Standard Git for Windows
