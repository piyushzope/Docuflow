# Developer Quick Reference Guide

**Purpose:** Quick reference for common tasks and patterns in the Docuflow codebase  
**Last Updated:** January 2025

---

## 📚 Table of Contents

1. [Utility Functions](#utility-functions)
2. [Error Handling](#error-handling)
3. [API Routes](#api-routes)
4. [Components](#components)
5. [Database Queries](#database-queries)
6. [File Structure](#file-structure)

---

## 🛠️ Utility Functions

### Date & Time Formatting

```typescript
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

// Format date: "Jan 15, 2025"
formatDate(dateString);

// Format date/time: "Jan 15, 2025, 3:45 PM"
formatDateTime(dateString);

// Relative time: "2 hours ago", "yesterday"
formatRelativeTime(dateString);
```

### File Size Formatting

```typescript
import { formatFileSize } from '@/lib/utils';

// "1.5 MB", "234 KB", "10 B"
formatFileSize(bytes);
```

### Status Badges

```typescript
import { getStatusBadgeClasses, formatStatus } from '@/lib/utils';

// Get Tailwind classes for status badge
<span className={`rounded-full px-2 py-1 ${getStatusBadgeClasses(status)}`}>
  {formatStatus(status)}
</span>
```

### File Type Detection

```typescript
import { isImageFile, isPdfFile, isTextFile, getFileExtension } from '@/lib/utils';

isImageFile(mimeType);  // true/false
isPdfFile(mimeType);    // true/false
isTextFile(mimeType);   // true/false
getFileExtension(filename);  // "pdf", "jpg", etc.
```

---

## 🚨 Error Handling

### API Error Responses

```typescript
import { 
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createInternalErrorResponse
} from '@/lib/api-helpers';

// Success response
return createSuccessResponse(data, 'Optional message');

// Error responses
return createUnauthorizedResponse('Unauthorized');
return createNotFoundResponse('Resource not found');
return createForbiddenResponse('Forbidden');
return createInternalErrorResponse('Internal error');
```

### Error Messages

```typescript
import { ErrorMessages, getErrorMessage } from '@/lib/errors';

// Use predefined messages
return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);

// Extract error message safely
const message = getErrorMessage(error, 'Default message');
```

### Error Type Checking

```typescript
import { isApiError, isNetworkError, isAuthError } from '@/lib/errors';

if (isNetworkError(error)) {
  // Handle network error
}

if (isAuthError(error)) {
  // Handle auth error
}
```

---

## 🔌 API Routes

### Standard API Route Pattern

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createSuccessResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Get organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Your logic here
    const data = await fetchData();

    return createSuccessResponse(data);
  } catch (error) {
    return createInternalErrorResponse(getErrorMessage(error));
  }
}
```

### Dynamic Routes (Next.js 15)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Handle async params
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  
  // Rest of logic
}
```

---

## 🧩 Components

### LoadingButton

```typescript
import { LoadingButton } from '@/components/loading-button';

<LoadingButton
  loading={isLoading}
  variant="primary" // or "secondary", "danger"
  onClick={handleSubmit}
>
  Submit
</LoadingButton>
```

### EmptyState

```typescript
import { EmptyState } from '@/components/empty-state';

<EmptyState
  title="No items found"
  description="Get started by creating your first item"
  actionLabel="Create Item"
  actionHref="/dashboard/items/new"
/>
```

### SkeletonLoader

```typescript
import { SkeletonLoader, CardSkeleton, SkeletonList } from '@/components/skeleton-loader';

// Lines
<SkeletonLoader lines={5} />

// Card
<CardSkeleton />

// List
<SkeletonList count={10} />
```

### DocumentViewer

```typescript
import { DocumentViewer } from '@/components/document-viewer';

<DocumentViewer
  documentId={document.id}
  filename={document.original_filename}
  mimeType={document.mime_type}
  storageProvider={document.storage_provider}
  storagePath={document.storage_path}
/>
```

---

## 🗄️ Database Queries

### Standard Query Pattern

```typescript
const supabase = await createClient();

// With joins
const { data, error } = await supabase
  .from('table_name')
  .select(`
    *,
    related_table:foreign_key_id (
      id,
      name
    )
  `)
  .eq('organization_id', organizationId)
  .order('created_at', { ascending: false });

if (error) {
  // Handle error
}
```

### With RLS (Row Level Security)

```typescript
// RLS automatically filters by organization_id
// Ensure user has organization_id in profile
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single();

// All queries automatically filtered by organization_id
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('organization_id', profile.organization_id);
```

---

## 📁 File Structure

### Key Directories

```
apps/web/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages
│   └── auth/            # OAuth flows
├── components/          # React components
├── lib/
│   ├── supabase/        # Supabase clients
│   ├── utils.ts         # Utility functions
│   ├── errors.ts        # Error handling
│   └── api-helpers.ts   # API helpers
└── types/               # TypeScript types

packages/
├── email-integrations/   # Email API clients
├── storage-adapters/     # Storage adapters
└── shared/              # Shared utilities

supabase/
├── migrations/           # Database migrations
└── functions/            # Edge Functions
```

### Naming Conventions

- **Components:** PascalCase (`LoadingButton.tsx`)
- **Utilities:** camelCase (`formatDate`)
- **API Routes:** kebab-case (`[id]/route.ts`)
- **Pages:** kebab-case (`dashboard/requests/page.tsx`)

---

## 🔐 Authentication

### Get Current User

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  redirect('/login');
}
```

### Get User Profile & Organization

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id, role')
  .eq('id', user.id)
  .single();

if (!profile?.organization_id) {
  redirect('/dashboard/setup');
}
```

---

## 📝 Common Patterns

### Server Component with Auth

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get data
  const { data } = await supabase.from('table').select('*');

  return <div>{/* Render */}</div>;
}
```

### Client Component with Loading

```typescript
'use client';

import { useState } from 'react';
import { LoadingButton } from '@/components/loading-button';

export function MyComponent() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Your logic
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingButton loading={loading} onClick={handleSubmit}>
      Submit
    </LoadingButton>
  );
}
```

### Form with Toast Notifications

```typescript
'use client';

import { toast } from 'sonner';
import { LoadingButton } from '@/components/loading-button';

const handleSubmit = async () => {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error);
    }

    toast.success('Success!');
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test UI
npm run test:ui
```

### Test File Structure

```
apps/web/
├── __tests__/          # Unit tests
└── e2e/               # E2E tests
    ├── auth.spec.ts
    ├── document-request.spec.ts
    └── email-integration.spec.ts
```

---

## 🚀 Deployment

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_KEY=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Deployment Checklist

See `DEPLOYMENT_CHECKLIST.md` for complete deployment steps.

---

## 📖 Additional Resources

- **Architecture:** `AGENTS.MD`
- **Testing:** `TESTING.md`
- **Database:** `DATABASE_SETUP.md`
- **Cron Jobs:** `CRON_JOBS_SETUP_GUIDE.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **Project Summary:** `FINAL_PROJECT_SUMMARY.md`

---

## 💡 Tips

1. **Always check authentication** before database operations
2. **Use utility functions** for consistent formatting
3. **Use error helpers** for consistent error handling
4. **Check organization_id** in all queries (RLS handles this)
5. **Use LoadingButton** for all form submissions
6. **Use EmptyState** for empty lists
7. **Use SkeletonLoader** for loading states
8. **Handle Next.js 15 async params** in dynamic routes

---

**Questions?** Check the documentation files or review existing code for patterns.

