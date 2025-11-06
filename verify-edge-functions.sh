#!/bin/bash

# Verify Edge Functions Deployment Status
# This script checks if Edge Functions are deployed and accessible

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SUPABASE_PROJECT_REF="nneyhfhdthpxmkemyenm"
SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Edge Functions Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if service role key is provided
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_SERVICE_ROLE_KEY not set in environment${NC}"
    echo ""
    echo "Please set it:"
    echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    echo ""
    echo "Or provide it now:"
    read -sp "Enter SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
    echo ""
    echo ""
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is required${NC}"
    exit 1
fi

echo -e "${BLUE}Testing Edge Functions...${NC}"
echo ""

# Function to test an Edge Function
test_function() {
    local function_name=$1
    local url="${SUPABASE_URL}/functions/v1/${function_name}"
    
    echo -n "Testing ${function_name}... "
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${url}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' \
        2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ DEPLOYED${NC}"
        echo "  Response: $(echo "$body" | jq -r '.message // .success // "OK"' 2>/dev/null || echo "$body" | head -c 100)"
        return 0
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}❌ NOT DEPLOYED${NC}"
        echo "  Error: Function not found (404)"
        return 1
    elif [ "$http_code" = "401" ]; then
        echo -e "${YELLOW}⚠️  AUTHENTICATION ERROR${NC}"
        echo "  Error: Check your service role key"
        return 1
    else
        echo -e "${YELLOW}⚠️  ERROR (HTTP ${http_code})${NC}"
        echo "  Response: $(echo "$body" | head -c 200)"
        return 1
    fi
}

# Test each function
echo -e "${BLUE}Edge Functions Status:${NC}"
echo ""

process_emails_ok=0
refresh_tokens_ok=0
send_reminders_ok=0

if test_function "process-emails"; then
    process_emails_ok=1
fi

echo ""

if test_function "refresh-tokens"; then
    refresh_tokens_ok=1
fi

echo ""

if test_function "send-reminders"; then
    send_reminders_ok=1
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $process_emails_ok -eq 1 ]; then
    echo -e "${GREEN}✅ process-emails: Deployed${NC}"
else
    echo -e "${RED}❌ process-emails: Not deployed${NC}"
fi

if [ $refresh_tokens_ok -eq 1 ]; then
    echo -e "${GREEN}✅ refresh-tokens: Deployed${NC}"
else
    echo -e "${RED}❌ refresh-tokens: Not deployed${NC}"
    echo "   → Deploy via: Supabase Dashboard → Edge Functions → Create Function"
    echo "   → See: DEPLOY_REMAINING_FUNCTIONS.md"
fi

if [ $send_reminders_ok -eq 1 ]; then
    echo -e "${GREEN}✅ send-reminders: Deployed${NC}"
else
    echo -e "${RED}❌ send-reminders: Not deployed${NC}"
    echo "   → Deploy via: Supabase Dashboard → Edge Functions → Create Function"
    echo "   → See: DEPLOY_REMAINING_FUNCTIONS.md"
fi

echo ""

# Overall status
if [ $process_emails_ok -eq 1 ] && [ $refresh_tokens_ok -eq 1 ] && [ $send_reminders_ok -eq 1 ]; then
    echo -e "${GREEN}✅ All Edge Functions are deployed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some Edge Functions need deployment${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Read DEPLOY_REMAINING_FUNCTIONS.md"
    echo "  2. Deploy missing functions via Supabase Dashboard"
    echo "  3. Run this script again to verify"
    exit 1
fi

