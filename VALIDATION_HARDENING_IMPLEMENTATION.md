# Validation Hardening Implementation Summary

## Overview

This document summarizes the implementation of the validation hardening plan, which strengthens the document validation process through improved request intake, enhanced LLM prompts, duplicate detection, resilience mechanisms, auditability, rate limiting, and OCR preparation.

## Completed PRs

### PR1: Request Intake Hardening ✅

**Files Modified:**
- `supabase/migrations/20250113000000_harden_request_intake.sql` - New migration
- `apps/web/lib/validation/request-schemas.ts` - New Zod validation schemas
- `apps/web/app/api/requests/create/route.ts` - Added validation
- `apps/web/app/api/requests/[id]/update/route.ts` - Added validation
- `apps/web/package.json` - Added zod dependency

**Changes:**
- Created `document_request_types` lookup table with standardized types
- Added `normalize_request_type()` function to standardize request types
- Added Zod schemas for request creation and updates
- Enforced standardized request type codes (passport, drivers_license, id_card, etc.)
- Backfilled existing request types with normalized values

### PR2: Prompt Context & Safer LLM Call ✅

**Files Modified:**
- `supabase/functions/validate-document/index.ts`

**Changes:**
- Added `PROMPT_VERSION = '1.1.0'` constant for tracking
- Enhanced `classifyDocumentWithLLM()` to accept request context
- Added request context (requested type, due date, org policy thresholds) to prompts when flag enabled
- Improved JSON parsing with validation and normalization
- Added 60-second timeout with AbortController
- Better error handling with detailed error messages
- Feature flag: `validation.prompt_context.enabled` (default: false)

### PR3: Authenticity & Duplicate Detection ✅

**Files Modified:**
- `supabase/migrations/20250113000001_add_content_hash_duplicate_detection.sql` - New migration
- `supabase/functions/validate-document/index.ts`

**Changes:**
- Added `content_hash` column to `documents` table
- Created `find_duplicate_documents()` function for efficient duplicate lookups
- Enhanced `checkAuthenticity()` to compute SHA-256 hash and detect duplicates
- Stores content hash in document record
- Adds duplicate warnings (non-blocking unless strict mode enabled)
- Feature flag: `validation.authenticity.strict` (default: false)

### PR4: Resilience - Retry Queue + DLQ ✅

**Files Modified:**
- `supabase/migrations/20250113000002_add_validation_queue_system.sql` - New migration
- `supabase/migrations/20250113000003_add_validation_worker_cron.sql` - New migration
- `supabase/functions/validation-worker/index.ts` - New edge function
- `supabase/functions/process-emails/index.ts`

**Changes:**
- Created `validation_jobs` table for queued validation tasks
- Created `validation_dlq` (Dead Letter Queue) table for failed validations
- Implemented exponential backoff (1m, 5m, 15m, 1h, 6h, 24h)
- Created `validation-worker` edge function to process queued jobs
- Added cron job to run worker every 5 minutes
- Updated `process-emails` to enqueue jobs when flag enabled
- Feature flag: `validation.queue.enabled` (default: false)

### PR5: Auditability & Analytics ✅

**Files Modified:**
- `supabase/migrations/20250113000004_add_validation_executions.sql` - New migration
- `supabase/functions/validate-document/index.ts`

**Changes:**
- Created `validation_executions` table to track every validation run
- Tracks: start/finish time, duration, model used, token usage, status, errors
- Records who triggered validation (system, manual, queue, user_id)
- Added `get_validation_execution_stats()` function for analytics
- Execution records created for all validations (success or failure)

### PR6: Manual Validate Hardening & Rate Limits ✅

**Files Modified:**
- `apps/web/app/api/documents/[id]/validate/route.ts`

**Changes:**
- Added rate limiting for manual validations (default: 10 per 60 seconds)
- Configurable via `validation.rate_limit.windowSeconds` and `validation.rate_limit.maxRequests`
- Passes `x-triggered-by` and `x-triggered-by-user-id` headers to edge function
- Returns 429 error when rate limit exceeded

### PR7: OCR Pilot (Guarded) ✅

**Files Modified:**
- `supabase/functions/validate-document/index.ts`

**Changes:**
- Added OCR feature flag check: `validation.ocr.enabled`
- Enhanced `extractTextFromDocument()` to accept OCR flag
- Added TODO comments for future OCR integration (Google Vision API, Azure Computer Vision)
- Currently returns empty string (no functional change until OCR is implemented)

## Feature Flags

All new features are behind feature flags in `organizations.settings`:

```json
{
  "validation": {
    "prompt_context": {
      "enabled": false
    },
    "queue": {
      "enabled": false
    },
    "authenticity": {
      "strict": false
    },
    "rate_limit": {
      "windowSeconds": 60,
      "maxRequests": 10
    },
    "ocr": {
      "enabled": false
    }
  }
}
```

## Database Migrations

1. `20250113000000_harden_request_intake.sql` - Request type standardization
2. `20250113000001_add_content_hash_duplicate_detection.sql` - Content hash and duplicates
3. `20250113000002_add_validation_queue_system.sql` - Queue and DLQ tables
4. `20250113000003_add_validation_worker_cron.sql` - Cron job for worker
5. `20250113000004_add_validation_executions.sql` - Execution tracking

All migrations are idempotent and non-breaking.

## Deployment Checklist

1. **Run Migrations:**
   ```bash
   node run-migration.js supabase/migrations/20250113000000_harden_request_intake.sql
   node run-migration.js supabase/migrations/20250113000001_add_content_hash_duplicate_detection.sql
   node run-migration.js supabase/migrations/20250113000002_add_validation_queue_system.sql
   node run-migration.js supabase/migrations/20250113000003_add_validation_worker_cron.sql
   node run-migration.js supabase/migrations/20250113000004_add_validation_executions.sql
   ```

2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy validate-document
   supabase functions deploy validation-worker
   ```

3. **Install Dependencies:**
   ```bash
   cd apps/web && npm install
   ```

4. **Verify Cron Job:**
   ```sql
   SELECT jobid, jobname, schedule, active 
   FROM cron.job 
   WHERE jobname = 'validation-worker';
   ```

## Testing

- All changes are backward compatible (flags default to false)
- Existing validation flow unchanged unless flags are enabled
- Test with flags disabled first, then enable incrementally per organization

## Next Steps

1. Enable `prompt_context` for a pilot organization
2. Monitor validation execution stats
3. Enable `queue` for organizations with high volume
4. Review DLQ entries for patterns
5. Implement OCR integration when ready (PR7 placeholder)

## Notes

- All migrations are idempotent and safe to run multiple times
- Feature flags allow gradual rollout
- No breaking changes to existing functionality
- Rate limiting uses database queries (consider Redis for high-scale production)

