# Code Examples - Docuflow

**Purpose:** Comprehensive code examples for common patterns in Docuflow  
**Last Updated:** January 2025

---

## Table of Contents

1. [API Routes](#api-routes)
2. [Server Components](#server-components)
3. [Client Components](#client-components)
4. [Forms with Validation](#forms-with-validation)
5. [Database Queries](#database-queries)
6. [Error Handling](#error-handling)
7. [Storage Adapters](#storage-adapters)

---

## API Routes

### Complete API Route Example

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createUnauthorizedResponse,
  createNotFoundResponse,
  createSuccessResponse,
  createInternalErrorResponse,
} from '@/lib/api-helpers';
import { ErrorMessages, getErrorMessage } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Authentication check
    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Handle async params (Next.js 15)
    const resolvedParams = await Promise.resolve(params);
    const resourceId = resolvedParams.id;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Fetch resource
    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (error || !resource) {
      return createNotFoundResponse(ErrorMessages.NOT_FOUND);
    }

    // Return success
    return createSuccessResponse(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    return createInternalErrorResponse(getErrorMessage(error));
  }
}
```

### POST Route Example

```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    const body = await request.json();
    
    // Validate input
    if (!body.field) {
      return createErrorResponse(ErrorMessages.REQUIRED_FIELD_MISSING, 400);
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

    // Create resource
    const { data: newResource, error } = await supabase
      .from('resources')
      .insert({
        organization_id: profile.organization_id,
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return createInternalErrorResponse(getErrorMessage(error));
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'create',
      resource_type: 'resource',
      resource_id: newResource.id,
      details: body,
    });

    return createSuccessResponse(newResource, 'Resource created successfully');
  } catch (error) {
    return createInternalErrorResponse(getErrorMessage(error));
  }
}
```

---

## Server Components

### Basic Server Component

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/setup');
  }

  // Fetch data
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1>Items</h1>
      {items?.map((item) => (
        <div key={item.id}>
          <p>{item.name}</p>
          <p>Created: {formatDate(item.created_at)}</p>
        </div>
      ))}
    </div>
  );
}
```

### Server Component with searchParams

```typescript
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  // Await searchParams (Next.js 15)
  const params = await searchParams;
  
  const supabase = await createClient();
  // ... rest of component
}
```

---

## Client Components

### Form Component with Loading

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/loading-button';

export function CreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/resources/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create');
      }

      toast.success('Resource created successfully');
      router.push('/dashboard/resources');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <LoadingButton loading={loading} type="submit">
        Create
      </LoadingButton>
    </form>
  );
}
```

---

## Forms with Validation

### Form with Client-Side Validation

```typescript
'use client';

import { useState } from 'react';
import { isValidEmail } from '@/lib/utils';
import { LoadingButton } from '@/components/loading-button';

export function Form() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Submit
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={error ? 'border-red-500' : ''}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <LoadingButton type="submit">Submit</LoadingButton>
    </form>
  );
}
```

---

## Database Queries

### Query with Joins

```typescript
const { data, error } = await supabase
  .from('documents')
  .select(`
    *,
    document_requests:document_request_id (
      id,
      subject,
      recipient_email,
      status
    ),
    routing_rules:routing_rule_id (
      id,
      name
    )
  `)
  .eq('organization_id', organizationId)
  .order('created_at', { ascending: false });
```

### Pagination

```typescript
const page = 1;
const pageSize = 20;
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;

const { data, error, count } = await supabase
  .from('resources')
  .select('*', { count: 'exact' })
  .eq('organization_id', organizationId)
  .range(from, to)
  .order('created_at', { ascending: false });
```

### Filtering

```typescript
const { data } = await supabase
  .from('resources')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('status', 'active')
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

---

## Error Handling

### Try-Catch with Error Helpers

```typescript
import { getErrorMessage, isNetworkError } from '@/lib/errors';

try {
  // Your code
} catch (error) {
  if (isNetworkError(error)) {
    // Handle network error
    toast.error('Network error. Please check your connection.');
  } else {
    // Handle other errors
    toast.error(getErrorMessage(error));
  }
}
```

### API Error Handling

```typescript
const response = await fetch('/api/endpoint');
const result = await response.json();

if (!response.ok) {
  if (result.code === 'SESSION_EXPIRED') {
    router.push('/login');
  } else {
    toast.error(result.error || 'An error occurred');
  }
  return;
}
```

---

## Storage Adapters

### Using Storage Adapters

```typescript
import { createStorageAdapter } from '@docuflow/storage-adapters';
import { decrypt } from '@docuflow/shared';

// Get storage config
const { data: storageConfig } = await supabase
  .from('storage_configs')
  .select('*')
  .eq('id', configId)
  .single();

// Build adapter config
const config = storageConfig.config || {};
const adapterConfig = {
  provider: storageConfig.provider,
  ...config,
};

// Decrypt tokens if needed
if (config.encrypted_access_token) {
  adapterConfig.accessToken = decrypt(
    config.encrypted_access_token,
    process.env.ENCRYPTION_KEY!
  );
}

// Create adapter
const adapter = createStorageAdapter(adapterConfig);

// Use adapter
const fileBuffer = await adapter.downloadFile(path);
const publicUrl = await adapter.getPublicUrl(path);
```

---

## Components

### Using LoadingButton

```typescript
import { LoadingButton } from '@/components/loading-button';

<LoadingButton
  loading={isSubmitting}
  variant="primary"
  onClick={handleSubmit}
  disabled={!isValid}
>
  Submit Form
</LoadingButton>
```

### Using EmptyState

```typescript
import { EmptyState } from '@/components/empty-state';

{items.length === 0 ? (
  <EmptyState
    title="No items found"
    description="Get started by creating your first item"
    actionLabel="Create Item"
    actionHref="/dashboard/items/new"
  />
) : (
  // Render items
)}
```

### Using SkeletonLoader

```typescript
import { SkeletonLoader, SkeletonList } from '@/components/skeleton-loader';

// In loading.tsx (Next.js App Router)
export default function Loading() {
  return <SkeletonList count={10} />;
}

// Or inline
{loading && <SkeletonLoader lines={5} />}
```

---

## Utilities

### Date Formatting

```typescript
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

formatDate('2025-01-15');           // "Jan 15, 2025"
formatDateTime('2025-01-15T10:30'); // "Jan 15, 2025, 10:30 AM"
formatRelativeTime('2025-01-15');  // "2 hours ago"
```

### File Size

```typescript
import { formatFileSize } from '@/lib/utils';

formatFileSize(1024);        // "1.0 KB"
formatFileSize(1048576);     // "1.0 MB"
formatFileSize(null);        // "—"
```

### Status Badges

```typescript
import { getStatusBadgeClasses, formatStatus } from '@/lib/utils';

<span className={`badge ${getStatusBadgeClasses(status)}`}>
  {formatStatus(status)}
</span>
```

---

## Best Practices

1. **Always check authentication** before database operations
2. **Use utility functions** for consistent formatting
3. **Use error helpers** for consistent error handling
4. **Check organization_id** in all queries (RLS handles this)
5. **Use LoadingButton** for all form submissions
6. **Use EmptyState** for empty lists
7. **Use SkeletonLoader** for loading states
8. **Handle Next.js 15 async params** in dynamic routes
9. **Log activities** for important actions
10. **Validate inputs** on both client and server

---

**For more examples, see:** `DEVELOPER_QUICK_REFERENCE.md`

