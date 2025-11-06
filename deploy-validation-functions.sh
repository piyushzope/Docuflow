#!/bin/bash

# Deploy Validation Edge Functions to Supabase
# This script deploys validate-document and send-renewal-reminders functions

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Supabase project details
SUPABASE_PROJECT_REF="nneyhfhdthpxmkemyenm"
SUPABASE_URL="https://nneyhfhdthpxmkemyenm.supabase.co"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Docuflow Validation Functions Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "Logging in..."
    supabase login
fi

echo -e "${GREEN}✅ Authenticated with Supabase${NC}"
echo ""

# Link to project
echo -e "${BLUE}🔗 Linking to project: ${SUPABASE_PROJECT_REF}${NC}"
supabase link --project-ref "$SUPABASE_PROJECT_REF" || {
    echo -e "${YELLOW}⚠️  Project may already be linked${NC}"
}

echo ""
echo -e "${BLUE}📦 Deploying validate-document Edge Function...${NC}"
echo ""

# Deploy validate-document function
supabase functions deploy validate-document --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ validate-document deployed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Failed to deploy validate-document${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Deploying send-renewal-reminders Edge Function...${NC}"
echo ""

# Deploy send-renewal-reminders function
supabase functions deploy send-renewal-reminders --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ send-renewal-reminders deployed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Failed to deploy send-renewal-reminders${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}1. Set OpenAI API Key:${NC}"
echo "   supabase secrets set OPENAI_API_KEY=\"your-openai-api-key\""
echo ""
echo -e "${YELLOW}2. Run cron job migration:${NC}"
echo "   node run-migration.js supabase/migrations/20250112000001_add_renewal_reminders_cron_job.sql"
echo ""
echo -e "${YELLOW}3. Verify deployment:${NC}"
echo "   node verify-validation-setup.js"
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

