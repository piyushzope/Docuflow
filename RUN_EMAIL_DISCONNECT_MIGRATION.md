# ⚠️ Email Disconnect Migration Required

## Quick Fix

You're seeing this error because the database schema still has a NOT NULL constraint on `encrypted_access_token`. Run this migration to fix it.

## Option 1: Use Helper Script (Easiest)

Run this command to see the migration SQL:

```bash
node run-email-disconnect-migration.js
```

Then follow the instructions displayed.

## Option 2: Manual Steps

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open file: `supabase/migrations/20250104000000_allow_all_users_disconnect_email.sql`
   - Copy **ALL** the contents

4. **Run Migration**
   - Paste into SQL Editor
   - Click "Run" (or Cmd+Enter / Ctrl+Enter)
   - Wait for "Success" message

## Option 3: Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

This will apply all pending migrations.

## What This Migration Does

1. **Drops NOT NULL constraint** on `encrypted_access_token` column
   - Allows NULL values when accounts are disconnected
   
2. **Adds check constraint** to maintain data integrity
   - Active accounts (`is_active = true`) MUST have tokens
   - Disconnected accounts (`is_active = false`) CAN have NULL tokens

3. **Updates RLS policies** to allow all organization members to disconnect accounts
   - Previously only admins could disconnect

4. **Fixes existing data** by marking any accounts with NULL tokens as inactive

## After Running Migration

Once the migration is complete, the disconnect functionality will work correctly. You'll be able to:
- Disconnect email accounts as any organization member
- Clear tokens securely when disconnecting
- Reconnect accounts later without issues

## Troubleshooting

If you still see errors after running the migration:
1. Check that the migration ran successfully (no errors in SQL editor)
2. Verify the constraint was dropped: Run `\d email_accounts` in psql or check table structure
3. Check RLS policies are in place
4. Try disconnecting again

