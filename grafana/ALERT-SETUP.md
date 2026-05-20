# Grafana Alert Rules Setup Guide

Step-by-step instructions for configuring all alert rules and contact points in **Grafana Cloud**.

---

## Prerequisites

- Grafana Cloud account with Loki and Mimir/Prometheus datasources already connected
- The `cantolico` app is deployed and sending logs/metrics
- Access to Grafana Cloud UI (https://grafana.com → My Account → Grafana)

---

## Step 1 — Set Up Contact Point (Email)

1. In the Grafana sidebar, go to **Alerting → Contact points**
2. Click **+ Add contact point**
3. Fill in:
   - **Name**: `Cantolico Alerts`
   - **Integration**: Email
   - **Addresses**: `migueldsantosmenezes@gmail.com`
4. Expand **Optional Email settings**:
   - **Subject**: `[Cantólico] {{ .GroupLabels.alertname }} — {{ .Status | toUpper }}`
   - **Message**: Leave as default (auto-renders alert details)
5. Click **Test** to send a test email, then **Save contact point**

### Set as Default
1. Go to **Alerting → Notification policies**
2. Edit the **Default policy**
3. Set **Default contact point** to `Cantolico Alerts`
4. Click **Save policy**

---

## Step 2 — Create Alert Rule: 5xx Errors

**Trigger**: More than 5 server-side errors per minute sustained for 5 minutes.

1. Go to **Alerting → Alert rules → + New alert rule**
2. **Rule name**: `Cantolico — High 5xx Error Rate`
3. **Rule type**: Grafana managed alert
4. **Datasource**: Loki
5. **Query A** (LogQL):
   ```logql
   sum(rate({app="cantolico",level="error",category="api"}[1m]))
   ```
6. **Expression B** (Reduce):
   - Function: `Last`
   - Input: `A`
7. **Expression C** (Threshold):
   - Input: `B`
   - IS ABOVE `5`
8. **Folder**: Create or select `Cantolico`
9. **Evaluation group**: `cantolico-api` (create new, interval `1m`)
10. **Pending period**: `5m` (fires only after 5 consecutive failing evaluations)
11. **Summary annotation**: `High 5xx error rate detected — check API logs`
12. **Runbook URL annotation**: *(optional)*
13. Click **Save rule and exit**

---

## Step 3 — Create Alert Rule: 4xx Spike

**Trigger**: More than 50 client-side errors per minute (sudden spike in bad requests / auth failures).

1. Go to **Alerting → Alert rules → + New alert rule**
2. **Rule name**: `Cantolico — 4xx Error Spike`
3. **Datasource**: Loki
4. **Query A** (LogQL):
   ```logql
   sum(rate({app="cantolico",level="warn",category="api"}[1m]))
   ```
5. **Expression B** (Reduce): Function `Last`, Input `A`
6. **Expression C** (Threshold): Input `B`, IS ABOVE `50`
7. **Evaluation group**: `cantolico-api` (interval `1m`)
8. **Pending period**: `2m`
9. **Summary annotation**: `Spike in 4xx errors — possible bad deployment or auth issue`
10. Click **Save rule and exit**

---

## Step 4 — Create Alert Rule: Slow Requests

**Trigger**: More than 10 slow requests (tagged `slow-request`) detected in the last 5 minutes.

1. Go to **Alerting → Alert rules → + New alert rule**
2. **Rule name**: `Cantolico — Slow Requests Spike`
3. **Datasource**: Loki
4. **Query A** (LogQL, set time range to **Last 5 minutes** in the query options):
   ```logql
   count_over_time({app="cantolico"} | json | tags=~".*slow-request.*" [5m])
   ```
5. **Expression B** (Reduce): Function `Last`, Input `A`
6. **Expression C** (Threshold): Input `B`, IS ABOVE `10`
7. **Evaluation group**: `cantolico-performance` (create new, interval `2m`)
8. **Pending period**: `0s` (fire immediately on first breach)
9. **Summary annotation**: `Multiple slow requests detected — check database or external API latency`
10. Click **Save rule and exit**

---

## Step 5 — Create Alert Rule: Security Events

**Trigger**: Any security-level log event — fires immediately without pending period.

1. Go to **Alerting → Alert rules → + New alert rule**
2. **Rule name**: `Cantolico — Security Event Detected`
3. **Datasource**: Loki
4. **Query A** (LogQL):
   ```logql
   sum(rate({app="cantolico",level="security"}[1m]))
   ```
5. **Expression B** (Reduce): Function `Last`, Input `A`
6. **Expression C** (Threshold): Input `B`, IS ABOVE `0`
7. **Evaluation group**: `cantolico-security` (create new, interval `1m`)
8. **Pending period**: `0s` — fires immediately on any security event
9. **Summary annotation**: `Security event logged — review security dashboard immediately`
10. **Labels**: add `severity=critical`
11. Click **Save rule and exit**

---

## Step 6 — Create Alert Rule: Healthcheck Down (Synthetic Monitoring)

**Trigger**: The `/api/health` endpoint returns non-200 or times out.

### Option A — Grafana Cloud Synthetic Monitoring (Recommended)

1. In Grafana Cloud, go to **Testing & Synthetics → Synthetics**
2. Click **+ Add check → HTTP**
3. Fill in:
   - **Job name**: `cantolico-healthcheck`
   - **Target URL**: `https://<your-domain>/api/health`  
     (e.g. `https://cantolico.vercel.app/api/health`)
   - **Frequency**: `60s`
   - **Timeout**: `10s`
4. Under **Validation**:
   - **HTTP Status**: `200`
   - **Response body check**: add check for `"status":"ok"` (optional but recommended)
5. Under **Labels**: add `app=cantolico`
6. Click **Save**

This automatically creates a `probe_success` metric. To alert on it:

1. Go to **Alerting → Alert rules → + New alert rule**
2. **Rule name**: `Cantolico — Healthcheck Down`
3. **Datasource**: Prometheus/Mimir
4. **Query A** (PromQL):
   ```promql
   probe_success{job="cantolico-healthcheck"} == 0
   ```
5. **Expression B** (Reduce): Function `Last`, Input `A`
6. **Expression C** (Threshold): Input `B`, IS ABOVE `0`
7. **Evaluation group**: `cantolico-uptime` (create new, interval `1m`)
8. **Pending period**: `2m` (allows transient failures)
9. **Summary annotation**: `Cantolico healthcheck is DOWN — /api/health returned non-200`
10. Click **Save rule and exit**

### Option B — Manual Uptime Check (if Synthetic Monitoring unavailable)

Use an external service (e.g. UptimeRobot, Betteruptime, or Cronitor) to monitor:
- URL: `https://<your-domain>/api/health`
- Expected HTTP status: `200`
- Expected response body contains: `"status"`
- Check interval: `1 minute`
- Alert email: `migueldsantosmenezes@gmail.com`

---

## Summary of Alert Rules

| Alert | Query Type | Threshold | Pending | Severity |
|-------|-----------|-----------|---------|----------|
| 5xx Errors | LogQL | > 5/min | 5m | warning |
| 4xx Spike | LogQL | > 50/min | 2m | warning |
| Slow Requests | LogQL | > 10 in 5m | immediate | warning |
| Security Events | LogQL | > 0/min | immediate | critical |
| Healthcheck Down | PromQL (synthetic) | probe_success == 0 | 2m | critical |

---

## Post-Merge: Install New OTel Packages

After merging to `main`, run the following to update the lockfile with new OpenTelemetry packages:

```bash
pnpm install
```

This regenerates `pnpm-lock.yaml` to include any new OTel/observability packages added to `package.json`. Commit the updated lockfile:

```bash
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml with new OTel packages"
```

---

## Verifying the Setup

After configuring alerts, trigger test events to confirm delivery:

1. **5xx test**: Make an API call to a non-existent route or temporarily introduce an error
2. **Security test**: Trigger an unauthorized access attempt (e.g. access an admin route without auth)
3. **Healthcheck test**: Temporarily point the health check URL to a non-existent endpoint

Check **Alerting → Alert rules** — rules should transition to `Pending` then `Firing` state, and email should arrive at `migueldsantosmenezes@gmail.com`.
