# Docuflow Project Plan & Next Steps

**Generated:** January 2025  
**Status:** Comprehensive Analysis & Strategic Roadmap

---

## Executive Summary

Docuflow is a document collection platform with strong foundational architecture. The core functionality is implemented, but several critical gaps exist that prevent production readiness. This plan outlines a strategic roadmap to complete the MVP and prepare for scale.

---

## Component Audit

### ✅ Fully Implemented Components (10/10)

1. **`employee-directory.tsx`** - Complete with search, filtering, grid/list views
2. **`employee-card.tsx`** - Full profile display with skills, bio, contact info
3. **`employee-edit-form.tsx`** - Complete CRUD form with validation
4. **`organization-form.tsx`** - Create/join organization flow
5. **`link-organization-button.tsx`** - Organization linking utility
6. **`rule-action-buttons.tsx`** - Edit/delete actions for routing rules
7. **`storage-action-buttons.tsx`** - Test/edit/delete storage configs
8. **`create-default-rules-button.tsx`** - Default routing rules creator
9. **`disconnect-button.tsx`** - Email account disconnection (UI ready, API missing)
10. **`refresh-on-connect.tsx`** - OAuth success handler with auto-refresh

### 🚧 Partially Implemented Components

- **`disconnect-button.tsx`** - UI complete, but API endpoint `/api/email/disconnect` doesn't exist

---

## Current State Analysis

### ✅ Strengths

1. **Solid Architecture**
   - Clean monorepo structure
   - Pluggable storage adapter pattern
   - Type-safe TypeScript throughout
   - Well-organized component library

2. **Core Features Working**
   - Authentication (Supabase Auth)
   - Organization management
   - Employee directory
   - Routing rules engine
   - Email integration (Gmail/Outlook)
   - Document request workflow
   - Activity logging

3. **Database Design**
   - Comprehensive schema
   - RLS policies implemented
   - Proper foreign keys and constraints

### ⚠️ Critical Gaps

1. **Missing API Endpoints**
   - `/api/email/disconnect` - Referenced but not implemented
   - Document viewing/downloading endpoints
   - Document request edit/delete endpoints
   - Bulk operations endpoints

2. **Incomplete Storage Adapters**
   - OneDrive adapter (interface only)
   - SharePoint adapter (interface only)
   - Azure Blob Storage adapter (interface only)

3. **Testing Infrastructure**
   - Zero test files found
   - No test setup
   - No CI/CD pipeline

4. **Production Readiness**
   - No error boundaries
   - Limited error handling
   - No monitoring/observability
   - No rate limiting
   - Basic encryption (should upgrade to AES/KMS)

5. **UX/UI Gaps**
   - Limited loading states
   - Basic error messages
   - No success notifications (toast system)
   - Missing responsive breakpoints in some areas
   - No accessibility audit performed

6. **Email Worker Deployment**
   - Service exists but not deployed
   - No scheduling/cron setup
   - Edge function skeleton only

---

## Strategic Roadmap

### Phase 1: Critical Fixes (Weeks 1-2) - **MVP Blockers**

**Goal:** Make the current feature set production-ready

#### 1.1 Complete Missing API Endpoints
- [ ] **Priority: HIGH**
- [ ] Implement `/api/email/disconnect` endpoint
  - Mark email account as inactive
  - Clear tokens securely
  - Log activity
- [ ] Document request edit endpoint (`/api/requests/[id]/update`)
- [ ] Document request delete endpoint (`/api/requests/[id]/delete`)
- [ ] Document download endpoint (`/api/documents/[id]/download`)
- [ ] Document view endpoint (`/api/documents/[id]/view`)

#### 1.2 Error Handling & User Feedback
- [ ] **Priority: HIGH**
- [ ] Implement toast notification system (use `react-hot-toast` or similar)
- [ ] Add error boundaries for React error handling
- [ ] Standardize error messages across all API routes
- [ ] Add loading skeletons/skeletons for async operations
- [ ] Improve form validation with real-time feedback

#### 1.3 OneDrive Storage Adapter
- [ ] **Priority: HIGH** (Most requested after Google Drive)
- [ ] Implement `OneDriveStorageAdapter` class
- [ ] OAuth flow for OneDrive (similar to Google Drive)
- [ ] Implement all required methods:
  - `uploadFile()`
  - `downloadFile()`
  - `listFiles()`
  - `createFolder()`
  - `deleteFile()`
  - `testConnection()`
- [ ] Add token refresh logic
- [ ] Test with real OneDrive account

#### 1.4 Email Worker Deployment (Supabase Cron Jobs)
- [ ] **Priority: HIGH** ⭐ **RECOMMENDED APPROACH**
- [ ] Complete Supabase Edge Function implementation
  - Convert email worker logic to Deno-compatible Edge Function
  - File: `supabase/functions/process-emails/index.ts`
  - Handle email polling, routing, and storage
- [ ] Set up Supabase Cron jobs (using pg_cron extension)
  - Email processing: Every 5 minutes
  - OAuth token refresh: Every hour
  - Document request reminders: Daily at 9 AM
  - Overdue request cleanup: Daily at midnight
  - Migration file: `supabase/migrations/YYYYMMDD_cron_jobs.sql`
- [ ] Enable pg_cron extension in Supabase
- [ ] Test Edge Function manually before cron scheduling
- [ ] Add retry logic with exponential backoff
- [ ] Add error logging and alerting
- [ ] Monitor cron job execution and logs
- [ ] Test email processing end-to-end

**Benefits of Supabase Cron Approach:**
- ✅ Serverless - no long-running processes
- ✅ Cost-effective - pay per execution
- ✅ Built-in reliability - managed by Supabase
- ✅ Simple SQL-based configuration
- ✅ Automatic retries and monitoring

**Deliverable:** Fully functional MVP with all critical paths working

---

### Phase 2: UX Enhancement & Polish (Weeks 3-4) - **User Experience**

**Goal:** Make the app delightful and intuitive to use

#### 2.1 UI/UX Improvements
- [ ] **Priority: MEDIUM**
- [ ] Add comprehensive loading states (spinners, skeletons)
- [ ] Implement toast notifications for all actions
- [ ] Improve error messages with actionable guidance
- [ ] Add empty states with helpful CTAs
- [ ] Enhance responsive design (mobile-first approach)
- [ ] Add keyboard shortcuts for power users
- [ ] Improve color contrast for accessibility

#### 2.2 Document Management Features
- [ ] **Priority: MEDIUM**
- [ ] Document viewer component (PDF preview, image viewer)
- [ ] Document download functionality
- [ ] Document preview in list views
- [ ] Bulk document operations (download, delete)
- [ ] Document search/filter functionality
- [ ] Document metadata display

#### 2.3 Enhanced Request Management
- [ ] **Priority: MEDIUM**
- [ ] Edit existing document requests
- [ ] Delete document requests
- [ ] Bulk operations on requests
- [ ] Request templates (save common request patterns)
- [ ] Request scheduling (send at specific times)
- [ ] Request analytics dashboard

#### 2.4 Organization & Team Features
- [ ] **Priority: MEDIUM**
- [ ] Team member roles & permissions UI
- [ ] Organization settings page
- [ ] Team member invitation flow
- [ ] Organization analytics

**Deliverable:** Polished, production-ready user experience

---

### Phase 3: Testing & Quality Assurance (Weeks 5-6) - **Reliability**

**Goal:** Ensure reliability and catch bugs before users do

#### 3.1 Testing Infrastructure
- [ ] **Priority: HIGH**
- [ ] Set up Jest/Vitest for unit tests
- [ ] Set up React Testing Library for component tests
- [ ] Set up Playwright for E2E tests
- [ ] Create test utilities and helpers
- [ ] Set up test database seeding

#### 3.2 Core Test Coverage
- [ ] **Priority: HIGH**
- [ ] Unit tests for storage adapters (all methods)
- [ ] Unit tests for routing rules engine
- [ ] Unit tests for email parsing
- [ ] Component tests for all form components
- [ ] Component tests for critical UI flows
- [ ] E2E tests for:
  - User signup/login flow
  - Create organization
  - Connect email account
  - Create routing rule
  - Send document request
  - View documents

#### 3.3 Integration Tests
- [ ] **Priority: MEDIUM**
- [ ] API endpoint tests (all CRUD operations)
- [ ] Email worker integration tests
- [ ] Storage adapter integration tests (with test accounts)
- [ ] OAuth flow tests (mocked)

**Deliverable:** Comprehensive test suite with >80% coverage on critical paths

---

### Phase 4: Production Infrastructure (Weeks 7-8) - **Scale & Security**

**Goal:** Prepare for production deployment and scale

#### 4.1 Security Enhancements
- [ ] **Priority: HIGH**
- [ ] Replace simple encryption with AES-256-GCM
- [ ] Implement proper key management (consider AWS KMS, Vault, or Supabase Vault)
- [ ] Add rate limiting to API routes
- [ ] Implement CSRF protection
- [ ] Security audit of all API endpoints
- [ ] Input validation with Zod schemas everywhere
- [ ] SQL injection prevention audit
- [ ] OAuth token refresh automation (✅ Implemented via Supabase Cron in Phase 1)

#### 4.2 Observability & Monitoring
- [ ] **Priority: MEDIUM**
- [ ] Set up error tracking (Sentry or similar)
- [ ] Add structured logging (Pino or similar)
- [ ] Implement application metrics
- [ ] Set up uptime monitoring
- [ ] Create operational dashboards
- [ ] Add health check endpoints

#### 4.3 Performance Optimization
- [ ] **Priority: MEDIUM**
- [ ] Database query optimization
- [ ] Add caching layer (Redis or Supabase edge caching)
- [ ] Optimize images and assets
- [ ] Implement pagination for large lists
- [ ] Add database indexes where needed
- [ ] Lazy loading for heavy components

#### 4.4 CI/CD Pipeline
- [ ] **Priority: MEDIUM**
- [ ] GitHub Actions for linting/typechecking
- [ ] Automated test runs on PRs
- [ ] Automated deployments (Vercel for frontend, Supabase for backend)
- [ ] Environment variable management
- [ ] Preview deployments for PRs
- [ ] Automated database migrations

**Deliverable:** Production-ready infrastructure with monitoring and security

---

### Phase 5: Advanced Features (Weeks 9-12) - **Differentiation**

**Goal:** Add features that make Docuflow stand out

#### 5.1 Remaining Storage Adapters
- [ ] **Priority: LOW** (OneDrive is more important)
- [ ] SharePoint adapter implementation
- [ ] Azure Blob Storage adapter implementation
- [ ] Test all adapters thoroughly

#### 5.2 Advanced Routing Rules
- [ ] **Priority: LOW**
- [ ] Visual rule builder (drag-and-drop)
- [ ] Rule testing/preview before saving
- [ ] Rule templates
- [ ] Advanced condition types (date ranges, file sizes, etc.)
- [ ] Rule execution logging

#### 5.3 Document Intelligence
- [ ] **Priority: LOW**
- [ ] OCR for scanned documents (Tesseract or cloud service)
- [ ] Document classification (ML-based)
- [ ] Automatic document extraction (tables, text)
- [ ] Document verification checksums

#### 5.4 Advanced Analytics
- [ ] **Priority: LOW**
- [ ] Request completion analytics
- [ ] Storage usage analytics
- [ ] Team activity dashboard
- [ ] Export reports (CSV, PDF)
- [ ] Custom date range filtering

**Deliverable:** Feature-rich platform ready for enterprise customers

---

## Detailed Implementation Plan

### Sprint 1: Critical API Endpoints (Week 1)

#### Task 1.1: Email Disconnect API
```typescript
// File: apps/web/app/api/email/disconnect/route.ts
// Priority: HIGH
// Estimated: 4 hours

POST /api/email/disconnect
Body: { accountId: string }
Actions:
1. Verify user owns account
2. Mark email_accounts.is_active = false
3. Clear encrypted tokens (set to null)
4. Log activity
5. Return success
```

#### Task 1.2: Document Request Edit API
```typescript
// File: apps/web/app/api/requests/[id]/update/route.ts
// Priority: HIGH
// Estimated: 3 hours

PATCH /api/requests/[id]/update
Body: { subject?, message_body?, due_date?, recipient_email? }
Actions:
1. Verify user can edit (owner/admin)
2. Validate input
3. Update document_requests
4. Log activity
5. Return updated request
```

#### Task 1.3: Document Request Delete API
```typescript
// File: apps/web/app/api/requests/[id]/delete/route.ts
// Priority: HIGH
// Estimated: 2 hours

DELETE /api/requests/[id]/delete
Actions:
1. Verify user can delete (owner/admin)
2. Soft delete or hard delete based on policy
3. Log activity
4. Return success
```

### Sprint 2: OneDrive Adapter (Week 2)

#### Task 2.1: OneDrive OAuth Implementation
```typescript
// Files: 
// - apps/web/app/auth/onedrive/route.ts
// - apps/web/app/auth/onedrive/callback/route.ts
// Priority: HIGH
// Estimated: 6 hours

Steps:
1. Set up Microsoft OAuth (reuse existing if possible)
2. Request OneDrive scopes: Files.ReadWrite, Files.ReadWrite.All
3. Store tokens in storage_configs table
4. Test OAuth flow end-to-end
```

#### Task 2.2: OneDrive Adapter Implementation
```typescript
// File: packages/storage-adapters/src/onedrive/onedrive-adapter.ts
// Priority: HIGH
// Estimated: 12 hours

Implement all methods:
- uploadFile() - Use Microsoft Graph API
- downloadFile() - Use Microsoft Graph API
- listFiles() - Use Microsoft Graph API
- createFolder() - Use Microsoft Graph API
- deleteFile() - Use Microsoft Graph API
- fileExists() - Check via listFiles
- getPublicUrl() - Generate sharing link
- testConnection() - Simple API call

Key considerations:
- Token refresh using refresh_token
- Handle rate limits (429 errors)
- Proper error handling
- Path normalization
```

### Sprint 3: Testing Infrastructure (Weeks 3-4)

#### Task 3.1: Test Setup
```bash
# Priority: HIGH
# Estimated: 8 hours

1. Install dependencies:
   - vitest (unit tests)
   - @testing-library/react (component tests)
   - @testing-library/jest-dom (matchers)
   - playwright (e2e tests)

2. Create test configs:
   - vitest.config.ts
   - playwright.config.ts
   - test-setup.ts

3. Add test scripts to package.json

4. Set up test database/seeding utilities
```

#### Task 3.2: Critical Path Tests
```typescript
// Priority: HIGH
// Estimated: 16 hours

Test files to create:
1. __tests__/api/email/disconnect.test.ts
2. __tests__/api/requests/update.test.ts
3. __tests__/api/requests/delete.test.ts
4. __tests__/components/employee-form.test.tsx
5. __tests__/components/organization-form.test.tsx
6. e2e/auth-flow.spec.ts
7. e2e/create-request.spec.ts
8. e2e/routing-rule.spec.ts
```

### Sprint 4: UX Polish (Week 5)

#### Task 4.1: Toast Notification System
```typescript
// Priority: MEDIUM
// Estimated: 4 hours

1. Install react-hot-toast
2. Create toast provider wrapper
3. Add toast notifications to:
   - Successful form submissions
   - API errors
   - Copy to clipboard actions
   - Delete confirmations
```

#### Task 4.2: Loading States
```typescript
// Priority: MEDIUM
// Estimated: 8 hours

Add loading states to:
1. Form submissions
2. API calls
3. Data fetches
4. File uploads
5. OAuth flows

Use consistent patterns:
- Button spinners for actions
- Skeleton loaders for content
- Progress bars for uploads
```

### Sprint 5: Supabase Cron Jobs & Email Worker (Week 6)

#### Task 5.1: Complete Edge Function Implementation ⭐ **RECOMMENDED**
```typescript
// File: supabase/functions/process-emails/index.ts
// Priority: HIGH
// Estimated: 8 hours

1. Convert email worker logic to Deno-compatible code
2. Implement email polling, routing, and storage
3. Add comprehensive error handling and retries
4. Test Edge Function manually (via HTTP request)
5. Add structured logging
```

#### Task 5.2: Set Up Supabase Cron Jobs
```sql
// File: supabase/migrations/20250103000000_setup_cron_jobs.sql
// Priority: HIGH
// Estimated: 4 hours

1. Enable pg_cron extension
2. Create cron job for email processing (every 5 minutes)
3. Create cron job for OAuth token refresh (every hour)
4. Create cron job for document reminders (daily at 9 AM)
5. Create cron job for cleanup tasks (daily at midnight)
6. Test cron jobs execution
7. Monitor initial runs
```

#### Task 5.3: Cron Job Functions & Monitoring
```sql
// Priority: MEDIUM
// Estimated: 2 hours

1. Create helper SQL functions for cron jobs
2. Set up monitoring queries for cron job history
3. Create alert system for failed jobs
4. Document cron job configuration
```

---

## Success Metrics

### Phase 1 Metrics (MVP)
- [ ] All critical API endpoints implemented
- [ ] OneDrive adapter functional
- [ ] Email worker processing emails successfully
- [ ] Zero critical bugs in core flows
- [ ] Page load time < 2s
- [ ] API response time < 300ms (p95)

### Phase 2 Metrics (UX)
- [ ] User satisfaction score > 4/5
- [ ] Task completion rate > 90%
- [ ] Error rate < 5%
- [ ] Mobile responsive on all pages
- [ ] Accessibility score > 90 (Lighthouse)

### Phase 3 Metrics (Quality)
- [ ] Test coverage > 80% (critical paths)
- [ ] Zero P0/P1 bugs
- [ ] E2E tests passing
- [ ] CI/CD pipeline green

### Phase 4 Metrics (Production)
- [ ] Uptime > 99.9%
- [ ] Security audit passed
- [ ] All vulnerabilities patched
- [ ] Monitoring dashboards live
- [ ] Error tracking configured

---

## Risk Assessment

### High Risk Items

1. **OAuth Token Management**
   - Risk: Tokens expiring, refresh failures
   - Mitigation: Robust refresh logic, manual re-auth fallback
   - Priority: HIGH

2. **Storage Adapter Complexity**
   - Risk: Different APIs, edge cases
   - Mitigation: Comprehensive testing, graceful error handling
   - Priority: HIGH

3. **Email Worker Reliability**
   - Risk: Missing emails, processing failures
   - Mitigation: Retry logic, dead letter queue, monitoring
   - Priority: HIGH

4. **Data Security**
   - Risk: Encryption, token storage
   - Mitigation: Security audit, proper key management
   - Priority: CRITICAL

### Medium Risk Items

1. **Scalability**
   - Risk: Performance under load
   - Mitigation: Load testing, caching, optimization
   - Priority: MEDIUM

2. **Third-party API Limits**
   - Risk: Rate limiting, quota exhaustion
   - Mitigation: Rate limiting, retry with backoff
   - Priority: MEDIUM

---

## Resource Requirements

### Development Time Estimates

- **Phase 1 (Critical Fixes)**: ~80 hours (2 weeks @ 40h/week)
- **Phase 2 (UX Polish)**: ~60 hours (1.5 weeks)
- **Phase 3 (Testing)**: ~80 hours (2 weeks)
- **Phase 4 (Production)**: ~60 hours (1.5 weeks)
- **Phase 5 (Advanced)**: ~120 hours (3 weeks)

**Total Estimated**: ~400 hours (~10 weeks for 1 developer)

### Required Skills

- Full-stack TypeScript/React
- Supabase/PostgreSQL
- OAuth implementation
- Cloud storage APIs (OneDrive, SharePoint, Azure)
- Testing (unit, integration, E2E)
- DevOps/CI/CD
- Security best practices

---

## Immediate Next Steps (This Week)

### Day 1-2: Critical API Endpoints
1. Implement `/api/email/disconnect`
2. Implement `/api/requests/[id]/update`
3. Implement `/api/requests/[id]/delete`
4. Test all endpoints manually

### Day 3-4: OneDrive Adapter OAuth
1. Set up OneDrive OAuth flow
2. Test OAuth callback
3. Store tokens in database
4. Verify token refresh works

### Day 5: OneDrive Adapter Core Methods
1. Implement `uploadFile()` and `downloadFile()`
2. Implement `listFiles()` and `createFolder()`
3. Implement `testConnection()`
4. Test with real OneDrive account

---

## Long-term Vision

### Q2 2025: Enterprise Features
- Advanced RBAC (Role-Based Access Control)
- Multi-tenant architecture improvements
- Advanced analytics and reporting
- API for third-party integrations
- Webhook support

### Q3 2025: AI/ML Integration
- Smart document classification
- Automated extraction (tables, text)
- Document verification AI
- Intelligent routing suggestions

### Q4 2025: Scale
- Handle 10,000+ organizations
- Process 100,000+ documents/month
- Global CDN deployment
- Multi-region support

---

## Notes

- This plan is living document - update as priorities change
- Focus on Phase 1 first - it's critical for MVP
- Don't skip testing (Phase 3) - technical debt is expensive
- Security (Phase 4) is non-negotiable before production
- User feedback should drive Phase 2 priorities

---

**Last Updated:** 2025-01-XX  
**Next Review:** Weekly during active development

