#!/bin/bash

# Test script for refresh-tokens Edge Function
# This script tests the function with the service role key

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing refresh-tokens Edge Function...${NC}\n"

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
echo -e "${YELLOW}Calling refresh-tokens function...${NC}\n"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/refresh-tokens" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}HTTP Status: ${HTTP_CODE}${NC}\n"
echo -e "${YELLOW}Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo -e "\n${YELLOW}Checking response...${NC}"

# Check if function was found
if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗${NC} Function not found (404)"
    echo -e "${YELLOW}  → Edge Function may not be deployed${NC}"
    echo -e "${YELLOW}  → Run: supabase functions deploy refresh-tokens${NC}"
    exit 1
fi

# Check for success
if echo "$BODY" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS=$(echo "$BODY" | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✓${NC} Function executed successfully"
        
        REFRESHED=$(echo "$BODY" | jq -r '.refreshed // 0')
        ERRORS=$(echo "$BODY" | jq -r '.errors // 0')
        
        if [ "$REFRESHED" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Refreshed ${REFRESHED} token(s)"
        else
            echo -e "${YELLOW}ℹ${NC} No tokens needed refreshing (this is normal if no tokens are expiring)"
        fi
        
        if [ "$ERRORS" -gt 0 ]; then
            echo -e "${RED}✗${NC} ${ERRORS} error(s) occurred"
            echo -e "${YELLOW}  Error details:${NC}"
            echo "$BODY" | jq -r '.results[] | select(.success == false) | "  - \(.accountEmail): \(.error)"' 2>/dev/null || echo "  Check response for details"
        fi
    else
        echo -e "${RED}✗${NC} Function returned success: false"
        ERROR_MSG=$(echo "$BODY" | jq -r '.error // "Unknown error"')
        echo -e "${RED}  Error: ${ERROR_MSG}${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC} Response format unexpected (may be an error)"
    exit 1
fi

echo -e "\n${GREEN}✅ Test complete${NC}"

