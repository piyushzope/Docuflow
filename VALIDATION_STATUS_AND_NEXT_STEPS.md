# Document Validation System - Status & Next Steps

## ✅ Completed

1. **Database Schema Migration** - Main validation tables and columns created
   - `documents.validation_status` column ✓
   - `documents.validation_metadata` column ✓
   - `document_validations` table ✓
   - `document_renewal_reminders` table ✓
   - Triggers and functions created ✓

2. **Code Implementation** - All code is ready
   - Edge Functions: `validate-document` and `send-renewal-reminders` ✓
   - API Routes: `/api/documents/[id]/validation` and `/api/documents/[id]/validate` ✓
   - Frontend Component: `DocumentValidationSummary` ✓
   - Integration with email processing ✓

## 🚀 Next Steps (In Order)

### Step 1: Run Cron Job Migration

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Click **SQL Editor** → **New Query**
3. Copy entire contents of: `supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql`
4. Paste and click **Run**

**Option B: Via CLI**
```bash
# Make sure you have .env.local set up with Supabase credentials
node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql
```

**Verify it worked:**
```sql
-- Run in Supabase SQL Editor
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'send-renewal-reminders';
```

Expected: Should show `active = true` and `schedule = '0 9 * * *'`

---

### Step 2: Deploy Edge Functions

**Run the deployment script:**
```bash
./deploy-validation-functions.sh
```

**Or manually:**
```bash
# Make sure you're logged in
supabase login

# Link to project (if not already linked)
supabase link --project-ref nneyhfhdthpxmkemyenm

# Deploy functions
supabase functions deploy validate-document --no-verify-jwt
supabase functions deploy send-renewal-reminders --no-verify-jwt
```

**Verify deployment:**
- Go to Supabase Dashboard → Edge Functions
- Should see both functions listed:
  - `validate-document` ✓
  - `send-renewal-reminders` ✓

---

### Step 3: Set OpenAI API Key

**Required for document classification!**

1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Key: `OPENAI_API_KEY`
5. Value: Your OpenAI API key (get from https://platform.openai.com/api-keys)
6. Click **Save**

**Verify:**
- Secret should appear in the list
- Functions will use this for AI classification

---

### Step 4: Verify Complete Setup

**Option A: Use SQL Check Script**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `check-validation-status.sql`
3. Run the query
4. Should see all checks showing "EXISTS" and "ACTIVE"

**Option B: Use Verification Script** (after fixing ES module issue)
```bash
node verify-validation-setup.js
```

**Manual Verification Checklist:**
- [ ] Database tables exist (document_validations, document_renewal_reminders)
- [ ] Database columns exist (documents.validation_status, validation_metadata)
- [ ] Cron job scheduled (send-renewal-reminders)
- [ ] Edge Functions deployed (validate-document, send-renewal-reminders)
- [ ] OpenAI API Key set in Supabase secrets

---

## 🧪 Testing

### Test 1: Manual Validation
1. Go to any document detail page in your dashboard
2. Look for **Validation Summary** panel in sidebar
3. Click **"Validate Now"** button
4. Wait 2-5 seconds
5. Validation results should appear

### Test 2: Automatic Validation
1. Send an email with a document attachment
2. Wait 5-15 minutes for email processing
3. Go to document detail page
4. Should see validation results automatically

### Test 3: Renewal Reminders
1. Create/validate a document with expiry date in future
2. Check reminders were created:
   ```sql
   SELECT * FROM document_renewal_reminders 
   WHERE document_id = 'your-doc-id';
   ```
3. Should see reminders for 90, 60, 30 days before expiry

---

## 📊 Current Status Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Database Schema | ✅ Complete | None |
| Edge Functions Code | ✅ Complete | Deploy |
| API Routes | ✅ Complete | None |
| Frontend Components | ✅ Complete | None |
| Cron Job Migration | ⏳ Pending | Run migration |
| Edge Functions Deployed | ⏳ Pending | Deploy functions |
| OpenAI API Key | ⏳ Pending | Set in Dashboard |

---

## 🔧 Quick Reference

**Files Created:**
- `deploy-validation-functions.sh` - Deployment script
- `verify-validation-setup.js` - Verification script (needs ES module fix)
- `check-validation-status.sql` - SQL verification queries
- `VALIDATION_QUICK_ACTIONS.md` - Quick checklist
- `NEXT_STEPS_VALIDATION.md` - Detailed guide

**Key Locations:**
- Edge Functions: `supabase/functions/validate-document/` and `send-renewal-reminders/`
- Migrations: `supabase/migrations/20250112000000_*.sql` and `20250112000001_*.sql`
- API Routes: `apps/web/app/api/documents/[id]/validation/` and `validate/`
- Frontend: `apps/web/components/document-validation-summary.tsx`

---

## ⚠️ Common Issues

**"Migration requires environment variables"**
- Make sure `apps/web/.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Or set them as environment variables before running migration

**"Function not found (404)"**
- Run: `./deploy-validation-functions.sh`
- Check Supabase Dashboard → Edge Functions

**"OPENAI_API_KEY not configured"**
- Set in Supabase Dashboard → Edge Functions → Secrets
- Without this, validation will fail

**"Cron job not found"**
- Run the cron job migration (Step 1)
- Check in Supabase Dashboard → Database → Cron Jobs

---

**Status**: Ready for deployment  
**Estimated Time**: 10-15 minutes  
**Blockers**: None - all code is ready!

