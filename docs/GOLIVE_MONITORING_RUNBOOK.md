# 📊 POST-DEPLOY MONITORING RUNBOOK

# Evolution WhatsApp Integration - First Hour

**Duration:** 60 minutes post-deployment  
**Frequency:** Every 10 minutes  
**Escalation:** If 2+ critical issues detected

---

## ⏰ MONITORING SCHEDULE

| Time         | Action              | Expected Result        |
| ------------ | ------------------- | ---------------------- |
| T+0 (Deploy) | Deployment complete | ✅ Server running      |
| T+5min       | Quick health check  | ✅ /health returns 200 |
| T+10min      | **Checkpoint 1**    | See below              |
| T+20min      | **Checkpoint 2**    | See below              |
| T+30min      | **Checkpoint 3**    | See below              |
| T+60min      | **Final Review**    | GO/NO-GO decision      |

---

## 🔍 CHECKPOINT 1 (T+10min)

### 1. HTTP Status Codes

```bash
# Check for unexpected 5xx errors
grep "HTTP.*5[0-9][0-9]" /var/log/app.log | tail -20

# Expected: 0-2 errors (acceptable during deploy restart)
# Alert if: > 5 errors
```

**Thresholds:**

- ✅ **OK:** 0-2 errors
- ⚠️ **Warning:** 3-5 errors
- 🚨 **Critical:** > 5 errors → Investigate immediately

### 2. Authentication Errors

```bash
# Check for abnormal 401/403 rates
grep "401\|403" /var/log/app.log | wc -l

# Expected: < 10 (normal failed login attempts)
# Alert if: > 50 (possible auth misconfiguration)
```

**Thresholds:**

- ✅ **OK:** < 10 errors
- ⚠️ **Warning:** 10-50 errors
- 🚨 **Critical:** > 50 → Check JWT_ACCESS_SECRET is set correctly

### 3. WhatsApp Webhook Health

```bash
# Check unknown instance warnings
grep "unknown_instance" /var/log/app.log | wc -l

# Expected: 0-1 (acceptable if old instance exists)
# Alert if: > 5 (webhook secret or routing issue)
```

**Thresholds:**

- ✅ **OK:** 0-1 warnings
- ⚠️ **Warning:** 2-5 warnings
- 🚨 **Critical:** > 5 → Verify EVOLUTION_API_URL and webhook secrets

### 4. Secret Masking Verification

```bash
# Verify secrets are masked
grep "\[MASKED\]" /var/log/app.log | head -5

# Expected: Multiple entries showing masked secrets
# Alert if: No entries (masking not working)
```

```bash
# Check for UNmasked secrets (should be ZERO)
grep -E "(sk-|eyJhbGciOiJ|Bearer [a-zA-Z0-9]{20,})" /var/log/app.log | grep -v "Authorization: Bearer \[MASKED\]"

# Expected: 0 results
# Alert if: ANY results → Security issue!
```

---

## 🔍 CHECKPOINT 2 (T+20min)

### 5. Message Processing Rate

```bash
# Count messages processed in last 10 minutes
grep "\[Message.*created\|sent\|received\]" /var/log/app.log | grep "$(date -d '10 minutes ago' '+%Y-%m-%d %H:')" | wc -l

# Expected: Depends on traffic (may be 0 if no activity)
# Alert if: Error rate > 10% of total messages
```

### 6. Retry Attempts

```bash
# Check outbound retry attempts
grep "Retry.*attempt" /var/log/app.log | tail -10

# Expected: Few or none (< 5)
# Alert if: > 20 retries (Evolution API or network issues)
```

**Thresholds:**

- ✅ **OK:** 0-5 retries
- ⚠️ **Warning:** 6-20 retries (monitor Evolution API health)
- 🚨 **Critical:** > 20 → Check EVOLUTION_API_URL connectivity

### 7. Database Performance

```sql
-- Run in Supabase SQL Editor
SELECT
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_changes
FROM pg_stat_user_tables
WHERE tablename IN ('messages', 'unit_whatsapp_connections', 'campaign_recipients')
ORDER BY total_changes DESC;

-- Expected: Changes aligned with traffic
-- Alert if: No changes despite user activity (DB connection issue)
```

### 8. Connection Status Stability

```sql
-- Check for connection flapping (disconnect/reconnect cycles)
SELECT
    unit_id,
    status,
    connected_at,
    disconnected_at,
    CASE
        WHEN connected_at > disconnected_at THEN 'stable'
        WHEN disconnected_at > connected_at THEN 'DISCONNECTED'
        ELSE 'unknown'
    END as stability
FROM unit_whatsapp_connections
WHERE status = 'connected' OR status = 'disconnected'
ORDER BY updated_at DESC
LIMIT 10;

-- Expected: Most connections show 'stable'
-- Alert if: Multiple 'DISCONNECTED' (Evolution API stability issue)
```

---

## 🔍 CHECKPOINT 3 (T+30min)

### 9. Inbound Message Flow

```bash
# Check if inbound messages are arriving
grep "Webhook.*Message created" /var/log/app.log | tail -10

# Expected: Messages arriving if users are active
# Alert if: Zero messages despite known activity (webhook routing issue)
```

**Test manually if needed:**

```bash
# Send a WhatsApp message to the connected number
# Then check logs within 5 seconds:
grep "Message created" /var/log/app.log | tail -1

# Expected: New log entry appears
# Alert if: No entry → Webhook not configured or BASE_URL incorrect
```

### 10. Outbound Message Success Rate

```sql
-- Check outbound success rate (last hour)
SELECT
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM messages
WHERE sender = 'agent'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;

-- Expected:
-- sent: > 90%
-- failed: < 5%
-- queued/pending: < 5%

-- Alert if: failed > 10% (Evolution API issues or retry logic problem)
```

### 11. Campaign Performance

```sql
-- Check active campaigns
SELECT
    c.name,
    c.status,
    COUNT(cr.id) as total_recipients,
    SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) as sent,
    SUM(CASE WHEN cr.status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) as pending
FROM campaigns c
LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
WHERE c.created_at > NOW() - INTERVAL '1 hour'
GROUP BY c.id, c.name, c.status
ORDER BY c.created_at DESC;

-- Expected: sent + failed ~= total_recipients (for completed campaigns)
-- Alert if: Large number stuck in pending (worker not running)
```

### 12. Rate Limiting Status

```bash
# Check for 429 (Too Many Requests) responses
grep "429" /var/log/app.log | wc -l

# Expected: 0-5 (occasional rate limit hits are OK)
# Alert if: > 20 (possible abuse or misconfigured client)
```

---

## 🔍 FINAL REVIEW (T+60min)

### 13. Overall Health Metrics

```bash
# Generate summary report
echo "=== GO-LIVE HOUR 1 SUMMARY ==="
echo "Total 5xx errors: $(grep 'HTTP.*5[0-9][0-9]' /var/log/app.log | wc -l)"
echo "Total 401/403: $(grep '401\|403' /var/log/app.log | wc -l)"
echo "Unknown instances: $(grep 'unknown_instance' /var/log/app.log | wc -l)"
echo "Message retries: $(grep 'Retry.*attempt' /var/log/app.log | wc -l)"
echo "429 rate limits: $(grep '429' /var/log/app.log | wc -l)"
echo "Messages processed: $(grep 'Message.*created\|sent' /var/log/app.log | wc -l)"
```

**Decision Matrix:**

| Metric            | OK   | Warning | Critical |
| ----------------- | ---- | ------- | -------- |
| 5xx errors        | 0-5  | 6-15    | > 15     |
| 401/403           | < 20 | 20-50   | > 50     |
| Unknown instances | 0-2  | 3-5     | > 5      |
| Retries           | 0-10 | 11-30   | > 30     |
| 429 rate limits   | 0-5  | 6-20    | > 20     |

**GO/NO-GO Decision:**

- ✅ **GO:** All metrics in OK range → Continue monitoring (reduce to every 1 hour)
- ⚠️ **MONITOR:** 1-2 warnings → Continue monitoring every 15 minutes for next 2 hours
- 🚨 **NO-GO:** 1+ critical OR 3+ warnings → Execute rollback

---

## 🚨 INCIDENT RESPONSE PROCEDURES

### ISSUE 1: Status Not Changing to Connected

**Symptom:**

- User scans QR code
- Status remains 'qr' or 'connecting'
- No webhook received

**Investigation:**

```bash
# 1. Check webhook logs
grep "Webhook.*connection.update" /var/log/app.log | tail -5

# 2. Verify Evolution API is receiving webhook
# Check Evolution API logs or dashboard

# 3. Verify BASE_URL is correct
echo $BASE_URL
# Must be HTTPS and publicly accessible
```

**Root Causes:**

1. **BASE_URL incorrect** → Update env var and restart
2. **Webhook secret mismatch** → Regenerate in DB and Evolution
3. **Evolution API not sending webhooks** → Check Evolution config

**Fix:**

```sql
-- Regenerate webhook secret
UPDATE unit_whatsapp_connections
SET webhook_secret = gen_random_uuid()::text
WHERE unit_id = 'AFFECTED_UNIT_ID';

-- Get new secret and reconfigure Evolution instance
SELECT webhook_secret FROM unit_whatsapp_connections WHERE unit_id = 'AFFECTED_UNIT_ID';
```

---

### ISSUE 2: Inbound Messages Not Arriving

**Symptom:**

- WhatsApp shows message sent
- CRM doesn't receive it
- No log entry for message

**Investigation:**

```bash
# 1. Check webhook endpoint is accessible
curl -X POST https://your-domain.com/webhooks/whatsapp/evolution/test \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'

# Expected: 200 (even if unknown instance warning)
# If 404/500: Routing issue

# 2. Check Evolution API webhook configuration
# Ensure webhook URL is: https://your-domain.com/webhooks/whatsapp/evolution/{secret}
```

**Root Causes:**

1. **Webhook not configured in Evolution** → Set via Evolution API settings
2. **Instance name mismatch** → Verify instance_id in DB matches Evolution
3. **HTTPS certificate issues** → Check SSL cert validity

---

### ISSUE 3: Outbound Messages Failing (retry_count > 0)

**Symptom:**

- Messages show status 'failed' or 'queued'
- `retry_count` > 0 in database
- Error details show connection timeout

**Investigation:**

```sql
-- Check recent failures
SELECT
    id,
    content,
    retry_count,
    error_details,
    created_at
FROM messages
WHERE status = 'failed'
  AND retry_count > 0
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

```bash
# Test Evolution API connectivity
curl -X GET $EVOLUTION_API_URL/instance/connectionState/unit_TEST \
  -H "apikey: $EVOLUTION_API_KEY"

# Expected: JSON response
# If timeout/error: Evolution API unreachable
```

**Root Causes:**

1. **Evolution API down** → Check Evolution container/service
2. **API key expired** → Regenerate and update env var
3. **Network firewall** → Check outbound HTTPS allowed

**Temporary Workaround:**

```sql
-- Reset failed messages for manual retry
UPDATE messages
SET status = 'queued', retry_count = 0, error_details = NULL
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Trigger manual send via API (if needed)
```

---

### ISSUE 4: Campaign Stuck (Status = Processing)

**Symptom:**

- Campaign status shows 'processing' for > 10 minutes
- Recipients stuck in 'pending'
- No send activity in logs

**Investigation:**

```sql
-- Check campaign worker progress
SELECT
    c.id,
    c.name,
    c.status,
    c.started_at,
    NOW() - c.started_at as duration,
    COUNT(cr.id) as total,
    SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) as pending_count
FROM campaigns c
LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
WHERE c.status = 'processing'
GROUP BY c.id, c.name, c.status, c.started_at;
```

**Root Causes:**

1. **Worker crashed** → Restart backend
2. **Database lock** → Check for long-running transactions
3. **Evolution API rate limit hit** → Wait and retry

**Recovery:**

```sql
-- Manual campaign reset (use with caution)
UPDATE campaigns
SET status = 'draft', started_at = NULL
WHERE id = 'STUCK_CAMPAIGN_ID';

-- Re-dispatch via API or admin panel
```

---

## 🔄 ROLLBACK DECISION CRITERIA

**Execute immediate rollback if:**

1. 🚨 **Critical security leak:** Secrets appear unmasked in logs
2. 🚨 **Data corruption:** Cross-tenant data leakage detected
3. 🚨 **Total failure:** > 50% of messages failing
4. 🚨 **Service down:** > 5 minutes of continuous 500 errors

**Rollback Procedure:**

```bash
# 1. Tag current state
git tag -a v1.0.0-whatsapp-FAILED -m "Marking failure point"
git push origin v1.0.0-whatsapp-FAILED

# 2. Revert to previous version
git revert HEAD --no-edit
git push origin main

# 3. Or use platform rollback
# Railway: railway rollback
# Render: Use dashboard
# Vercel: vercel rollback

# 4. Notify stakeholders
echo "⚠️ ROLLBACK EXECUTED: Evolution WhatsApp integration disabled"

# 5. Post-mortem
# Document: What failed, why, how to prevent
```

**Migrations are SAFE:** New columns are nullable, won't break old code. No need to rollback database.

---

## ✅ SUCCESS CRITERIA (End of Hour 1)

**System is STABLE if:**

- ✅ All checkpoints show OK or Warning (no Critical)
- ✅ At least 1 successful inbound message processed
- ✅ At least 1 successful outbound message sent
- ✅ No secrets leaked in logs
- ✅ No cross-tenant data access detected
- ✅ 5xx error rate < 1% of total requests

**Next Steps After Hour 1:**

1. Reduce monitoring to every 1 hour for next 8 hours
2. Reduce to every 4 hours for next 24 hours
3. Add to standard monitoring dashboards
4. Document any issues encountered + fixes

---

## 📞 ESCALATION CONTACT

**If critical issue detected:**

1. Tag `@backend-lead` in Slack #incidents
2. Include: Issue type, affected users, rollback status
3. Attach: Last 50 lines of logs + screenshot of metrics

**Support Resources:**

- Logs: `/var/log/app.log` or platform-specific
- Metrics: `docs/GOLIVE_DEPLOYMENT_GUIDE.md`
- Rollback: See above procedure
- Database: Supabase Dashboard → SQL Editor

---

**End of Monitoring Runbook**

**Remember:** Better to rollback early and fix than to let issues compound. 🛡️
