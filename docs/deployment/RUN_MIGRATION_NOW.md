# ⚠️ IMPORTANT: Run Database Migration

The error "Could not find the 'avatar_url' column" means the employee directory migration hasn't been applied to your database yet.

## Quick Fix - Run the Migration

### Option 1: Supabase Dashboard (Easiest)

1. Go to https://app.supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of this file:
   `supabase/migrations/20240101000007_add_employee_directory_fields.sql`
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
7. Wait for confirmation that it executed successfully

### Option 2: Supabase CLI

```bash
supabase db push
```

This will apply all pending migrations.

## Verify Migration Ran Successfully

After running the migration, verify the columns exist:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('avatar_url', 'job_title', 'department', 'team', 'phone', 'skills', 'bio', 'location');
```

You should see all 8 columns listed.

## After Migration

Once the migration is complete:
1. Refresh your Next.js app (or restart the dev server)
2. The employee directory should work without errors
3. You can now add employees with all the new fields

