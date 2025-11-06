#!/bin/bash

# Test script for process-emails Edge Function
# This script tests the function with the service role key

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing process-emails Edge Function...${NC}\n"

# Check if .env.local exists
if [ -f "apps/web/.env.local" ]; then
    source apps/web/.env.local
elif [ -f ".env.local" ]; then
    source .env.local
else
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
    exit 1
fi

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}Error: SUPABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_SERVICE_ROLE_KEY not set${NC}"
    exit 1
fi

# Use NEXT_PUBLIC_SUPABASE_URL if available, otherwise SUPABASE_URL
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}

echo -e "${GREEN}✓${NC} Supabase URL: $SUPABASE_URL"
echo -e "${GREEN}✓${NC} Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}...\n"

# Test the function
echo -e "${YELLOW}Calling process-emails function...${NC}\n"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/process-emails" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}HTTP Status: ${HTTP_CODE}${NC}\n"
echo -e "${YELLOW}Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo -e "\n${YELLOW}Checking for errorDetails in response...${NC}"

# Check if errorDetails exists in account_results
if echo "$BODY" | jq -e '.account_results[0].errorDetails' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} errorDetails found in response (Edge Function has latest error handling)"
    ERROR_COUNT=$(echo "$BODY" | jq '.account_results[0].errorDetails | length')
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}  Error details:${NC}"
        echo "$BODY" | jq -r '.account_results[0].errorDetails[]'
    fi
else
    echo -e "${RED}✗${NC} errorDetails NOT found in response"
    echo -e "${YELLOW}  → Edge Function may need redeployment with latest error handling code${NC}"
    echo -e "${YELLOW}  → Run: supabase functions deploy process-emails${NC}"
fi

# Check for errors
ERRORS=$(echo "$BODY" | jq -r '.errors // 0')
if [ "$ERRORS" -gt 0 ]; then
    echo -e "\n${RED}⚠ ${ERRORS} error(s) occurred during processing${NC}"
else
    echo -e "\n${GREEN}✓ No errors${NC}"
fi

