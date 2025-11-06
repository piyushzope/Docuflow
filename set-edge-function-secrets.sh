#!/bin/bash

# Set Edge Function Secrets for Supabase
# This script helps you set the required secrets for the process-emails function

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SUPABASE_PROJECT_REF="nneyhfhdthpxmkemyenm"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setting Edge Function Secrets${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    exit 1
fi

# Check if linked
if ! supabase link --project-ref "$SUPABASE_PROJECT_REF" &> /dev/null; then
    echo -e "${YELLOW}Linking to project...${NC}"
    supabase link --project-ref "$SUPABASE_PROJECT_REF"
fi

echo ""
echo -e "${BLUE}Setting secrets for process-emails function...${NC}"
echo ""

# Check if ENCRYPTION_KEY is set in environment
if [ -z "$ENCRYPTION_KEY" ]; then
    echo -e "${YELLOW}⚠️  ENCRYPTION_KEY not found in environment${NC}"
    echo ""
    echo "Please provide your encryption key:"
    echo "(This should be the same key used to encrypt tokens in your app)"
    read -sp "Enter ENCRYPTION_KEY: " ENCRYPTION_KEY
    echo ""
    echo ""
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    echo -e "${RED}❌ ENCRYPTION_KEY is required${NC}"
    echo ""
    echo "You can set it by:"
    echo "  export ENCRYPTION_KEY='your-key-here'"
    echo "  ./set-edge-function-secrets.sh"
    exit 1
fi

# Set the encryption key
echo -e "${BLUE}Setting ENCRYPTION_KEY...${NC}"
supabase secrets set ENCRYPTION_KEY="$ENCRYPTION_KEY"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ENCRYPTION_KEY set successfully${NC}"
else
    echo -e "${RED}❌ Failed to set ENCRYPTION_KEY${NC}"
    exit 1
fi

# Check for Microsoft OAuth credentials
if [ -z "$MICROSOFT_CLIENT_ID" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  MICROSOFT_CLIENT_ID not found in environment${NC}"
    echo ""
    echo "Do you want to set Microsoft OAuth credentials? (required for Outlook token refresh)"
    echo "Press Enter to skip, or enter your Microsoft Client ID:"
    read -r MICROSOFT_CLIENT_ID
fi

if [ -n "$MICROSOFT_CLIENT_ID" ]; then
    if [ -z "$MICROSOFT_CLIENT_SECRET" ]; then
        echo ""
        echo "Please provide your Microsoft Client Secret:"
        read -sp "Enter MICROSOFT_CLIENT_SECRET: " MICROSOFT_CLIENT_SECRET
        echo ""
    fi

    if [ -n "$MICROSOFT_CLIENT_SECRET" ]; then
        echo ""
        echo -e "${BLUE}Setting Microsoft OAuth credentials...${NC}"
        supabase secrets set MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID"
        supabase secrets set MICROSOFT_CLIENT_SECRET="$MICROSOFT_CLIENT_SECRET"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Microsoft OAuth credentials set successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Failed to set Microsoft OAuth credentials${NC}"
        fi
    fi
fi

# Check for Google OAuth credentials
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  GOOGLE_CLIENT_ID not found in environment${NC}"
    echo ""
    echo "Do you want to set Google OAuth credentials? (required for Gmail token refresh)"
    echo "Press Enter to skip, or enter your Google Client ID:"
    read -r GOOGLE_CLIENT_ID
fi

if [ -n "$GOOGLE_CLIENT_ID" ]; then
    if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
        echo ""
        echo "Please provide your Google Client Secret:"
        read -sp "Enter GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
        echo ""
    fi

    if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
        echo ""
        echo -e "${BLUE}Setting Google OAuth credentials...${NC}"
        supabase secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
        supabase secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Google OAuth credentials set successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Failed to set Google OAuth credentials${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}✅ Secrets configuration complete!${NC}"
echo ""
echo -e "${BLUE}Note:${NC} SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are usually"
echo "auto-configured by Supabase, but you can verify them in the Dashboard:"
echo "  Project Settings → Edge Functions → Secrets"
echo ""
echo -e "${YELLOW}Important:${NC} If you're using Outlook/Microsoft accounts, make sure"
echo "MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are set, otherwise"
echo "token refresh will fail with 'client_id' missing error."

