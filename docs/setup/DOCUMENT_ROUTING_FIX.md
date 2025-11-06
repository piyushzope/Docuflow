# Document Routing Fix for Email Responses

## Problem
Documents from email responses to document requests were not being properly routed to OneDrive folders, even though routing rules were correctly configured.

## Root Causes Identified

1. **Subject Pattern Matching**: When users reply to document request emails, email clients typically add prefixes like "Re:", "Fwd:", or "FW:" to the subject line. Routing rules with subject patterns were failing to match these modified subjects.

2. **Document-Request Linking**: Documents from email responses were not being linked to their corresponding document requests in the database.

3. **Error Visibility**: OneDrive upload errors were being silently caught without proper logging.

## Solutions Implemented

### 1. Subject Normalization for Routing Rules

Added a `normalizeSubject()` helper function that:
- Removes common email prefixes: `Re:`, `Fwd:`, `FW:`, and combinations like `Re:Fwd:`, `Fwd:Re:`, etc.
- Removes bracketed prefixes like `[External]`
- Trims whitespace

The routing rule matching now checks both the original subject and the normalized subject, ensuring that rules match even when users reply to emails.

**Files Updated:**
- `supabase/functions/process-emails/index.ts`
- `apps/email-worker/src/routing.ts`
- `apps/web/lib/routing/rules-engine.ts`

### 2. Document-Request Linking

Enhanced document processing to:
- Check for matching document requests BEFORE storing documents
- Match requests by recipient email AND subject (normalized)
- Link documents to their corresponding document requests via `document_request_id`

This ensures that documents from email responses are properly associated with the original requests.

**Files Updated:**
- `supabase/functions/process-emails/index.ts`
- `apps/email-worker/src/index.ts`

### 3. Improved Error Logging

Added explicit error handling and logging for OneDrive uploads:
- Better error messages when uploads fail
- Errors are properly logged to console for debugging
- Errors are re-thrown to be caught by outer error handlers

**Files Updated:**
- `supabase/functions/process-emails/index.ts`

## Testing Recommendations

1. **Test Email Response Routing**:
   - Send a document request with a specific subject
   - Have the recipient reply with "Re: [original subject]" and attach a file
   - Verify the file is routed to the correct OneDrive folder per routing rules

2. **Test Document Request Linking**:
   - Send a document request
   - Receive a response with attachment
   - Verify in database that the document has `document_request_id` set correctly

3. **Test Subject Normalization**:
   - Create routing rules with subject patterns
   - Send test emails with various prefixes (Re:, Fwd:, etc.)
   - Verify rules still match correctly

## Impact

- ✅ Email responses now properly match routing rules regardless of subject prefixes
- ✅ Documents are correctly linked to their document requests
- ✅ Better visibility into OneDrive upload failures
- ✅ Improved reliability of document routing workflow

## Notes

- The normalization handles most common email client prefixes, but may not cover all edge cases
- Subject matching uses a bidirectional inclusion check to handle cases where subjects are slightly modified
- If multiple document requests match by email, the system prioritizes requests with matching subjects

