# Migration Checklist - 4-Tier Subscription System

Use this checklist to ensure a smooth deployment of the new subscription system.

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Environment Verification
- [ ] Supabase project is accessible
- [ ] Supabase Service Role Key is set in `.env.local`
- [ ] Next.js application is running locally (`npm run dev`)
- [ ] You have Super Admin access to the platform
- [ ] Git repository is clean (no uncommitted changes)

### 2. Database Backup
- [ ] Go to Supabase Dashboard → Database → Backups
- [ ] Create a manual backup snapshot
- [ ] Note the backup timestamp: `_______________`
- [ ] Verify backup completed successfully

### 3. Code Review
- [ ] All new files are present in repository:
  - `supabase/migration_030_tiered_subscription_system.sql`
  - `src/lib/security/email-check.ts`
  - `src/lib/security/fingerprint.ts`
  - `src/app/(dashboard)/dashboard/[workspace_id]/billing/page.tsx`
  - `src/app/(dashboard)/dashboard/[workspace_id]/billing/billing-client.tsx`
  - `src/app/api/admin/seed-demo-tenant/route.ts`
  - `TIERED_SUBSCRIPTION_IMPLEMENTATION_GUIDE.md`
  - `IMPLEMENTATION_SUMMARY.md`
  - `QUICK_REFERENCE.md`
- [ ] Modified files compile without TypeScript errors
- [ ] No import errors in VS Code

---

## 🚀 DEPLOYMENT STEPS

### STEP 1: Database Migration (15 minutes)
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Create a new query (New Query button)
- [ ] Copy entire contents of `migration_030_tiered_subscription_system.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run" button
- [ ] Wait for completion message
- [ ] Check for errors in output (should say "Success")

**Verification:**
```sql
-- Run these queries to verify:
SELECT COUNT(*) FROM subscription_plans WHERE slug IN ('free_trial', 'pro', 'business', 'enterprise');
-- Should return: 4

SELECT column_name FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'trial_ends_at';
-- Should return: trial_ends_at

SELECT COUNT(*) FROM signup_footprints;
-- Should return: 0 (or number if table exists)
```

- [ ] All verification queries passed
- [ ] Screenshot taken of successful migration

---

### STEP 2: Deploy Application Code (10 minutes)
```bash
# 1. Commit changes
git add .
git commit -m "feat: implement 4-tier subscription system with anti-abuse"

# 2. Push to repository
git push origin main

# 3. If using Vercel/Netlify, wait for deployment
# Check deployment logs for errors

# 4. Visit production URL
# Verify application loads without errors
```

- [ ] Code pushed to repository
- [ ] Deployment triggered automatically
- [ ] Deployment completed successfully
- [ ] No errors in deployment logs
- [ ] Application loads in browser

---

### STEP 3: Verify Admin UI (5 minutes)
- [ ] Navigate to `/super-admin/plans`
- [ ] Verify 4 plans are visible:
  - [ ] 14-Day Free Trial ($0)
  - [ ] Pro ($49/mo)
  - [ ] Business ($149/mo)
  - [ ] Enterprise (Custom)
- [ ] Click "Edit" on Pro plan
- [ ] Verify new fields are visible:
  - [ ] AI Message Cap
  - [ ] Knowledge Doc Cap
  - [ ] CRM Lead Cap
  - [ ] Has WhatsApp / Has Telegram checkboxes
- [ ] Make a small change (e.g., sort_order = 1 → 2)
- [ ] Click "Save Changes"
- [ ] Verify success message appears
- [ ] Refresh page, verify change persisted

---

### STEP 4: Test Public Pricing Page (3 minutes)
- [ ] Navigate to `/pricing` (logged out)
- [ ] Verify 4 pricing tiers are displayed
- [ ] Verify Free Trial card shows:
  - [ ] "No credit card" badge
  - [ ] "Start Free Trial" button
  - [ ] 200 AI messages listed
- [ ] Verify Pro card shows:
  - [ ] "Most popular" badge (or featured styling)
  - [ ] $49/month price
  - [ ] 1,000 AI messages listed
- [ ] Verify Enterprise card shows:
  - [ ] "Custom Pricing" or "Contact Sales" button
  - [ ] Unlimited features listed

---

### STEP 5: Test Signup Flow (10 minutes)

#### Test 5A: Disposable Email Blocker
- [ ] Go to `/signup`
- [ ] Try signing up with: `test@tempmail.com`
- [ ] Verify error message: *"Temporary/disposable email addresses are not allowed..."*
- [ ] Try signing up with: `user@guerrillamail.com`
- [ ] Verify error message appears again

#### Test 5B: Valid Signup
- [ ] Sign up with valid email: `testuser+${Date.now()}@yourdomain.com`
- [ ] Use business name: `Test Company`
- [ ] Complete signup successfully
- [ ] Land on dashboard

#### Test 5C: Verify Workspace Created
```sql
-- In Supabase SQL Editor:
SELECT 
  id, 
  name, 
  subscription_tier, 
  trial_ends_at,
  message_limit,
  messages_used
FROM workspaces 
WHERE name = 'Test Company'
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] Workspace exists with correct name
- [ ] `subscription_tier = 'free_trial'`
- [ ] `trial_ends_at` is set (14 days from now)
- [ ] `message_limit = 200`
- [ ] `messages_used = 0`

#### Test 5D: Verify Footprint Logged
```sql
SELECT 
  ip_address,
  email_domain,
  trial_claimed,
  created_at
FROM signup_footprints 
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] Footprint record exists
- [ ] `email_domain` matches signup email domain
- [ ] `trial_claimed = TRUE`
- [ ] `ip_address` is populated (not 'unknown')

---

### STEP 6: Test Workspace Billing UI (5 minutes)
- [ ] Navigate to `/dashboard/{workspace_id}/billing`
  - Find `{workspace_id}` from URL after clicking on a workspace
- [ ] Verify trial banner is visible:
  - [ ] Shows days remaining (should be 14)
  - [ ] Shows message usage (0/200)
  - [ ] "Upgrade Now" button present
- [ ] Verify usage meters are visible:
  - [ ] AI Messages (0/200 = 0%)
  - [ ] Knowledge Docs (0/10 = 0%)
  - [ ] CRM Leads (0/50 = 0%)
- [ ] Verify upgrade section shows:
  - [ ] Pro plan card ($49/mo)
  - [ ] Business plan card ($149/mo)
  - [ ] Enterprise plan card (Custom)
  - [ ] Each has "Upgrade Now" or "Contact Sales" button

---

### STEP 7: Test Usage Metering (15 minutes)

#### Test 7A: Create Demo Workspace
```bash
# Using curl (replace with your production URL if deployed)
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=free_trial&expired=false" \
  -H "Cookie: YOUR_SUPER_ADMIN_SESSION_COOKIE"

# Alternative: Use Postman or Thunder Client
# Method: POST
# URL: http://localhost:3000/api/admin/seed-demo-tenant?tier=free_trial&expired=false
# Include auth cookie in headers
```

- [ ] API returns success with workspace details
- [ ] Note the `workspace_id` from response: `_______________`

#### Test 7B: Verify Demo Data
```sql
-- Replace {workspace_id} with ID from previous step
SELECT * FROM workspaces WHERE id = '{workspace_id}';
-- Should show messages_used > 0 (demo data)

SELECT COUNT(*) FROM knowledge_bases WHERE workspace_id = '{workspace_id}';
-- Should return 5 (or knowledge_doc_limit)

SELECT COUNT(*) FROM workspace_products WHERE workspace_id = '{workspace_id}';
-- Should return 3

SELECT COUNT(*) FROM workspace_crm WHERE workspace_id = '{workspace_id}';
-- Should return at least 1
```

- [ ] All demo data queries return expected counts
- [ ] Workspace has usage data populated

#### Test 7C: Test Message Limit Enforcement
```sql
-- Force exceed message limit
UPDATE workspaces 
SET messages_used = message_limit 
WHERE id = '{workspace_id}';
```

- [ ] Send a test message to this workspace (via WhatsApp/Telegram webhook or simulate)
- [ ] Check Inngest dashboard → `process-chat-message` function
- [ ] Verify `check-usage-limits` step returns `true` (blocked)
- [ ] Verify bot sends fallback message: *"Our AI assistant is temporarily offline..."*
- [ ] Verify conversation status changed to `escalated`

---

### STEP 8: Test Trial Expiration (5 minutes)

#### Test 8A: Create Expired Trial Workspace
```bash
curl -X POST "http://localhost:3000/api/admin/seed-demo-tenant?tier=free_trial&expired=true"
```

- [ ] API returns success
- [ ] Note the `workspace_id`: `_______________`

#### Test 8B: Verify Expiration in UI
- [ ] Navigate to `/dashboard/{workspace_id}/billing` for expired workspace
- [ ] Verify red "Trial Expired" banner is shown
- [ ] Verify banner message mentions AI assistant is offline
- [ ] Verify "Upgrade to Resume Service" button is present

#### Test 8C: Verify Inngest Blocks Messages
- [ ] Send test message to expired workspace
- [ ] Verify Inngest blocks message before LLM invocation
- [ ] Verify fallback message sent to customer

---

### STEP 9: Test Duplicate Trial Prevention (10 minutes)

#### Test 9A: Sign Up First Time
- [ ] Open incognito/private browser window
- [ ] Go to `/signup`
- [ ] Sign up with: `trialtest1+${Date.now()}@yourdomain.com`
- [ ] Complete signup, note workspace created
- [ ] Check Supabase: `SELECT * FROM signup_footprints ORDER BY created_at DESC LIMIT 1;`
- [ ] Note the `browser_fingerprint` value: `_______________`

#### Test 9B: Try to Sign Up Again (Same Device)
- [ ] In the SAME incognito window, sign out
- [ ] Go to `/signup` again
- [ ] Sign up with DIFFERENT email: `trialtest2+${Date.now()}@yourdomain.com`
- [ ] Complete signup successfully (account creation allowed)
- [ ] Check workspace: `SELECT trial_ends_at, trial_claimed FROM workspaces WHERE name = 'Test Company 2' ORDER BY created_at DESC LIMIT 1;`
- [ ] Verify: `trial_ends_at` is in the PAST (instant expiration)
- [ ] Verify: `is_trial_claimed = TRUE` but trial already expired

---

### STEP 10: Performance Check (5 minutes)
- [ ] Navigate to various pages and verify no slowdowns:
  - [ ] `/dashboard` - Dashboard loads quickly
  - [ ] `/super-admin/plans` - Admin plans load quickly
  - [ ] `/pricing` - Public pricing loads quickly
  - [ ] `/dashboard/{workspace_id}/billing` - Billing page loads quickly
- [ ] Check browser console for errors (F12 → Console)
- [ ] Check Network tab for failed requests

---

## 📊 POST-DEPLOYMENT METRICS

Run these queries to establish baselines:

```sql
-- Total Workspaces by Tier
SELECT subscription_tier, COUNT(*) as count 
FROM workspaces 
GROUP BY subscription_tier 
ORDER BY count DESC;

-- Trial Conversion Rate (after 1 week)
SELECT 
  COUNT(*) FILTER (WHERE subscription_tier = 'free_trial') AS trials,
  COUNT(*) FILTER (WHERE subscription_tier IN ('pro', 'business')) AS paid,
  ROUND(
    COUNT(*) FILTER (WHERE subscription_tier IN ('pro', 'business'))::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE subscription_tier = 'free_trial'), 0) * 100, 
    2
  ) AS conversion_rate_pct
FROM workspaces
WHERE created_at > NOW() - INTERVAL '7 days';

-- Abuse Detection Rate
SELECT 
  COUNT(*) AS total_signups,
  COUNT(*) FILTER (WHERE trial_claimed = FALSE) AS trials_blocked,
  ROUND(
    COUNT(*) FILTER (WHERE trial_claimed = FALSE)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) AS abuse_rate_pct
FROM signup_footprints
WHERE created_at > NOW() - INTERVAL '7 days';

-- Average Usage Levels
SELECT 
  subscription_tier,
  ROUND(AVG(messages_used::NUMERIC / NULLIF(message_limit, 0) * 100), 2) AS avg_msg_usage_pct,
  ROUND(AVG(knowledge_docs_used::NUMERIC / NULLIF(knowledge_doc_limit, 0) * 100), 2) AS avg_doc_usage_pct,
  ROUND(AVG(crm_leads_used::NUMERIC / NULLIF(crm_lead_limit, 0) * 100), 2) AS avg_lead_usage_pct
FROM workspaces
GROUP BY subscription_tier;
```

Record baseline metrics:
- Total Workspaces: `_______`
- Free Trials: `_______`
- Paid Subscribers: `_______`
- Abuse Blocked: `_______`
- Avg Message Usage %: `_______`

---

## 🚨 ROLLBACK PLAN

If critical issues are discovered:

### Immediate Rollback (Database)
```sql
-- Run in Supabase SQL Editor (see QUICK_REFERENCE.md for full script)
ALTER TABLE workspaces DROP COLUMN IF EXISTS trial_ends_at;
DROP TABLE IF EXISTS signup_footprints;
-- ... (see QUICK_REFERENCE.md for complete rollback script)
```

### Immediate Rollback (Application)
```bash
git revert HEAD
git push origin main
```

- [ ] Rollback executed successfully
- [ ] Application restored to previous version
- [ ] Users can access platform normally

---

## ✅ DEPLOYMENT COMPLETE

### Final Sign-Off
- [ ] All tests passed
- [ ] No errors in production logs
- [ ] Baseline metrics recorded
- [ ] Team notified of deployment
- [ ] Documentation updated (if needed)

**Deployment Date:** `_______________`  
**Deployed By:** `_______________`  
**Production URL:** `_______________`  
**Rollback Plan Tested:** Yes / No

---

**Congratulations! The 4-Tier Subscription System is now live! 🎉**

Monitor these metrics daily for the first week:
1. Trial signup rate
2. Abuse detection rate
3. Trial expiration handling
4. Average usage levels
5. Conversion from trial to paid

For ongoing support, refer to:
- `TIERED_SUBSCRIPTION_IMPLEMENTATION_GUIDE.md` - Detailed implementation guide
- `IMPLEMENTATION_SUMMARY.md` - Technical summary
- `QUICK_REFERENCE.md` - Quick commands and queries
