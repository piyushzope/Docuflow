# Test Scripts

Scripts for testing and verifying the email-to-storage pipeline.

## Prerequisites

1. **Install dependencies** (if not already installed):
   ```bash
   npm install -D tsx dotenv
   ```

2. **Environment variables** - Ensure `apps/web/.env.local` contains:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_KEY` (for verify-storage-uploads.ts)

## Available Scripts

### test-email-processing.ts

Tests the end-to-end email processing pipeline:
- Checks active email accounts
- Verifies storage configurations
- Triggers email processing
- Shows recent documents and their verification status

**Usage:**
```bash
npx tsx scripts/test-email-processing.ts
```

**Expected output:**
- List of active email accounts
- Storage configuration status
- Email processing results (processed count, errors)
- Recent documents with upload verification status

### verify-storage-uploads.ts

Verifies that all documents in the database actually exist in their configured storage locations.

**Usage:**
```bash
# Check verification status (read-only)
npx tsx scripts/verify-storage-uploads.ts

# Update verification status in database
npx tsx scripts/verify-storage-uploads.ts --fix
```

**What it does:**
- Fetches all documents with storage paths
- For each document, verifies the file exists in storage:
  - OneDrive: Checks via Microsoft Graph API
  - Google Drive: Checks via Google Drive API
  - Supabase Storage: Checks via Supabase Storage API
- Reports verification status
- With `--fix` flag: Updates document records with verification status

**Expected output:**
- Count of verified, not found, and error documents
- Summary statistics

## Troubleshooting

### Module not found errors

If you get errors about missing modules:
```bash
# Install dependencies
npm install -D tsx dotenv

# Or install globally
npm install -g tsx
```

### Environment variable errors

If scripts can't find environment variables:
1. Check that `apps/web/.env.local` exists
2. Verify all required variables are set
3. Ensure you're running from the project root

### TypeScript errors

If you get TypeScript errors:
```bash
# Install TypeScript if needed
npm install -D typescript @types/node
```

## Notes

- Scripts use `npx tsx` which automatically handles TypeScript compilation
- Environment variables are loaded from `apps/web/.env.local`
- Scripts require database access via Supabase service role key
- Storage verification requires valid OAuth tokens in storage configs

