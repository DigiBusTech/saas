# 4-Tier Subscription System Implementation Guide

## Overview
This implementation extends your SaaS platform to support a **4-tier pricing structure** (14-Day Free Trial, Pro, Business, Enterprise) with **anti-trial-abuse mechanisms** and **strict usage metering** for AI messages, RAG knowledge documents, and CRM leads.

---

## 🚀 DEPLOYMENT CHECKLIST

### 1. Run Database Migration

Execute the migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migration_030_tiered_subscription_system.sql
# and run it in Supabase Dashboard → SQL Editor → New Query
```

**What this does:**
- Adds usage columns to `workspaces` table (`message_limit`, `messages_used`, `trial_ends_at`, etc.)
- Creates `signup_footprints` table for anti-abuse tracking
- Extends `subscription_plans` with new tier-specific caps
- Seeds the 4 default plans: Free Trial, Pro, Business, Enterprise
- Creates helper functions for usage metering

### 2. Verify Database Changes

Run this query in Supabase SQL Editor to confirm:

```sql
-- Check that new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'workspaces' 
  AND column_name IN ('message_limit', 'messages_used', 'trial_ends_at', 'subscription_tier');

-- Check that 4 tiers exist
SELECT name, slug, ai_message_cap, knowledge_doc_cap, crm_lead_cap 
FROM subscription_plans 
WHERE slug IN ('free_trial', 'pro', 'business', 'enterprise');

-- Check helper functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('check_workspace_message_limit', 'increment_workspace_message_usage', 'check_trial_abuse');
```

### 3. Deploy Application Code

All code changes are already in place:

**Phase 1: Database (✓)**
- `supabase/migration_030_tiered_subscription_system.sql`

**Phase 2: Anti-Abuse System (✓)**
- `src/lib/security/email-check.ts` - Disposable email blocker
- `src/lib/security/fingerprint.ts` - Browser fingerprinting
- `src/app/(auth)/signup/page.tsx` - Updated signup form
- `src/app/(auth)/actions.ts` - Updated signup action with abuse checks

**Phase 3: Admin & Public UI (✓)**
- `src/app/(super-admin)/super-admin/plans/plans-client.tsx` - Updated admin plan manager
- `src/app/(super-admin)/super-admin/plans/actions.ts` - Updated plan actions
- `src/app/(marketing)/pricing/page.tsx` - Updated public pricing page

**Phase 4: Inngest Guardrails (✓)**
- `src/inngest/functions/process-chat-message.ts` - Workspace-level usage checks

**Phase 5: Workspace Billing UI (✓)**
- `src/app/(dashboard)/dashboard/[workspace_id]/billing/page.tsx` - Workspace billing page
- `src/app/(dashboard)/dashboard/[workspace_id]/billing/billing-client.tsx` - Billing client component
- `src/app/api/admin/seed-demo-tenant/route.ts` - Demo data seeding API

---

## 🧪 TESTING GUIDE

### Test 1: Anti-Trial-Abuse System

1. **Test Disposable Email Blocker:**
```bash
# Try signing up with these emails (should be rejected):
# - test@tempmail.com
# - abuse@guerrillamail.com
# - fake@10minutemail.com

# Try with a valid email (should work):
# - john@yourdomain.com
```

2. **Test Duplicate Trial Prevention:**
```bash
# 1. Sign up with a valid email and claim trial
# 2. Sign out and try to sign up again from the same device
# 3. System should detect fingerprint and skip trial allocation
# 4. User can still create account but trial_ends_at = NOW()
```

### Test 2: Trial Expiration & Message Limits

**Option A: Use Demo Seeding API (Recommended)**

```bash
# Create a TRIAL workspace with EXPIRED trial
curl -X POST "https://yourdomain.com/api/admin/seed-demo-tenant?tier=free_trial&expired=true" \
  -H "Cookie: your-super-admin-session-cookie"

# Create a PRO workspace with active trial
curl -X POST "https://yourdomain.com/api/admin/seed-demo-tenant?tier=pro&expired=false" \
  -H "Cookie: your-super-admin-session-cookie"

# List all demo tenants
curl "https://yourdomain.com/api/admin/seed-demo-tenant" \
  -H "Cookie: your-super-admin-session-cookie"
```

**Option B: Manual SQL Testing**

```sql
-- Set trial to expired for a specific workspace
UPDATE workspaces 
SET trial_ends_at = NOW() - INTERVAL '1 day',
    subscription_tier = 'free_trial'
WHERE id = 'your-workspace-id';

-- Exceed message limit
UPDATE workspaces 
SET messages_used = message_limit + 1
WHERE id = 'your-workspace-id';

-- Test the helper function
SELECT check_workspace_message_limit('your-workspace-id');
```

### Test 3: Usage Metering in Inngest

1. Create a test workspace (via demo API or manually)
2. Send a message via WhatsApp/Telegram webhook
3. Verify in Inngest dashboard that:
   - `check-usage-limits` step runs
   - If trial expired: Bot sends fallback message
   - If limit reached: Bot sends fallback message
   - If all good: Normal AI response

### Test 4: Workspace Billing UI

1. Navigate to `/dashboard/{workspace_id}/billing`
2. Verify:
   - Trial banner shows correct days remaining
   - Progress bars reflect actual usage from database
   - Upgrade cards show all available plans
   - Enterprise plan shows "Contact Sales" instead of checkout

### Test 5: Admin Plan Manager

1. Navigate to `/super-admin/plans`
2. Verify:
   - All 4 plans (Free Trial, Pro, Business, Enterprise) are listed
   - New fields visible: AI Message Cap, Knowledge Doc Cap, CRM Lead Cap
   - Edit a plan and save - changes should persist
   - Create a new custom plan - should support all new fields

---

## 📊 TIER LIMITS REFERENCE

| Tier | AI Messages | Knowledge Docs | CRM Leads | Price (USD) | Trial Length |
|------|------------|----------------|-----------|-------------|--------------|
| **Free Trial** | 200 | 10 | 50 | $0 | 14 days |
| **Pro** | 1,000 | 50 | 200 | $49/mo | None |
| **Business** | 5,000 | 200 | 1,000 | $149/mo | None |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom | None |

---

## 🔒 ANTI-ABUSE MECHANISMS

### 1. Disposable Email Blocker
**Location:** `src/lib/security/email-check.ts`

Blocks 100+ known temporary email providers:
- tempmail.com, guerrillamail.com, mailinator.com, 10minutemail.com, etc.
- Pattern-based detection (e.g., `temp*mail`, `fake*mail`, `throwaway*`)

**To Update Blocklist:**
Edit the `DISPOSABLE_DOMAINS` Set and `DISPOSABLE_PATTERNS` array.

### 2. Device Fingerprinting
**Location:** `src/lib/security/fingerprint.ts`

Generates a unique hash from:
- Screen resolution
- Timezone
- Language
- User agent
- Hardware specs
- Canvas fingerprint
- WebGL fingerprint

### 3. Signup Footprints Table
**Location:** `public.signup_footprints`

Tracks:
- IP address
- Browser fingerprint
- Email domain
- Trial claim status
- Created timestamp

**Fraud Detection Logic:**
```sql
SELECT check_trial_abuse('192.168.1.1', 'abc123hash', 'example.com');
-- Returns TRUE if trial was claimed in last 30 days from same IP/fingerprint/domain
```

---

## 🛠️ CUSTOMIZATION GUIDE

### Adjust Trial Length

```sql
-- Change from 14 to 30 days
UPDATE subscription_plans 
SET ai_message_cap = 400  -- Double the messages for longer trial
WHERE slug = 'free_trial';

-- Update signup action (src/app/(auth)/actions.ts)
const trialEndsAt = trialBlocked ? now : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
```

### Add New Tier

```sql
INSERT INTO subscription_plans (
  name, slug, price_usd, price_ngn,
  ai_message_cap, knowledge_doc_cap, crm_lead_cap,
  has_whatsapp, has_telegram, is_enterprise_contact_sales,
  features, is_active, sort_order
) VALUES (
  'Premium', 'premium', 9900, 80000000,
  3000, 150, 500,
  TRUE, TRUE, FALSE,
  '{"ai_insights": true, "priority_support": true}'::JSONB,
  TRUE, 2
);
```

### Customize Fallback Message

Edit `src/inngest/functions/process-chat-message.ts`:

```typescript
const notice = 'Our AI assistant is temporarily offline. A human team member will follow up with you shortly. Thank you for your patience.';
```

### Enable Top-Up Purchases

Implement in `src/app/(dashboard)/dashboard/[workspace_id]/billing/billing-client.tsx`:

```typescript
async function handleTopUp() {
  const response = await fetch('/api/billing/top-up', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspace.id, amount: 1000 }),
  });
  // Process Stripe/Flutterwave checkout...
}
```

---

## 📝 ENVIRONMENT VARIABLES

No new environment variables required. Existing setup uses:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🐛 TROUBLESHOOTING

### Issue: Trial Not Expiring

**Diagnosis:**
```sql
SELECT id, name, trial_ends_at, subscription_tier, NOW() 
FROM workspaces 
WHERE subscription_tier = 'free_trial';
```

**Fix:**
```sql
-- Ensure trial_ends_at is set correctly
UPDATE workspaces 
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE subscription_tier = 'free_trial' AND trial_ends_at IS NULL;
```

### Issue: Usage Not Incrementing

**Diagnosis:**
Check Inngest logs for errors in `process-chat-message` step.

**Fix:**
```sql
-- Manually test the RPC function
SELECT increment_workspace_message_usage('workspace-id-here');

-- Verify function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'increment_workspace_message_usage';
```

### Issue: Signup Blocked Incorrectly

**Diagnosis:**
```sql
-- Check footprints table
SELECT * FROM signup_footprints 
WHERE ip_address = '192.168.1.1' OR email_domain = 'example.com'
ORDER BY created_at DESC;
```

**Fix:**
```sql
-- Clear old footprints (>30 days)
DELETE FROM signup_footprints 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Or disable the check temporarily in src/app/(auth)/actions.ts
let trialBlocked = false; // Force allow trials
```

### Issue: Admin Plan Manager Not Showing New Fields

**Fix:**
- Clear browser cache
- Verify migration was applied: `SELECT ai_message_cap FROM subscription_plans LIMIT 1;`
- Check TypeScript types in `plans-client.tsx` include new fields

---

## 🎯 NEXT STEPS (Future Enhancements)

1. **Stripe/Flutterwave Checkout Integration**
   - Update `/api/checkout/stripe` to handle tier upgrades
   - Add webhook handlers for subscription updates

2. **Email Notifications**
   - Trial expiring soon (3 days before)
   - Trial expired
   - Usage at 80% / 100%

3. **Top-Up Purchases**
   - Implement `/api/billing/top-up` endpoint
   - Allow Pro/Business users to buy message packs

4. **Custom Domains** (when ready)
   - Add `custom_domain` column to workspaces
   - Implement DNS verification

5. **Multi-Agent Seats** (when ready)
   - Add `agent_users` table linking users to workspaces
   - Enforce seat limits in team invites

---

## 📞 SUPPORT

For issues or questions:
1. Check Supabase logs: Dashboard → Database → Logs
2. Check Inngest logs: Inngest Dashboard → Functions → process-chat-message
3. Review error logs in `/api/admin/seed-demo-tenant` for seeding issues

---

## ✅ POST-DEPLOYMENT VERIFICATION

Run this checklist after deployment:

- [ ] Migration applied successfully in Supabase
- [ ] 4 plans visible in `/super-admin/plans`
- [ ] Public pricing page shows all 4 tiers
- [ ] Signup with disposable email is rejected
- [ ] Signup creates workspace with trial_ends_at set
- [ ] Demo seeding API works: `POST /api/admin/seed-demo-tenant?tier=pro`
- [ ] Workspace billing page shows trial banner
- [ ] Inngest blocks messages when trial expires
- [ ] Usage meters update after AI message sent
- [ ] Admin can edit plan limits and see new fields

---

**Implementation Complete! 🎉**

Your platform now has:
✅ 4-tier subscription system
✅ 14-day free trial with expiration
✅ Anti-trial-abuse mechanisms
✅ Workspace-level usage metering
✅ Admin plan management UI
✅ Public pricing page
✅ Workspace billing dashboard
✅ Demo data seeding for testing
