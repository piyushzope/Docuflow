#!/bin/bash

# Comprehensive Deployment Verification Script
# Checks Edge Functions, Cron Jobs, Database Settings, and System Health

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Docuflow Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load environment variables
if [ -f "apps/web/.env.local" ]; then
    source apps/web/.env.local
elif [ -f ".env.local" ]; then
    source .env.local
else
    echo -e "${YELLOW}⚠️  .env.local not found - some checks may be skipped${NC}"
fi

SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}
SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-""}

# Function to check status
check_status() {
    local name=$1
    local status=$2
    local message=$3
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✅${NC} $name: $message"
        ((PASSED++))
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}❌${NC} $name: $message"
        ((FAILED++))
    else
        echo -e "${YELLOW}⚠️${NC}  $name: $message"
        ((WARNINGS++))
    fi
}

# 1. Check Supabase CLI
echo -e "${BLUE}1. Checking Supabase CLI...${NC}"
if command -v supabase &> /dev/null; then
    check_status "Supabase CLI" "pass" "Installed"
    SUPABASE_VERSION=$(supabase --version 2>/dev/null || echo "unknown")
    echo "   Version: $SUPABASE_VERSION"
else
    check_status "Supabase CLI" "fail" "Not installed - run: npm install -g supabase"
fi
echo ""

# 2. Check Edge Functions
echo -e "${BLUE}2. Checking Edge Functions...${NC}"

if command -v supabase &> /dev/null; then
    # Check if logged in
    if supabase projects list &> /dev/null; then
        FUNCTIONS=$(supabase functions list 2>/dev/null || echo "")
        
        # Check process-emails
        if echo "$FUNCTIONS" | grep -q "process-emails"; then
            check_status "process-emails" "pass" "Deployed"
        else
            check_status "process-emails" "fail" "Not deployed - needs deployment"
        fi
        
        # Check refresh-tokens
        if echo "$FUNCTIONS" | grep -q "refresh-tokens"; then
            check_status "refresh-tokens" "pass" "Deployed"
        else
            check_status "refresh-tokens" "fail" "Not deployed - needs deployment"
        fi
        
        # Check send-reminders
        if echo "$FUNCTIONS" | grep -q "send-reminders"; then
            check_status "send-reminders" "pass" "Deployed"
        else
            check_status "send-reminders" "fail" "Not deployed - needs deployment"
        fi
    else
        check_status "Supabase Auth" "fail" "Not logged in - run: supabase login"
    fi
else
    check_status "Edge Functions" "warn" "Cannot check - Supabase CLI not installed"
fi
echo ""

# 3. Test Edge Functions via HTTP (if credentials available)
echo -e "${BLUE}3. Testing Edge Functions via HTTP...${NC}"

if [ -n "$SUPABASE_URL" ] && [ -n "$SERVICE_ROLE_KEY" ]; then
    echo "   Supabase URL: ${SUPABASE_URL:0:50}..."
    
    # Test process-emails
    echo -n "   Testing process-emails... "
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/functions/v1/process-emails" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "ERROR\n500")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        check_status "process-emails HTTP" "pass" "Responding (200)"
    elif [ "$HTTP_CODE" = "404" ]; then
        check_status "process-emails HTTP" "fail" "Not found (404) - needs deployment"
    else
        check_status "process-emails HTTP" "warn" "Error ($HTTP_CODE)"
    fi
    
    # Test refresh-tokens
    echo -n "   Testing refresh-tokens... "
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/functions/v1/refresh-tokens" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "ERROR\n500")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        check_status "refresh-tokens HTTP" "pass" "Responding (200)"
    elif [ "$HTTP_CODE" = "404" ]; then
        check_status "refresh-tokens HTTP" "fail" "Not found (404) - needs deployment"
    else
        check_status "refresh-tokens HTTP" "warn" "Error ($HTTP_CODE)"
    fi
    
    # Test send-reminders
    echo -n "   Testing send-reminders... "
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/functions/v1/send-reminders" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "ERROR\n500")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        check_status "send-reminders HTTP" "pass" "Responding (200)"
    elif [ "$HTTP_CODE" = "404" ]; then
        check_status "send-reminders HTTP" "fail" "Not found (404) - needs deployment"
    else
        check_status "send-reminders HTTP" "warn" "Error ($HTTP_CODE)"
    fi
else
    check_status "Edge Functions HTTP" "warn" "Cannot test - missing SUPABASE_URL or SERVICE_ROLE_KEY"
fi
echo ""

# 4. Check Environment Variables
echo -e "${BLUE}4. Checking Environment Variables...${NC}"

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -n "$SUPABASE_URL" ]; then
    check_status "SUPABASE_URL" "pass" "Set"
else
    check_status "SUPABASE_URL" "fail" "Not set"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    check_status "SERVICE_ROLE_KEY" "pass" "Set"
else
    check_status "SERVICE_ROLE_KEY" "fail" "Not set"
fi

if [ -n "$ENCRYPTION_KEY" ]; then
    check_status "ENCRYPTION_KEY" "pass" "Set"
else
    check_status "ENCRYPTION_KEY" "warn" "Not set in .env.local (may be set in Supabase)"
fi
echo ""

# 5. Check File Existence
echo -e "${BLUE}5. Checking Required Files...${NC}"

if [ -f "supabase/functions/process-emails/index.ts" ]; then
    check_status "process-emails code" "pass" "Exists"
else
    check_status "process-emails code" "fail" "Missing"
fi

if [ -f "supabase/functions/refresh-tokens/index.ts" ]; then
    check_status "refresh-tokens code" "pass" "Exists"
else
    check_status "refresh-tokens code" "fail" "Missing"
fi

if [ -f "supabase/functions/send-reminders/index.ts" ]; then
    check_status "send-reminders code" "pass" "Exists"
else
    check_status "send-reminders code" "fail" "Missing"
fi

if [ -f "setup-cron-jobs.sql" ]; then
    check_status "Cron jobs SQL" "pass" "Exists"
else
    check_status "Cron jobs SQL" "fail" "Missing"
fi

if [ -f "verify-cron-jobs.sql" ]; then
    check_status "Verification SQL" "pass" "Exists"
else
    check_status "Verification SQL" "fail" "Missing"
fi
echo ""

# 6. Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Passed:${NC} $PASSED"
echo -e "${RED}❌ Failed:${NC} $FAILED"
echo -e "${YELLOW}⚠️  Warnings:${NC} $WARNINGS"
echo ""

# Overall Status
if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 All checks passed! System is ready.${NC}"
    else
        echo -e "${YELLOW}⚠️  System is mostly ready, but has some warnings.${NC}"
    fi
else
    echo -e "${RED}❌ Some checks failed. Please review and fix issues.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review failed checks above"
    echo "2. See QUICK_START_DEPLOYMENT.md for deployment guide"
    echo "3. Run this script again after fixes"
fi

echo ""
echo -e "${BLUE}For detailed deployment instructions, see:${NC}"
echo "  - QUICK_START_DEPLOYMENT.md"
echo "  - PROJECT_STATUS_MASTER.md"
echo ""

exit $FAILED

