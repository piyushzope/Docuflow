#!/bin/bash

# Manual deployment instructions and helper
# Use this if Docker is not available

set -e

ENCRYPTION_KEY="yfb42f1aa-ec8d-4a82-8262-836afa37edab"
SUPABASE_PROJECT_REF="nneyhfhdthpxmkemyenm"

echo "========================================="
echo "Manual Edge Function Deployment"
echo "========================================="
echo ""
echo "Option 1: Deploy via Supabase Dashboard (Recommended if Docker unavailable)"
echo ""
echo "1. Go to: https://app.supabase.com/project/$SUPABASE_PROJECT_REF"
echo "2. Navigate to: Edge Functions → Create Function (or select process-emails)"
echo "3. Copy the contents of: supabase/functions/process-emails/index.ts"
echo "4. Paste into the function editor"
echo "5. Click Deploy"
echo "6. Go to Secrets tab and add:"
echo "   Key: ENCRYPTION_KEY"
echo "   Value: $ENCRYPTION_KEY"
echo ""
echo "========================================="
echo "Option 2: Set Secret via CLI"
echo "========================================="
echo ""
echo "Run this command (after linking):"
echo ""
echo "supabase secrets set ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo ""

# Try to set the secret via CLI if linked
if supabase link --project-ref "$SUPABASE_PROJECT_REF" &>/dev/null; then
    echo "Attempting to set ENCRYPTION_KEY secret..."
    if supabase secrets set ENCRYPTION_KEY="$ENCRYPTION_KEY" 2>&1; then
        echo "✅ ENCRYPTION_KEY secret set successfully!"
    else
        echo "⚠️  Could not set secret automatically. Please set it manually via Dashboard."
    fi
else
    echo "⚠️  Project not linked. Run: supabase link --project-ref $SUPABASE_PROJECT_REF"
fi

echo ""
echo "========================================="
echo "Testing"
echo "========================================="
echo ""
echo "After deployment, test with:"
echo "  supabase functions invoke process-emails --no-verify-jwt"
echo "  OR"
echo "  node test-edge-function.js"
echo ""

