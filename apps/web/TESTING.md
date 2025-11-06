# Testing Guide

This guide covers how to run and write tests for the Docuflow application.

## Test Framework Setup

### Unit & Integration Tests (Vitest)

**Configuration:** `vitest.config.ts`

**Run tests:**
```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run with UI dashboard
npm run test:coverage # Run with coverage report
```

### End-to-End Tests (Playwright)

**Configuration:** `playwright.config.ts`

**Run tests:**
```bash
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # Run with Playwright UI
npx playwright install # Install browsers (first time only)
```

## Test Structure

```
apps/web/
├── e2e/                    # End-to-end tests
│   ├── auth.spec.ts        # Authentication flow tests
│   └── example.spec.ts     # Example test
├── test-utils/             # Test utilities
│   ├── db-helpers.ts       # Database seeding/cleanup
│   └── factories.ts       # Test data factories
├── __tests__/              # Unit/integration tests (to be created)
├── test-setup.ts           # Vitest setup file
├── vitest.config.ts        # Vitest configuration
└── playwright.config.ts    # Playwright configuration
```

## Writing Tests

### Unit Tests Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from '@/components/loading-button';

describe('LoadingButton', () => {
  it('shows loading spinner when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### E2E Tests Example

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Using Test Utilities

```typescript
import { createTestOrganization, cleanupTestData } from '@/test-utils/db-helpers';
import { createMockDocumentRequest } from '@/test-utils/factories';

test('creates document request', async () => {
  const org = await createTestOrganization();
  // ... test code ...
  await cleanupTestData(org.id);
});
```

## Test Coverage Goals

- **Critical Paths:** 80%+ coverage
  - Authentication flows
  - Document request creation
  - Email processing
  - Storage operations

- **Components:** 70%+ coverage
  - Form components
  - Action buttons
  - Error handling

## Running Tests in CI

Tests will run automatically in CI/CD pipeline:
- Unit tests on every commit
- E2E tests on PRs
- Full test suite before deployment

## Environment Variables for Testing

Create `.env.test` file:
```
NEXT_PUBLIC_SUPABASE_URL=your-test-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-test-service-key
```

## Mock Data

Use factories from `test-utils/factories.ts`:
```typescript
import { createMockDocumentRequest } from '@/test-utils/factories';

const mockRequest = createMockDocumentRequest({
  recipient_email: 'custom@example.com'
});
```

## Best Practices

1. **Clean up after tests** - Use `cleanupTestData()` to remove test data
2. **Use factories** - Don't hardcode test data
3. **Test user flows** - Test complete workflows, not just components
4. **Keep tests fast** - Mock external services when possible
5. **Test edge cases** - Error states, empty data, invalid input

