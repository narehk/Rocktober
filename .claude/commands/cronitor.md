# Cronitor Command

Add Cronitor telemetry monitoring to an existing codebase, verify monitors are working, and audit monitoring coverage.

## Usage

```bash
/cronitor <telemetry-url>           # Add telemetry to a job (existing behavior)
/cronitor status                    # List all monitors and their current state
/cronitor status <monitor-key>      # Detailed status for a specific monitor
/cronitor verify                    # Verify all monitors are receiving data
/cronitor verify <monitor-key>      # Verify a specific monitor
/cronitor list                      # Scan codebase for Cronitor instrumentation and coverage gaps
```

## Arguments

- `$ARGUMENTS` — A Cronitor telemetry URL for adding monitoring, OR a subcommand (`status`, `verify`, `list`)

## Instructions

You are adding Cronitor observability to an existing job, script, or integration. Follow these steps:

### Step 1: Analyze the codebase

Before writing any code, examine the relevant files to understand:

1. **What kind of process is this?** Choose the right monitor type:
   - **Job monitor** — discrete executions with a clear start and end (ETL scripts, scheduled functions, cron jobs, orchestrations, Power Automate flows). Uses lifecycle states: `run`, `complete`, `fail`.
   - **Heartbeat monitor** — long-running workers or loops that should emit a periodic "I'm alive" signal. Alerts when pings stop arriving.
   - **Both** — use a Job monitor for execution timeline and a Heartbeat monitor for scheduler health when the trigger mechanism itself needs monitoring.

2. **What language/runtime is in use?**
   - Python → use the Cronitor Python SDK pattern
   - JavaScript/Node.js → use the raw HTTPS ping pattern (or SDK if available)
   - Power Automate → use HTTP action with query string parameters (POST bodies are ignored by Cronitor telemetry)
   - Other → use raw HTTP GET pings to the telemetry URL

3. **What are the meaningful steps?** Identify 3–6 coarse checkpoints that would appear as Event rows in the Cronitor timeline (e.g., "Fetch source data", "Transform", "Load to SQL", "Send notification").

### Step 2: Determine the series strategy

Pick the right series (run correlation ID) for the runtime:

- **Durable Functions** → `context.df.instanceId`
- **Power Automate** → `workflow().run.name`
- **Python / Task Scheduler** → `f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:8]}"`
- **Node.js** → `` `run-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}` ``

Generate the series **once** at the start of each run and pass it through to every ping.

### Step 3: Implement the monitoring

Apply the pattern appropriate to the runtime. Every ping must include the same `series`. Place parameters in the **query string**, not POST body.

#### Python pattern (SDK preferred)

```python
import cronitor
# Set api_key from environment or config
cronitor.api_key = CRONITOR_API_KEY
monitor = cronitor.Monitor(MONITOR_KEY)  # extract key from the provided URL

SERIES = f"run-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:8]}"

def ping(*, state=None, message=None):
    kwargs = {"series": SERIES}
    if state: kwargs["state"] = state
    if message: kwargs["message"] = message
    try:
        monitor.ping(**kwargs)
    except Exception as e:
        logging.warning(f"Cronitor ping failed: {e}")

# Usage
ping(state="run", message="Started")
ping(message="Step: fetch source data")      # message-only = Event row
ping(message="Step: transform - Rows=532")
ping(state="complete", message="Completed successfully")
# In except: ping(state="fail", message=f"Failed: {e}")
```

#### Node.js pattern (raw HTTPS)

```javascript
const CRONITOR_PING_URL = process.env.CRONITOR_PING_URL; // full telemetry URL

function ping({ state, series, message }) {
  const url = new URL(CRONITOR_PING_URL);
  if (state)   url.searchParams.set("state", state);
  if (series)  url.searchParams.set("series", series);
  if (message) url.searchParams.set("message", message);
  return new Promise((resolve) => {
    require("https").get(url, (res) => { res.resume(); resolve(); }).on("error", resolve);
  });
}
```

#### Power Automate pattern (HTTP action query string)

```
Start:    GET .../MONITOR?state=run&series=<runid>&message=Started
Step:     GET .../MONITOR?series=<runid>&message=Step+name
Complete: GET .../MONITOR?state=complete&series=<runid>&message=Completed
Fail:     GET .../MONITOR?state=fail&series=<runid>&message=Failed:+<error>
```

### Step 4: Message format

Use a consistent, scannable format for step messages:

```
StepName - key=value key=value
```

Examples:
- `Fetch Smartsheet rows - SheetID=4821`
- `Transform complete - RowsIn=1200 RowsOut=532`
- `SQL load complete - Table=dbo.Transactions Rows=532`
- `Failed: Connection timeout after 30s`

### Step 5: Store the URL securely

- Never hard-code the telemetry URL or API key in source files
- Store as an environment variable, Azure Key Vault secret, or app config entry
- Recommended variable names: `CRONITOR_PING_URL`, `CRONITOR_API_KEY`, `CRONITOR_MONITOR_KEY`
- Document the variable name in the project README or `.env.example`

### Step 6: Verify placement

Confirm the final implementation satisfies these checks:

- [ ] `state=run` fires at the very beginning, before any work
- [ ] `state=complete` fires only after all work succeeds
- [ ] `state=fail` fires in the top-level exception/error handler so no failure goes unreported
- [ ] Every ping uses the **same** `series` value for the current run
- [ ] Step pings use **message only** (no `state`) so they appear as Event rows, not lifecycle transitions
- [ ] Ping failures are caught and logged but do not crash the job
- [ ] The telemetry URL comes from an environment variable, not hard-coded

### Reference: Monitor URL provided

The telemetry URL passed as `$ARGUMENTS` is the base URL for all pings. Append query parameters as needed:

```
$ARGUMENTS?state=run&series=<series>&message=Started
```

If using the Python SDK, extract the monitor key from the URL path and set `cronitor.api_key` separately via environment variable.

---

## `/cronitor status` — Monitor Status

Fetch and display monitor status from the Cronitor API.

### Prerequisites

- **API key**: Must be available as `CRONITOR_API_KEY` environment variable, or in `.env` file, or in CONTEXT.md under Environment Variables. If not found, display: "Cronitor API key not found. Set `CRONITOR_API_KEY` environment variable or add it to `.env`."

### `/cronitor status` (all monitors)

1. **Resolve API key** — Check `$CRONITOR_API_KEY`, then `.env` file, then CONTEXT.md
2. **Fetch monitors** — `curl -s -u "$CRONITOR_API_KEY:" "https://cronitor.io/api/monitors?page=1"`
3. **Parse response** — Extract monitor list from JSON
4. **Display summary table**:

   ```
   Cronitor Monitors

   | Monitor | Type | Status | Last Ping | Next Expected |
   |---------|------|--------|-----------|---------------|
   | my-etl-job | job | healthy | 2 hours ago | in 22 hours |
   | worker-heartbeat | heartbeat | healthy | 5 min ago | in 5 min |
   | nightly-backup | job | failing | 3 days ago | overdue |

   3 monitors: 2 healthy, 1 failing
   ```

5. **Status mapping**:
   - `0` or `healthy` → **healthy**
   - `1` or `failing` → **failing**
   - `2` or `not_yet_run` → **not yet run**
   - `3` or `paused` → **paused**

### `/cronitor status <monitor-key>` (single monitor)

1. **Fetch monitor** — `curl -s -u "$CRONITOR_API_KEY:" "https://cronitor.io/api/monitors/<monitor-key>"`
2. **Display detailed status**:

   ```
   Monitor: my-etl-job
   Type: job
   Status: healthy

   Last Ping: 2026-03-06T14:30:00Z (2 hours ago)
   Last State: complete
   Last Duration: 45s

   Schedule: Every 24 hours
   Next Expected: 2026-03-07T12:00:00Z

   Recent Events (last 5):
     2026-03-06 12:00 — complete (45s) "Load complete - Rows=1200"
     2026-03-05 12:00 — complete (42s) "Load complete - Rows=1180"
     2026-03-04 12:01 — complete (50s) "Load complete - Rows=1250"

   Alert Recipients: ops@example.com
   Dashboard: https://cronitor.io/app/monitors/my-etl-job
   ```

3. **If monitor not found**: "Monitor `<monitor-key>` not found. Run `/cronitor status` to see all monitors."

### Error Handling

- **401 Unauthorized**: "Invalid API key. Check `CRONITOR_API_KEY` value."
- **Network error**: "Could not reach Cronitor API. Check network connectivity."
- **Rate limit (429)**: "Cronitor API rate limit reached. Try again in a moment."

---

## `/cronitor verify` — Verify Monitors

Confirm monitors are actively receiving telemetry data. Useful after adding monitoring to verify the integration is working.

### `/cronitor verify` (all monitors)

1. **Resolve API key** (same as status)
2. **Fetch all monitors** with recent activity
3. **For each monitor, classify health**:
   - **Receiving**: Last ping within expected interval → pass
   - **Late**: Last ping beyond expected interval but < 2x → warning
   - **Silent**: No pings in > 2x expected interval, or never pinged → fail
   - **Failing**: Last state was `fail` → fail

4. **Display verification report**:

   ```
   Cronitor Verification Report

   PASS  my-etl-job — last ping 2h ago, healthy
   PASS  worker-heartbeat — last ping 5m ago, healthy
   WARN  data-sync — last ping 26h ago (expected every 24h)
   FAIL  nightly-backup — last ping 3d ago, overdue
   FAIL  new-monitor — never pinged (created 2d ago)

   Results: 2 pass, 1 warning, 2 failing
   ```

5. **If all pass**: "All monitors verified — telemetry is flowing."
6. **If any fail**: "Some monitors need attention. Check the failing monitors above."

### `/cronitor verify <monitor-key>` (single monitor)

1. **Fetch monitor and recent pings**
2. **Run the same health classification**
3. **Display detailed verification**:

   ```
   Verifying: my-etl-job

   Status: PASS
   Last ping: 2h ago (state=complete)
   Expected interval: 24h
   Last 24h: 1 run, 0 failures
   Last 7d: 7 runs, 0 failures

   Telemetry is flowing correctly.
   ```

---

## `/cronitor list` — Coverage Audit

Scan the codebase for Cronitor telemetry instrumentation and identify coverage gaps.

### Steps

1. **Scan codebase for Cronitor patterns** — Search for:
   - `cronitor.link` or `cronitor.io` URLs
   - `cronitor.Monitor` (Python SDK)
   - `CRONITOR_PING_URL` or `CRONITOR_API_KEY` or `CRONITOR_MONITOR_KEY` references
   - Import/require of `cronitor` package

2. **Group findings by file** — For each instrumented file:
   - File path
   - Monitor key (extracted from URL or SDK call)
   - Type detected (job lifecycle pings vs heartbeat pings)
   - States found (run/complete/fail/message-only)

3. **Fetch monitors from API** (if API key available) — Cross-reference:
   - **Instrumented + has monitor**: Matched — working correctly
   - **Instrumented + no monitor**: Orphaned code — telemetry URL may be invalid or monitor was deleted
   - **No code + has monitor**: Orphaned monitor — code may have been removed but monitor still exists

4. **Scan for unmonitored jobs** — Look for patterns that suggest scheduled/background work:
   - Cron expressions in config files
   - `setInterval`, `setTimeout` in long-running workers
   - Task scheduler XML files
   - `@scheduled`, `@cron`, `TimerTrigger` decorators
   - CI/CD scheduled triggers
   - `celery`, `bull`, `agenda`, `node-cron` usage

5. **Display coverage report**:

   ```
   Cronitor Coverage Report

   Instrumented (3):
     src/jobs/etl.py — my-etl-job (job: run/complete/fail)
     src/workers/sync.js — data-sync (heartbeat)
     src/jobs/backup.py — nightly-backup (job: run/complete/fail)

   Orphaned monitors (API has monitor, no code found):
     weekly-report — no matching instrumentation in codebase

   Unmonitored jobs (code has scheduled work, no Cronitor):
     src/workers/cleanup.js — uses setInterval (60000ms), no telemetry
     .github/workflows/deploy.yml — scheduled cron: "0 2 * * *", no telemetry

   Coverage: 3/5 scheduled jobs instrumented (60%)
   ```

6. **If no API key**: Skip the cross-reference steps (2-3) and only report what's found in code:

   ```
   Cronitor Coverage Report (code scan only — no API key for cross-reference)

   Instrumented (3):
     src/jobs/etl.py — cronitor.link/p/.../my-etl-job
     ...

   Unmonitored jobs:
     src/workers/cleanup.js — uses setInterval, no telemetry

   Set CRONITOR_API_KEY to enable full cross-reference with Cronitor dashboard.
   ```

---

## Subcommand Routing

When `$ARGUMENTS` is provided, determine the subcommand:

1. **If `$ARGUMENTS` starts with `status`**: Route to `/cronitor status`
2. **If `$ARGUMENTS` starts with `verify`**: Route to `/cronitor verify`
3. **If `$ARGUMENTS` starts with `list`**: Route to `/cronitor list`
4. **If `$ARGUMENTS` starts with `http`**: Route to the existing telemetry instrumentation flow (Steps 1-6 above)
5. **Otherwise**: Display usage help

---

## Important

- **Query string only**: Cronitor telemetry ignores POST bodies — all parameters must go in the query string
- **Series consistency**: Generate the series ID once at run start and reuse it for every ping in that run
- **Non-blocking pings**: Ping failures must be caught and logged but must never crash the job
- **No hard-coded secrets**: Telemetry URLs and API keys must come from environment variables or secret stores
- **API key for status/verify/list**: The `CRONITOR_API_KEY` is required for API operations. Store in `.env` or environment variable. The telemetry URL (used for adding monitoring) is separate from the API key (used for reading status).
