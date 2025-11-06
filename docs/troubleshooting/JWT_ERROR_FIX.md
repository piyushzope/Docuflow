# JWT Error Fix - Document Request Creation

## Problem
When creating a document request, users were getting this error:
```json
{
  "error": "IDX14100: JWT is not well formed, there are no dots (.)."
}
```

## Root Cause
The JWT error occurs when Supabase tries to validate an authentication token that is:
- Missing from cookies
- Expired/invalid
- Malformed (not in proper JWT format)

This typically happens when:
1. User session has expired
2. Cookies were cleared
3. There's a mismatch between client and server session state

## Solution Implemented

### 1. Enhanced Error Handling in API Route ✅
Updated `apps/web/app/api/requests/create/route.ts`:
- Added try-catch around `auth.getUser()` call
- Provides specific error messages for JWT errors
- Returns `SESSION_EXPIRED` code for client handling

### 2. Client-Side Session Check ✅
Updated `apps/web/app/dashboard/requests/new/page.tsx`:
- Checks session before making API call
- Redirects to login if session expired
- Shows user-friendly error message

### 3. Environment Variable Validation ✅
Updated `apps/web/lib/supabase/server.ts`:
- Validates Supabase URL and anon key are set
- Provides clear error if missing

## How It Works Now

### Before Request Creation:
1. Client checks if session exists using `supabase.auth.getSession()`
2. If no session, user is redirected to login immediately
3. Prevents API call with invalid auth

### In API Route:
1. `createClient()` creates Supabase client from cookies
2. `auth.getUser()` is called with error handling
3. If JWT error detected, returns specific error message
4. Client receives clear feedback about session expiration

## User Experience

**Before Fix:**
- Generic JWT error in console
- Unclear what went wrong
- User confused about next steps

**After Fix:**
- Clear error message: "Authentication session expired. Please log in again."
- Automatic redirect to login if session expired
- Better error handling throughout

## Testing

To verify the fix works:

1. **Test with valid session:**
   - Log in normally
   - Create a document request
   - Should work without errors

2. **Test with expired session:**
   - Clear browser cookies
   - Try to create request
   - Should redirect to login with message

3. **Test error handling:**
   - Check browser console for detailed error messages
   - API should return `SESSION_EXPIRED` code when applicable

## Additional Recommendations

If users continue to see JWT errors:

1. **Clear browser cookies** and log in again
2. **Check browser console** for detailed error messages
3. **Verify environment variables** are set correctly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Restart dev server** after changing environment variables

## Files Modified

- ✅ `apps/web/app/api/requests/create/route.ts` - Enhanced error handling
- ✅ `apps/web/app/dashboard/requests/new/page.tsx` - Session check before API call
- ✅ `apps/web/lib/supabase/server.ts` - Environment validation

## Next Steps

If the error persists:
1. Check Supabase Dashboard → Authentication → Settings
2. Verify JWT secret is configured correctly
3. Check if there are any CORS issues
4. Review browser console for additional errors

