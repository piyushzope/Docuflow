# Database Setup Guide

This guide will help you set up your Supabase database for Docuflow.

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Create a Supabase Project
1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details (name, database password, region)
4. Wait for the project to be created

### Step 2: Run Migrations
1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of each migration file in order:
   - `supabase/migrations/20240101000000_initial_schema.sql`
   - `supabase/migrations/20240101000001_rls_policies.sql`
   - `supabase/migrations/20240101000002_create_profile_trigger.sql`
4. Click **Run** after each migration
5. Verify the tables were created by going to **Table Editor**

### Step 3: Get Your API Keys
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 4: Update Environment Variables
Create or update `apps/web/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Option 2: Using Supabase CLI (Local Development)

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Link Your Project
```bash
supabase login
supabase link --project-ref your-project-ref
```

### Step 3: Run Migrations
```bash
supabase db push
```

### Step 4: Start Local Supabase (Optional)
```bash
supabase start
```

## Verification

After running migrations, you should see these tables:
- ✅ organizations
- ✅ profiles
- ✅ email_accounts
- ✅ storage_configs
- ✅ routing_rules
- ✅ document_requests
- ✅ documents
- ✅ activity_logs

## Quick SQL Check

Run this in the Supabase SQL Editor to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see all 8 tables listed above.
