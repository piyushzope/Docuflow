# Document Request Status Tracking - Implementation Summary

## Overview

Enhanced document request tracking with comprehensive status history, document counting, and automatic status transitions.

## Features Implemented

### 1. Status History Table ✅
- **Table**: `document_request_status_history`
- Tracks all status changes with:
  - Old and new status
  - Who changed it (`changed_by`)
  - When it changed (`created_at`)
  - Reason (optional)
  - Metadata (document counts, timestamps)

### 2. Enhanced Status Tracking Fields ✅
Added to `document_requests` table:
- `document_count` - Current number of documents linked
- `expected_document_count` - Expected number of documents (optional)
- `last_status_change` - Timestamp of last status change
- `status_changed_by` - User who changed the status

### 3. New Status: 'verifying' ✅
Added new status to track documents being verified:
- **Status Flow**: `pending` → `sent` → `received` → `verifying` → `completed`
- Used when documents are received but verification is in progress

### 4. Automatic Status Transitions ✅

#### When Documents Are Received:
1. **Email received with attachments** → Status: `received` → `verifying`
2. **All expected documents received** → Status: `verifying` → `completed` (auto)
3. **Document count updated automatically** via triggers

#### Status Rules:
- **No documents received**: `received`
- **Documents received but < expected**: `verifying`
- **Documents received and >= expected**: `completed` (auto)
- **Manual status changes**: Tracked with `status_changed_by`

### 5. Automatic Document Count Tracking ✅
- Trigger automatically updates `document_count` when documents are added/removed
- Trigger automatically transitions status when documents are received

### 6. Database Functions ✅

#### `log_document_request_status_change()`
- Automatically logs all status changes to history table
- Triggered on `document_requests` table updates

#### `update_document_request_count(request_id)`
- Updates document count for a specific request
- Called automatically via trigger

#### `auto_complete_document_request(request_id)`
- Automatically marks request as completed when expected documents are received
- Returns true if auto-completed, false otherwise

### 7. Status Summary View ✅
- **View**: `document_request_status_summary`
- Provides comprehensive status information including:
  - Document counts (actual vs expected)
  - Status history count
  - Last status change information
  - Whether all documents received

## Migration File

**File**: `supabase/migrations/20250106000000_add_document_request_status_tracking.sql`

### To Apply:
```bash
# Via Supabase Dashboard
# Copy and paste the migration SQL and run it

# Via CLI (if linked)
supabase db push
```

## API Updates

### Create Request (`/api/requests/create`)
Now accepts:
- `expected_document_count` (optional) - Number of documents expected
- Automatically sets `status_changed_by` to creator

### Update Request (`/api/requests/[id]/update`)
Now accepts:
- `expected_document_count` (optional) - Update expected count
- `status` - Now supports 'verifying' status
- Automatically tracks `status_changed_by` when status changes

### Edge Function Updates
- Enhanced status transitions based on document count
- Automatic document counting
- Better status tracking when emails are processed

## Status Flow Examples

### Example 1: Basic Flow
1. Request created → Status: `pending`
2. Email sent → Status: `sent`
3. Email received with 1 document → Status: `received` → `verifying` (no expected count)
4. Admin marks complete → Status: `completed`

### Example 2: With Expected Count
1. Request created (expected: 3) → Status: `pending`
2. Email sent → Status: `sent`
3. Email received with 1 document → Status: `received` → `verifying` (1/3)
4. Second email with 2 documents → Status: `verifying` (3/3)
5. Auto-complete triggered → Status: `completed`

### Example 3: Manual Status Change
1. Request in `verifying` status
2. Admin marks as `missing_files` → Status: `missing_files`
3. Status change logged with admin's user ID

## Querying Status History

### Get Status History for a Request
```sql
SELECT 
  old_status,
  new_status,
  changed_by,
  created_at,
  metadata
FROM document_request_status_history
WHERE document_request_id = 'request-id'
ORDER BY created_at DESC;
```

### Get Status Summary
```sql
SELECT *
FROM document_request_status_summary
WHERE organization_id = 'org-id'
  AND status = 'verifying';
```

### Get Requests Needing Attention
```sql
SELECT *
FROM document_request_status_summary
WHERE status IN ('received', 'verifying')
  AND (
    expected_document_count IS NULL 
    OR document_count < expected_document_count
  )
ORDER BY due_date ASC;
```

## Benefits

1. **Full Audit Trail** - Every status change is logged
2. **Automatic Tracking** - Document counts update automatically
3. **Smart Transitions** - Status changes based on document counts
4. **Better Visibility** - See exactly when and why status changed
5. **Accountability** - Track who changed status and when

## Next Steps

1. **Run Migration** - Apply the migration to your database
2. **Update Edge Function** - Redeploy with new status tracking code
3. **Update UI** - Add status history view in dashboard
4. **Test Flow** - Test with real document requests

## Files Modified

- ✅ `supabase/migrations/20250106000000_add_document_request_status_tracking.sql` - New migration
- ✅ `supabase/functions/process-emails/index.ts` - Enhanced status tracking
- ✅ `apps/web/app/api/requests/create/route.ts` - Accept expected_document_count
- ✅ `apps/web/app/api/requests/[id]/update/route.ts` - Support status tracking
- ✅ `packages/shared/src/index.ts` - Added 'verifying' status

