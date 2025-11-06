# Deploy Edge Function via Supabase Dashboard

Since Docker is not running, deploy the function manually through the Supabase Dashboard.

## Steps:

### 1. Open Supabase Dashboard
Go to: **https://app.supabase.com/project/nneyhfhdthpxmkemyenm**

### 2. Navigate to Edge Functions
- Click **Edge Functions** in the left sidebar
- Click **Create Function** (or edit `process-emails` if it already exists)

### 3. Copy Function Code
The function code is in: `supabase/functions/process-emails/index.ts`

You can copy it using:
```bash
cat supabase/functions/process-emails/index.ts | pbcopy  # macOS
# or open the file and copy manually
```

### 4. Deploy
- Paste the code into the function editor
- Function name: `process-emails`
- Click **Deploy**

### 5. Verify Secrets
- Go to **Project Settings** → **Edge Functions** → **Secrets**
- Verify `ENCRYPTION_KEY` is set to: `yfb42f1aa-ec8d-4a82-8262-836afa37edab`
- ✅ **Already set via CLI!**

### 6. Test the Function
After deployment, test it:
```bash
node test-edge-function.js
```

Or manually:
```bash
supabase functions invoke process-emails --no-verify-jwt
```

## Status:
- ✅ Project linked
- ✅ ENCRYPTION_KEY secret set
- ⏳ Function deployment (pending - use Dashboard)

