# Next.js 15 Compatibility Fixes

## Issues Fixed

### 1. searchParams Promise Issue ✅

**Problem**: Next.js 15 changed `searchParams` to be a Promise that must be awaited.

**Error**:
```
Route "/dashboard/requests" used `searchParams.error`. 
`searchParams` is a Promise and must be unwrapped with `await` or `React.use()`
```

**Solution**: Updated all pages to await `searchParams`:

**Fixed Pages:**
- ✅ `apps/web/app/dashboard/requests/page.tsx`
- ✅ `apps/web/app/dashboard/storage/page.tsx`
- ✅ `apps/web/app/dashboard/integrations/page.tsx`

**Pattern Applied:**
```typescript
// Before (Next.js 14)
export default async function Page({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  // Direct access
  {searchParams.error && ...}
}

// After (Next.js 15)
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  // Await first
  const params = await searchParams;
  {params.error && ...}
}
```

### 2. JWT Error Handling ✅

**Problem**: JWT validation errors weren't providing helpful feedback.

**Solution**: Enhanced error handling in API routes:
- Better error messages for JWT/token errors
- Automatic redirect to login when session expires
- Clear error codes for client-side handling

**Fixed Routes:**
- ✅ `apps/web/app/api/requests/create/route.ts`
- ✅ `apps/web/app/api/send-request/route.ts`

### 3. Status Tracking Bug Fix ✅

**Problem**: `sendRequestEmail` helper didn't have access to `user.id` for status tracking.

**Solution**: Added `userId` parameter to helper function.

**Changes:**
- Helper function now accepts optional `userId` parameter
- Status updates properly track `status_changed_by`
- Works with status history logging trigger

## Testing

### Verify searchParams Fix
1. Navigate to `/dashboard/requests?success=created`
2. Should show success message without errors
3. Check browser console - no searchParams warnings

### Verify JWT Error Handling
1. Clear browser cookies
2. Try to create a document request
3. Should see: "Authentication session expired. Please log in again."
4. Should redirect to login page

### Verify Status Tracking
1. Create and send a document request
2. Check `document_request_status_history` table
3. Verify `status_changed_by` is set correctly

## Files Modified

- ✅ `apps/web/app/dashboard/requests/page.tsx`
- ✅ `apps/web/app/dashboard/storage/page.tsx`
- ✅ `apps/web/app/dashboard/integrations/page.tsx`
- ✅ `apps/web/app/api/requests/create/route.ts`
- ✅ `apps/web/app/api/send-request/route.ts`
- ✅ `apps/web/lib/supabase/server.ts`

## Migration Notes

If you have other pages using `searchParams`, apply the same pattern:

1. Change type from object to `Promise<object>`
2. Await searchParams at the start of the function
3. Use the awaited variable instead of direct access

Example:
```typescript
const params = await searchParams;
// Then use params.error, params.success, etc.
```

---

**Status**: ✅ All Next.js 15 compatibility issues resolved

