# Quick Reference Card - 4-Tier Subscription System

## 🚀 Quick Start

### 1. Deploy in 3 Commands
```bash
# 1. Run migration in Supabase SQL Editor
# Copy contents of: supabase/migration_030_tiered_subscription_system.sql

# 2. Verify migration
SELECT name, slug, ai_message_cap FROM subscription_plans;

# 3. Test signup
# Visit: http://localhost:3000/signup
```

---

## 🔍 Essential SQL Queries

### Check Workspace Status
```sql
SELECT 
  id,
  name,
  subscription_tier,
  trial_ends_at,
  messages_used || '/' || message_limit AS ai_messages,
  knowledge_docs_used || '/' || knowledge_doc_limit AS knowledge_docs,
  crm_leads_used || '/' || crm_lead_limit AS crm_leads,
  CASE 
    WHEN trial_ends_at < NOW() THEN 'EXPIRED'
    WHEN trial_ends_at > NOW() THEN 'ACTIVE'
    ELSE 'N/A'
  END AS trial_status
FROM workspaces
WHERE subscription_tier = 'free_trial'
ORDER BY created_at DESC
LIMIT 10;
```

### Find Abused Signups
```sql
SELECT 
  ip_address,
  email_domain,
  COUNT(*) AS signup_count,
  MIN(created_at) AS first_signup,
  MAX(created_at) AS last_signup
FROM signup_footprints
WHERE trial_claimed = FALSE  -- These were blocked from claiming trial
GROUP BY ip_address, email_domain
HAVING COUNT(*) > 1
ORDER BY signup_count DESC;
```

### View All Plans
```sql
SELECT 
  name,
  slug,
  price_usd / 100 AS price_dollars,
  ai_message_cap AS messages,
  knowledge_doc_cap AS docs,
  crm_lead_cap AS leads,
  is_enterprise_contact_sales AS is_enterprise
FROM subscription_plans
ORDER BY sort_order;
```

### Force Expire a Trial (Testing)
```sql
UPDATE workspaces 
SET trial_ends_at = NOW() - INTERVAL '1 day'
WHERE id = 'your-workspace-id';
```

### Manually Increment Usage (Testing)
```sql
SELECT increment_workspace_message_usage('your-workspace-id');

-- Verify
SELECT messages_used FROM workspaces WHERE id = 'your-workspace-id';
```

### Check Trial Abuse Function
```sql
SELECT check_trial_abuse(
  '192.168.1.1',              -- IP address
  'abc123def456',              -- Browser fingerprint
  'example.com'                -- Email domain
);
-- Returns TRUE if trial was already claimed from these signals
```

---

## 🧪 Testing Shortcuts

### Create Demo Workspaces
```bash
# Free Trial (Active)
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=free_trial&expired=false"

# Free Trial (Expired)
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=free_trial&expired=true"

# Pro Tier
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=pro&expired=false"

# Business Tier
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=business&expired=false"

# Enterprise Tier
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=enterprise&expired=false"
```

### Test Disposable Emails
```javascript
// In browser console or Node.js
const { isDisposableEmail } = require('./src/lib/security/email-check');

isDisposableEmail('test@tempmail.com');     // true
isDisposableEmail('user@guerrillamail.com'); // true
isDisposableEmail('john@company.com');       // false
```

---

## 🎯 Key URLs

| Page | URL | Description |
|------|-----|-------------|
| **Admin Plans** | `/super-admin/plans` | Manage subscription tiers |
| **Public Pricing** | `/pricing` | 4-tier pricing page |
| **Workspace Billing** | `/dashboard/{workspace_id}/billing` | Usage meters & upgrades |
| **Signup** | `/signup` | Test anti-abuse system |
| **Demo Seeding API** | `/api/admin/seed-demo-tenant` | Create test workspaces |

---

## 🛡️ Anti-Abuse Checks

### Disposable Email Patterns
```javascript
// Blocked patterns:
- *tempmail*
- *disposable*
- *throwaway*
- *fakemail*
- *trashmail*
- *spam*
- *guerrilla*
- *burner*
- *10min*
```

### Fingerprint Components
```javascript
[
  Screen Resolution,
  Color Depth,
  Timezone,
  Language,
  Platform,
  User Agent,
  CPU Cores,
  Device Memory,
  Canvas Hash (first 100 chars),
  WebGL Vendor/Renderer
]
→ SHA-256 Hash
```

---

## 📊 Tier Limits (Quick Reference)

```
FREE TRIAL:   200 msgs  | 10 docs  | 50 leads  | $0
PRO:         1000 msgs  | 50 docs  | 200 leads | $49/mo
BUSINESS:    5000 msgs  | 200 docs | 1000 leads| $149/mo
ENTERPRISE:  UNLIMITED  | UNLIMITED| UNLIMITED | Custom
```

---

## 🔧 Common Fixes

### Reset Workspace Usage
```sql
UPDATE workspaces 
SET messages_used = 0, 
    knowledge_docs_used = 0, 
    crm_leads_used = 0
WHERE id = 'your-workspace-id';
```

### Extend Trial by 7 Days
```sql
UPDATE workspaces 
SET trial_ends_at = trial_ends_at + INTERVAL '7 days'
WHERE id = 'your-workspace-id';
```

### Manually Set Subscription Tier
```sql
UPDATE workspaces 
SET subscription_tier = 'pro',
    message_limit = 1000,
    knowledge_doc_limit = 50,
    crm_lead_limit = 200,
    trial_ends_at = NULL
WHERE id = 'your-workspace-id';
```

### Clear Old Footprints (>30 days)
```sql
DELETE FROM signup_footprints 
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 🚨 Debug Checklist

When things don't work:

1. **Migration Applied?**
   ```sql
   SELECT COUNT(*) FROM signup_footprints; -- Should not error
   ```

2. **Plans Exist?**
   ```sql
   SELECT COUNT(*) FROM subscription_plans; -- Should be >= 4
   ```

3. **Helper Functions Exist?**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name LIKE '%workspace%';
   ```

4. **Workspace Has Limits?**
   ```sql
   SELECT message_limit, trial_ends_at FROM workspaces LIMIT 1;
   -- Should not be NULL
   ```

5. **Inngest Processing Messages?**
   - Check Inngest dashboard
   - Look for `check-usage-limits` step
   - Verify it's not failing

---

## 📝 One-Liner Status Report

```sql
SELECT 
  (SELECT COUNT(*) FROM workspaces WHERE subscription_tier = 'free_trial') AS trials,
  (SELECT COUNT(*) FROM workspaces WHERE subscription_tier IN ('pro', 'business')) AS paid,
  (SELECT COUNT(*) FROM signup_footprints WHERE trial_claimed = FALSE) AS abuse_blocked,
  (SELECT AVG(messages_used::NUMERIC / message_limit * 100) 
   FROM workspaces WHERE subscription_tier = 'free_trial') AS avg_trial_usage_pct;
```

---

## 🎓 Environment Setup

No new environment variables needed! Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 📞 Emergency Rollback

If something breaks badly:

```sql
-- Rollback: Remove new columns from workspaces
ALTER TABLE workspaces 
DROP COLUMN IF EXISTS message_limit,
DROP COLUMN IF EXISTS messages_used,
DROP COLUMN IF EXISTS trial_ends_at,
DROP COLUMN IF EXISTS subscription_tier,
DROP COLUMN IF EXISTS knowledge_doc_limit,
DROP COLUMN IF EXISTS knowledge_docs_used,
DROP COLUMN IF EXISTS crm_lead_limit,
DROP COLUMN IF EXISTS crm_leads_used,
DROP COLUMN IF EXISTS is_trial_claimed;

-- Rollback: Drop footprints table
DROP TABLE IF EXISTS signup_footprints;

-- Rollback: Remove new columns from subscription_plans
ALTER TABLE subscription_plans
DROP COLUMN IF EXISTS ai_message_cap,
DROP COLUMN IF EXISTS knowledge_doc_cap,
DROP COLUMN IF EXISTS crm_lead_cap,
DROP COLUMN IF EXISTS has_whatsapp,
DROP COLUMN IF EXISTS has_telegram,
DROP COLUMN IF EXISTS has_custom_domain,
DROP COLUMN IF EXISTS multi_agent_seats,
DROP COLUMN IF EXISTS is_enterprise_contact_sales;

-- Rollback: Drop helper functions
DROP FUNCTION IF EXISTS check_workspace_message_limit(UUID);
DROP FUNCTION IF EXISTS increment_workspace_message_usage(UUID);
DROP FUNCTION IF EXISTS check_trial_abuse(TEXT, TEXT, TEXT);
```

Then redeploy previous version of application code.

---

**End of Quick Reference**
