# Quick Deployment Guide

## Your Supabase Project
- **URL**: `https://nneyhfhdthpxmkemyenm.supabase.co`
- **Project Ref**: `nneyhfhdthpxmkemyenm`

## 3-Step Deployment

### 1. Login & Link
```bash
supabase login
supabase link --project-ref nneyhfhdthpxmkemyenm
```

### 2. Deploy Function
```bash
supabase functions deploy process-emails --no-verify-jwt
```

Or use the script:
```bash
./deploy-edge-function.sh
```

### 3. Set Encryption Key
```bash
supabase secrets set ENCRYPTION_KEY="your-encryption-key-here"
```

Or use the script:
```bash
export ENCRYPTION_KEY="your-encryption-key-here"
./set-edge-function-secrets.sh
```

## Test It
```bash
# Test everything
node test-edge-function.js

# Or manually invoke
supabase functions invoke process-emails --no-verify-jwt
```

## Done! ✅

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

