# Deployment Guide - Docuflow Edge Function

This guide walks you through deploying the document routing fixes to your Supabase project.

## Your Supabase Project Details

- **Project Reference**: `nneyhfhdthpxmkemyenm`
- **URL**: `https://nneyhfhdthpxmkemyenm.supabase.co`
- **Anon Key**: Configured (from your .env)

---

## Quick Start

### Step 1: Install Supabase CLI (if not already installed)

```bash
# Using npm
npm install -g supabase

# Using Homebrew (macOS)
brew install supabase/tap/supabase
```

### Step 2: Authenticate

```bash
supabase login
```

Follow the prompts to authenticate with your Supabase account.

### Step 3: Link to Your Project

```bash
supabase link --project-ref nneyhfhdthpxmkemyenm
```

Or use the provided script:
```bash
chmod +x deploy-edge-function.sh
./deploy-edge-function.sh
```

### Step 4: Deploy the Edge Function

```bash
supabase functions deploy process-emails --no-verify-jwt
```

Or use the provided script:
```bash
./deploy-edge-function.sh
```

### Step 5: Set Environment Secrets

The Edge Function needs the `ENCRYPTION_KEY` secret. Set it using:

```bash
# Option 1: Using the provided script
chmod +x set-edge-function-secrets.sh
export ENCRYPTION_KEY="your-encryption-key"
./set-edge-function-secrets.sh

# Option 2: Using Supabase CLI directly
supabase secrets set ENCRYPTION_KEY="your-encryption-key"

# Option 3: Via Dashboard
# Go to: Project Settings → Edge Functions → Secrets
# Add: ENCRYPTION_KEY = your-encryption-key
```

**Important**: The `ENCRYPTION_KEY` must be the same key used in your application to encrypt/decrypt OAuth tokens. If you're not sure what it is, check your application's encryption utility.

### Step 6: Test the Deployment

```bash
# Test using the provided script
node test-edge-function.js

# Or manually invoke the function
supabase functions invoke process-emails --no-verify-jwt

# Or via HTTP
curl -X POST \
  'https://nneyhfhdthpxmkemyenm.supabase.co/functions/v1/process-emails' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## Manual Deployment (Alternative)

If you prefer to deploy via the Supabase Dashboard:

1. Go to: https://app.supabase.com/project/nneyhfhdthpxmkemyenm
2. Navigate to: **Edge Functions** → **process-emails**
3. Copy the contents of `supabase/functions/process-emails/index.ts`
4. Paste into the function editor
5. Click **Deploy**
6. Go to **Secrets** tab and add `ENCRYPTION_KEY`

---

## Verification Checklist

After deployment, verify:

- [ ] Edge Function deployed successfully (no errors in deployment logs)
- [ ] `ENCRYPTION_KEY` secret is set
- [ ] Function can be invoked manually
- [ ] Function logs show no errors
- [ ] Test email response is processed correctly
- [ ] Document appears in correct OneDrive folder
- [ ] Document is linked to request in database

---

## Troubleshooting

### Error: "Project not found"

- Verify the project reference: `nneyhfhdthpxmkemyenm`
- Check that you're logged in: `supabase login`
- Try linking again: `supabase link --project-ref nneyhfhdthpxmkemyenm`

### Error: "Function not found"

- The function name must be `process-emails`
- Check that the folder exists: `supabase/functions/process-emails/`
- Verify the file exists: `supabase/functions/process-emails/index.ts`

### Error: "ENCRYPTION_KEY not set"

- Set the secret: `supabase secrets set ENCRYPTION_KEY="your-key"`
- Verify it's set: Check Dashboard → Edge Functions → Secrets

### Function Returns Errors

- Check logs: `supabase functions logs process-emails`
- Verify database connection
- Check that email accounts are configured
- Verify storage configs are active

---

## Viewing Logs

```bash
# View recent logs
supabase functions logs process-emails

# Follow logs in real-time
supabase functions logs process-emails --follow

# View logs in Dashboard
# Go to: Edge Functions → process-emails → Logs
```

---

## Environment Variables

The Edge Function uses these environment variables (auto-configured by Supabase):

- `SUPABASE_URL` - Auto-set to your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set from project settings
- `ENCRYPTION_KEY` - **You must set this manually**

---

## Next Steps After Deployment

1. **Test the function manually** using `test-edge-function.js`
2. **Send a test document request** from your dashboard
3. **Have a user reply** with an attachment
4. **Trigger email processing** (manually or wait for cron job)
5. **Verify the document** appears in the correct OneDrive folder
6. **Check the database** to ensure document is linked to request

For detailed testing scenarios, see `NEXT_STEPS_DOCUMENT_ROUTING.md`

