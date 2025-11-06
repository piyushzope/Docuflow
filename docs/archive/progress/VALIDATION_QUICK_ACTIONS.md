# Validation System - Quick Action Checklist

## ✅ Completed
- [x] Database migration run (main validation schema)
- [x] Tables and columns created
- [x] Triggers and functions created

## 🚀 Next Actions (Do These Now)

### 1. Run Cron Job Migration (1 minute)
```bash
node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql
```

### 2. Deploy Edge Functions (5 minutes)
```bash
./deploy-validation-functions.sh
```

Or manually:
```bash
supabase functions deploy validate-document --no-verify-jwt
supabase functions deploy send-renewal-reminders --no-verify-jwt
```

### 3. Set OpenAI API Key (2 minutes)
Go to Supabase Dashboard:
- Project Settings → Edge Functions → Secrets
- Add: `OPENAI_API_KEY` = `your-openai-api-key`

Get API key from: https://platform.openai.com/api-keys

### 4. Verify Everything (30 seconds)
```bash
node verify-validation-setup.js
```

## 📋 What Each Script Does

### `deploy-validation-functions.sh`
- Checks Supabase CLI installation
- Links to your project
- Deploys both Edge Functions
- Provides next steps

### `verify-validation-setup.js`
- Checks database schema (tables, columns)
- Verifies Edge Functions are deployed
- Checks cron job configuration
- Validates environment setup

## 🧪 Quick Test

After deployment, test validation:

1. **Go to any document detail page**
2. **Click "Validate Now" button**
3. **Wait 2-5 seconds**
4. **Check validation results appear**

## ⚠️ Common Issues

**"Function not found (404)"**
- Run: `./deploy-validation-functions.sh`

**"OPENAI_API_KEY not configured"**
- Set in Supabase Dashboard → Edge Functions → Secrets

**"Cron job not found"**
- Run: `node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql`

**"Validation fails with error"**
- Check Edge Function logs in Supabase Dashboard
- Verify OPENAI_API_KEY is set correctly

---

**Status**: Ready to deploy  
**Estimated Time**: 8-10 minutes total

