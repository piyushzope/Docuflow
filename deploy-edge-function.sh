#!/bin/bash

# Deploy Edge Function to Supabase
# This script deploys the process-emails Edge Function with your Supabase project

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
echo -e "${BLUE}Docuflow Edge Function Deployment${NC}"
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
echo -e "${BLUE}📦 Deploying process-emails Edge Function...${NC}"
echo ""

# Deploy the function
supabase functions deploy process-emails --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Edge Function deployed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Set ENCRYPTION_KEY secret:"
    echo "   supabase secrets set ENCRYPTION_KEY=your-encryption-key"
    echo ""
    echo "2. Test the function:"
    echo "   supabase functions invoke process-emails --no-verify-jwt"
    echo ""
    echo "3. View logs:"
    echo "   supabase functions logs process-emails"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

