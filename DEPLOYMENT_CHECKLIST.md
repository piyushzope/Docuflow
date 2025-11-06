# Deployment Checklist - Docuflow

**Purpose:** Complete checklist for deploying Docuflow to production  
**Last Updated:** January 2025

---

## 📋 Pre-Deployment Checklist

### 1. Code Review ✅
- [x] All critical features implemented
- [x] UX components integrated
- [x] E2E tests written
- [x] Code passes linting
- [x] TypeScript compilation successful

### 2. Environment Setup

#### Supabase Project
- [ ] Production Supabase project created
- [ ] Database migrations run
- [ ] RLS policies verified
- [ ] Edge Functions deployed
- [ ] Secrets configured

#### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-side only)
- [ ] `ENCRYPTION_KEY` set (32+ characters)
- [ ] Google OAuth credentials configured
- [ ] Microsoft OAuth credentials configured
- [ ] All redirect URIs configured in OAuth providers

### 3. Cron Jobs Deployment ⚠️ CRITICAL

**Follow:** `CRON_JOBS_SETUP_GUIDE.md`

- [ ] Enable `pg_cron` extension in Supabase
- [ ] Set database settings (`app.settings.supabase_url`)
- [ ] Deploy `refresh-tokens` Edge Function
- [ ] Set all Edge Function secrets
- [ ] Run cron jobs migration
- [ ] Verify cron jobs are scheduled
- [ ] Test cron job execution
- [ ] Monitor first few executions

**Time Required:** 2-3 hours

### 4. Edge Functions

#### Already Deployed ✅
- [x] `process-emails` - Deployed and active

#### Needs Deployment ⚠️
- [ ] `refresh-tokens` - Code ready, needs deployment
  - File: `supabase/functions/refresh-tokens/index.ts`
  - Deployment: Via Supabase Dashboard or CLI

#### Verification
- [ ] Test `process-emails` manually
- [ ] Test `refresh-tokens` manually
- [ ] Verify `send-reminders` exists and works

**Time Required:** 30 minutes

### 5. Storage Adapters Testing

- [ ] Supabase Storage - Verified working
- [ ] Google Drive - Verified working
- [ ] OneDrive - Needs end-to-end testing
  - Test OAuth flow
  - Test upload
  - Test download
  - Test token refresh

**Time Required:** 2-3 hours

### 6. Frontend Deployment

#### Vercel (Recommended)
- [ ] Connect repository to Vercel
- [ ] Configure environment variables
- [ ] Set build settings:
  - Root directory: `apps/web`
  - Build command: `npm run build`
  - Output directory: `.next`
- [ ] Deploy and verify

#### Alternative Platforms
- [ ] Configure Next.js production build
- [ ] Set up environment variables
- [ ] Configure routing
- [ ] Test deployment

**Time Required:** 1 hour

### 7. Security Review

- [ ] Verify RLS policies on all tables
- [ ] Check for exposed secrets (none in code)
- [ ] Verify encryption key is set
- [ ] Test OAuth redirect URIs
- [ ] Review API endpoint security
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify CORS settings

**Time Required:** 2-3 hours

### 8. Testing

#### E2E Tests
- [ ] Run `npm run test:e2e`
- [ ] Fix any failing tests
- [ ] Verify critical flows work

#### Manual Testing
- [ ] Test authentication flows
- [ ] Test document request creation
- [ ] Test email sending
- [ ] Test document processing
- [ ] Test storage uploads/downloads
- [ ] Test routing rules
- [ ] Test status tracking

**Time Required:** 4-6 hours

### 9. Monitoring Setup

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure Supabase monitoring
- [ ] Set up cron job monitoring
- [ ] Configure alerts for failures
- [ ] Set up performance monitoring

**Time Required:** 2-3 hours

### 10. Documentation

- [x] README.md complete
- [x] Deployment guides created
- [x] Testing documentation
- [ ] User guide (optional)
- [ ] API documentation (optional)

---

## 🚀 Deployment Steps

### Step 1: Supabase Setup (Day 1)

1. **Create Production Project**
   ```bash
   # Via Supabase Dashboard
   # Create new project for production
   ```

2. **Run Migrations**
   ```bash
   # Via Supabase Dashboard SQL Editor
   # Run all migrations in order from supabase/migrations/
   ```

3. **Verify RLS Policies**
   ```sql
   -- Check all tables have RLS enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename NOT LIKE 'pg_%';
   ```

4. **Set Environment Variables**
   - Via Supabase Dashboard → Settings → API
   - Note down URL and keys

### Step 2: Edge Functions (Day 1)

1. **Deploy Functions**
   - Via Dashboard: Edge Functions → Create/Deploy
   - Or via CLI: `supabase functions deploy <name>`

2. **Set Secrets**
   - Edge Functions → Settings → Secrets
   - Add all required secrets

3. **Test Functions**
   - Use Supabase Dashboard → Edge Functions → Invoke
   - Or use curl/Postman

### Step 3: Cron Jobs (Day 1-2)

1. **Enable Extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Configure Settings**
   - Set database settings
   - Or configure via secrets (better)

3. **Run Migration**
   ```sql
   -- Run supabase/migrations/20250103000001_update_cron_jobs_config.sql
   ```

4. **Verify**
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE '%email%';
   ```

### Step 4: Frontend Deployment (Day 2)

1. **Prepare Environment**
   - Copy `.env.example` to production
   - Fill in all values
   - Verify no secrets in code

2. **Build Test**
   ```bash
   npm run build
   npm run start
   # Test locally
   ```

3. **Deploy to Vercel**
   - Connect repo
   - Configure environment variables
   - Deploy

4. **Verify Deployment**
   - Test all pages load
   - Test authentication
   - Test key features

### Step 5: Post-Deployment (Day 2-3)

1. **Smoke Tests**
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Create request works
   - [ ] Email sending works (if configured)

2. **Monitor**
   - Check Supabase logs
   - Check Edge Function logs
   - Check cron job execution
   - Monitor error rates

3. **Fix Issues**
   - Address any deployment issues
   - Fix configuration problems
   - Update documentation

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All pages load correctly
- [ ] Authentication works (login/signup)
- [ ] Email OAuth flows work
- [ ] Document requests can be created
- [ ] Email sending works
- [ ] Cron jobs are running
- [ ] Edge Functions execute successfully
- [ ] Storage uploads work
- [ ] Document downloads work
- [ ] No console errors
- [ ] No security warnings

---

## 🔍 Post-Deployment Monitoring

### Daily Checks (First Week)
- [ ] Check cron job execution logs
- [ ] Monitor Edge Function errors
- [ ] Check database performance
- [ ] Review user activity

### Weekly Checks
- [ ] Review error logs
- [ ] Check storage usage
- [ ] Review performance metrics
- [ ] Update documentation if needed

---

## 🆘 Rollback Plan

If deployment fails:

1. **Frontend Rollback**
   - Revert to previous Vercel deployment
   - Or update environment variables

2. **Database Rollback**
   - Migrations are mostly additive
   - Can disable cron jobs if needed
   - No data loss expected

3. **Edge Functions**
   - Disable problematic functions
   - Revert to previous version if deployed

---

## 📞 Support Contacts

- **Supabase Support:** https://supabase.com/support
- **Vercel Support:** https://vercel.com/support
- **Documentation:** See project docs

---

**Estimated Total Deployment Time:** 6-8 hours

**Critical Path:** Cron jobs deployment (2-3 hours) → Frontend deployment (1 hour) → Testing (4-6 hours)
