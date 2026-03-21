# Monitoring & Observability

## Core Principle

**If it runs in production, it should be observable.** Every scheduled job, external integration, and user-facing service needs appropriate monitoring. The type and depth of monitoring scales with the risk and criticality of the component.

## When Monitoring Is Required

| Trigger | Monitor Type | Approach |
|---------|-------------|----------|
| Scheduled job or script | Telemetry (start/complete/fail) | `/cronitor` — job monitor |
| Background worker or long-running process | Heartbeat (periodic alive signal) | `/cronitor` — heartbeat monitor |
| Data pipeline or ETL | Checkpoint telemetry | `/cronitor` — job monitor with stage messages |
| External API integration | Error tracking + health check | Structured logging + alerting |
| User-facing service or endpoint | Uptime + latency | Health check endpoint + monitoring |
| New deployment or release | Smoke test | Health endpoint verification post-deploy |
| Authentication or security boundary | Audit logging | Structured log with actor, action, resource |

## Decision Framework

```
Is it a discrete job with start/end?
├─ Yes → /cronitor job monitor
└─ No
    Is it a long-running worker?
    ├─ Yes → /cronitor heartbeat monitor
    └─ No
        Is it an external dependency?
        ├─ Yes → Health check + error rate logging
        └─ No
            Is it user-facing?
            ├─ Yes → Health endpoint + uptime monitoring
            └─ No → Structured logging (minimum baseline)
```

## Monitoring Tiers

Not everything needs the same depth. Match monitoring investment to risk:

| Tier | Criteria | Monitoring Level |
|------|----------|-----------------|
| **Critical** | Downtime = service outage, data loss, or security breach | Full telemetry + alerting + health checks + audit logging |
| **Important** | Failure degrades user experience or delays work | Telemetry + error alerting |
| **Standard** | Internal tooling, batch jobs, utilities | Telemetry (start/complete/fail) |
| **Low** | Development tools, one-off scripts | Structured logging only |

## Logging Standards

### Structured Logging

All production logs should be structured (JSON or key=value), not free-text:

```
# Good
level=info component=auth action=login user_id=123 status=success duration_ms=45

# Bad
User 123 logged in successfully in 45ms
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| **error** | Something failed that needs attention. A user was affected or data is at risk. |
| **warn** | Something unexpected happened but was handled. May need attention if recurring. |
| **info** | Normal operations worth recording: requests served, jobs completed, config loaded. |
| **debug** | Detailed diagnostic info. Off in production unless actively troubleshooting. |

### What to Log

- **Always**: Errors with context (what failed, what was attempted, relevant IDs)
- **Always**: Job/pipeline start, completion, and failure with duration
- **Always**: Authentication events (login, logout, failed attempts)
- **When relevant**: External API calls (endpoint, status code, duration)
- **When relevant**: Configuration changes, feature flag toggles

### What to Redact

- Passwords, tokens, API keys, secrets
- PII beyond what's needed for the log's purpose (full SSN, full credit card)
- Request/response bodies containing sensitive data

Use environment-appropriate redaction — stricter in production, relaxed in development.

## Health Check Pattern

Services should expose a health endpoint that reports:

- **Status**: healthy / degraded / unhealthy
- **Dependencies**: status of each external dependency (database, cache, APIs)
- **Timestamp**: when the check was performed

Health checks should be:
- Fast (< 2 seconds)
- Non-destructive (read-only, no side effects)
- Honest (report actual state, not cached results)

## When Monitoring Is NOT Required

- Local development scripts not intended for production
- One-time migration scripts (log output is sufficient)
- Tests and test fixtures
- Static documentation or config files

## Integration with Other Rules

- **`/cronitor` command** — The primary tool for job and heartbeat telemetry implementation. Use `/cronitor verify` to confirm monitors are receiving data, `/cronitor status` to check health, and `/cronitor list` to audit coverage gaps.
- **`expert-devops` skill** — Owns monitoring architecture and tooling decisions. This rule defines the standards; devops designs the solution.
- **`expert-security` skill** — Guides audit logging and security monitoring
- **documentation-standards.md** — Monitoring setup should be documented for each service

See REGISTRY.md "Responsibility Boundaries" for the monitoring triad: `expert-devops` designs → this rule enforces standards → `/cronitor` implements telemetry.

## Anti-Patterns

**Monitoring as afterthought**: "We'll add monitoring after launch" (failures happen on day one)

**Alert fatigue**: Alerting on everything so nothing gets attention. Alert on actionable conditions only.

**Silent failures**: Jobs that fail without anyone knowing. Every job needs a fail signal.

**Log and forget**: Writing logs that nobody reads and no system processes. Logs without a consumer are noise.

**Sensitive data in logs**: Logging full request bodies, tokens, or PII. Redact first.
