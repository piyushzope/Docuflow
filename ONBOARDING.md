# Developer Onboarding Guide

**Welcome to Docuflow!** This guide will help you get started as a developer on the project.

---

## 🎯 Quick Start (5 minutes)

### 1. Prerequisites

- **Node.js 18+** and npm
- **Git** installed
- **Code editor** (VS Code recommended)
- **Supabase account** (for database access)

### 2. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd Docuflow_Cursor

# Install dependencies
npm install

# Set up environment
cp apps/web/.env.example apps/web/.env.local
# Fill in your Supabase credentials
```

### 3. Start Development

```bash
# Start dev server
npm run dev

# Visit http://localhost:3000
```

---

## 📚 Essential Documentation

### Must-Read First

1. **[README.md](./README.md)** - Project overview and setup
2. **[AGENTS.MD](./AGENTS.MD)** - Development workflow and patterns
3. **[DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md)** - Code snippets and patterns ⭐
4. **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - Complete code examples ⭐

### Reference Documentation

- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database configuration
- **[TESTING.md](./apps/web/TESTING.md)** - Testing guide
- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Project status

### Deployment

- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Production deployment
- **[CRON_JOBS_SETUP_GUIDE.md](./CRON_JOBS_SETUP_GUIDE.md)** - Cron jobs setup

---

## 🏗️ Project Structure

```
docuflow/
├── apps/
│   ├── web/                    # Next.js frontend ⭐ Main app
│   │   ├── app/               # Pages and API routes
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities and helpers
│   │   └── e2e/              # E2E tests
│   └── email-worker/          # Background email processing
├── packages/
│   ├── email-integrations/     # Gmail/Outlook clients
│   ├── storage-adapters/       # Storage adapters (Supabase, GDrive, OneDrive)
│   └── shared/                 # Shared types and utilities
└── supabase/
    ├── migrations/             # Database migrations
    └── functions/             # Edge Functions
```

**Key Files to Know:**
- `apps/web/lib/utils.ts` - Utility functions
- `apps/web/lib/errors.ts` - Error handling
- `apps/web/lib/api-helpers.ts` - API response helpers
- `apps/web/components/` - Reusable components

---

## 🔧 Development Workflow

### Daily Development

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes**
   - Follow patterns from `DEVELOPER_QUICK_REFERENCE.md`
   - Use utility functions from `lib/utils.ts`
   - Use error helpers from `lib/errors.ts`

4. **Test your changes**
   ```bash
   npm run test          # Unit tests
   npm run test:e2e      # E2E tests
   npm run lint          # Linting
   npm run typecheck     # TypeScript check
   ```

5. **Commit and push**
   ```bash
   git commit -m "feat: description"
   git push origin feature/your-feature-name
   ```

### Code Standards

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint + Prettier
- **Components:** Use existing components (LoadingButton, EmptyState, etc.)
- **Formatting:** Use utility functions for dates, file sizes, etc.
- **Errors:** Use error helpers for consistent error handling

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm run test

# E2E tests
npm run test:e2e

# Watch mode
npm run test --watch

# Coverage
npm run test:coverage
```

### Writing Tests

**Unit Tests (Vitest):**
```typescript
// __tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatFileSize } from '@/lib/utils';

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });
});
```

**E2E Tests (Playwright):**
```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('/dashboard');
  // Your test
});
```

---

## 🔑 Key Concepts

### Authentication Flow

1. User logs in via Supabase Auth
2. Session stored in cookies
3. Server components use `createClient()` from `lib/supabase/server`
4. API routes check `supabase.auth.getUser()`

### Organization-Based Access

- All data scoped to `organization_id`
- RLS policies enforce organization isolation
- Always check `profile.organization_id` in queries

### Storage Adapters

- Pluggable system for different storage providers
- Base class: `BaseStorageAdapter`
- Implementations: Supabase, Google Drive, OneDrive
- See `packages/storage-adapters/` for details

### Document Routing

- Rules engine matches emails to routing rules
- Based on sender pattern, subject pattern, file types
- Automatically organizes documents in storage
- See `lib/routing/rules-engine.ts`

---

## 🐛 Common Issues & Solutions

### Issue: "Organization not found"

**Solution:** Ensure user has completed organization setup
- Check `profiles.organization_id` is set
- User should be redirected to `/dashboard/setup` if missing

### Issue: "JWT error" or "Session expired"

**Solution:** Clear browser cookies and log in again
- This happens when session token is invalid
- API routes now handle this gracefully

### Issue: "Cannot find module '@/lib/utils'"

**Solution:** Ensure TypeScript paths are configured
- Check `tsconfig.json` has `@/*` paths
- Restart TypeScript server in editor

### Issue: Tests failing

**Solution:** Check test setup
- Ensure `test-setup.ts` is imported
- Check environment variables are set
- Run `npm install` to ensure dependencies

---

## 📝 Code Patterns

### Creating a New API Route

```typescript
// app/api/my-route/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createSuccessResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
  }

  // Your logic here
  return createSuccessResponse(data);
}
```

### Creating a New Page

```typescript
// app/dashboard/my-page/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils';

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch data
  const { data } = await supabase.from('table').select('*');

  return <div>{/* Your page */}</div>;
}
```

### Creating a New Component

```typescript
// components/my-component.tsx
'use client';

import { useState } from 'react';
import { LoadingButton } from './loading-button';
import { formatDate } from '@/lib/utils';

export function MyComponent({ data }: { data: any }) {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <p>Created: {formatDate(data.created_at)}</p>
      <LoadingButton loading={loading}>Submit</LoadingButton>
    </div>
  );
}
```

---

## 🔍 Debugging Tips

### Check Logs

- **Client-side:** Browser console
- **Server-side:** Terminal where `npm run dev` is running
- **Supabase:** Dashboard → Logs → API logs

### Common Debugging Steps

1. **Check authentication:**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user);
   ```

2. **Check organization:**
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('organization_id')
     .eq('id', user.id)
     .single();
   console.log('Organization:', profile?.organization_id);
   ```

3. **Check RLS policies:**
   - Go to Supabase Dashboard → Table Editor
   - Verify RLS is enabled
   - Check policies allow your user to access data

---

## 🚀 Next Steps

1. **Explore the codebase:**
   - Start with `apps/web/app/dashboard/page.tsx`
   - Check out `apps/web/components/` for reusable components
   - Review `apps/web/lib/` for utilities

2. **Read the documentation:**
   - `DEVELOPER_QUICK_REFERENCE.md` - Quick patterns
   - `CODE_EXAMPLES.md` - Complete examples
   - `AGENTS.MD` - Development workflow

3. **Make your first change:**
   - Pick a small task
   - Follow the patterns you see
   - Ask questions if unsure

4. **Run the tests:**
   - Familiarize yourself with test structure
   - Add tests for your changes

---

## 📞 Getting Help

### Resources

- **Documentation:** Check docs/ folder first
- **Code Examples:** See `CODE_EXAMPLES.md`
- **Quick Reference:** See `DEVELOPER_QUICK_REFERENCE.md`

### When Stuck

1. Check error messages carefully
2. Review similar code in the codebase
3. Check documentation files
4. Look at existing tests for examples

---

## ✅ Onboarding Checklist

- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Development server running
- [ ] Can log in to app
- [ ] README.md read
- [ ] AGENTS.MD reviewed
- [ ] DEVELOPER_QUICK_REFERENCE.md reviewed
- [ ] First small change made
- [ ] Tests passing

---

**Welcome to the team!** 🎉

For questions or clarifications, refer to the documentation or review existing code for patterns.

