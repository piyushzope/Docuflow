# Apply Status Tracking Migration

## Step 1: Run Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/nneyhfhdthpxmkemyenm
   - Navigate to **SQL Editor**

2. **Create New Query**
   - Click **New Query**
   - Copy the entire contents of: `supabase/migrations/20250106000000_add_document_request_status_tracking.sql`
   - Paste into the SQL editor

3. **Run Migration**
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - Wait for completion
   - Check for any errors in the output

4. **Verify Migration**
   ```sql
   -- Check if table was created
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'document_request_status_history';
   
   -- Check if view exists
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_name = 'document_request_status_summary';
   
   -- Check if new columns exist
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'document_requests' 
   AND column_name IN ('document_count', 'expected_document_count', 'last_status_change', 'status_changed_by');
   ```

### Option B: Via Supabase CLI

```bash
# Link to project (if not already)
supabase link --project-ref nneyhfhdthpxmkemyenm

# Push migration
supabase db push
```

## Step 2: Redeploy Edge Function

After migration is applied, redeploy the Edge Function:

```bash
npx supabase@beta functions deploy process-emails --use-api
```

Or manually via Dashboard:
1. Go to **Edge Functions** → **process-emails**
2. Copy updated code from: `supabase/functions/process-emails/index.ts`
3. Paste and click **Deploy**

## Step 3: Verify Everything Works

### Check Migration Applied

```sql
-- Should return rows if migration was successful
SELECT COUNT(*) as history_count 
FROM document_request_status_history;

-- Check triggers exist
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%document_request%';
```

### Test Status Tracking

1. Create a test document request
2. Update its status
3. Check status history:
   ```sql
   SELECT * 
   FROM document_request_status_history 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## What Was Added

✅ **Status History Table** - Tracks all status changes  
✅ **Document Count Fields** - Automatic counting  
✅ **New Status: 'verifying'** - For documents being verified  
✅ **Auto-completion** - When expected documents received  
✅ **Triggers** - Automatic status logging and count updates  

## Troubleshooting

### Migration Fails
- Check SQL Editor for specific error messages
- Ensure you have proper permissions
- Verify no syntax errors in migration file

### Edge Function Deployment Fails
- Check function logs in Dashboard
- Verify all imports are correct
- Check environment variables are set

### Status Not Updating
- Verify triggers are created: `SELECT * FROM information_schema.triggers`
- Check trigger function exists: `SELECT * FROM pg_proc WHERE proname = 'log_document_request_status_change'`

