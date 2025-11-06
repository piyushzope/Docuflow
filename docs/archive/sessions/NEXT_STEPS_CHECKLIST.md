# Docuflow Next Steps Checklist

> **Quick Reference**: Prioritized action items for immediate execution

---

## 🔴 CRITICAL - Do First (Week 1-2)

### API Endpoints (Missing) ✅ COMPLETED
- [x] `/api/email/disconnect` - Disconnect email account
  - File: `apps/web/app/api/email/disconnect/route.ts` ✅
  - Actions: Mark inactive, clear tokens, log activity
  - Time: 4 hours ✅

- [x] `/api/requests/[id]/update` - Edit document request
  - File: `apps/web/app/api/requests/[id]/update/route.ts` ✅
  - Actions: Validate, update, log activity
  - Time: 3 hours ✅

- [x] `/api/requests/[id]/delete` - Delete document request
  - File: `apps/web/app/api/requests/[id]/delete/route.ts` ✅
  - Actions: Delete, log activity
  - Time: 2 hours ✅

- [x] `/api/documents/[id]/download` - Download document
  - File: `apps/web/app/api/documents/[id]/download/route.ts` ✅
  - Actions: Verify access, download via storage adapter, stream file
  - Time: 4 hours ✅

- [x] `/api/documents/[id]/view` - View document metadata
  - File: `apps/web/app/api/documents/[id]/view/route.ts` ✅
  - Actions: Return document info, related data, preview URL placeholder
  - Time: 2 hours ✅

### OneDrive Storage Adapter
- [ ] OneDrive OAuth flow
  - Files: 
    - `apps/web/app/auth/onedrive/route.ts`
    - `apps/web/app/auth/onedrive/callback/route.ts`
  - Time: 6 hours

- [ ] OneDrive adapter implementation
  - File: `packages/storage-adapters/src/onedrive/onedrive-adapter.ts`
  - Methods: uploadFile, downloadFile, listFiles, createFolder, deleteFile, testConnection
  - Time: 12 hours

### Email Worker Deployment (Supabase Cron Jobs) ⭐ RECOMMENDED
- [ ] Complete Supabase Edge Function implementation
  - File: `supabase/functions/process-emails/index.ts`
  - Convert Node.js worker to Deno-compatible code
  - Time: 8 hours

- [ ] Set up Supabase Cron jobs
  - Enable pg_cron extension
  - Create email processing cron (every 5 min)
  - Create token refresh cron (every hour)
  - Create reminders cron (daily 9 AM)
  - Create cleanup cron (daily midnight)
  - File: `supabase/migrations/YYYYMMDD_cron_jobs.sql`
  - Time: 4 hours

- [ ] Test and monitor cron jobs
  - Test Edge Function manually
  - Monitor first few cron executions
  - Verify email processing works
  - Time: 2 hours

---

## 🟠 HIGH PRIORITY - Week 2-3

### Supabase Cron Jobs (Continued from Week 1)
- [ ] OAuth token refresh function
  - Create SQL function for token refresh
  - File: `supabase/migrations/YYYYMMDD_token_refresh_function.sql`
  - Time: 3 hours

- [ ] Document reminder function
  - Create SQL function for sending reminders
  - Integrate with email sending
  - Time: 4 hours

- [ ] Cron job monitoring setup
  - Create monitoring queries
  - Set up alerts for failures
  - Time: 2 hours

### User Experience
- [ ] Install and configure toast notification system
  - Package: `react-hot-toast` or `sonner`
  - Time: 2 hours

- [ ] Add loading states to all forms
  - Components: All form submissions
  - Time: 4 hours

- [ ] Add error boundaries
  - File: `apps/web/components/error-boundary.tsx`
  - Wrap critical sections
  - Time: 4 hours

- [ ] Improve error messages
  - Standardize across all API routes
  - Add actionable guidance
  - Time: 6 hours

### Document Management UI
- [ ] Document viewer component
  - PDF preview, image viewer
  - File: `apps/web/components/document-viewer.tsx`
  - Time: 8 hours

- [ ] Document download button/link
  - Add to document lists
  - Time: 2 hours

- [ ] Document preview thumbnails
  - For images/PDFs in lists
  - Time: 6 hours

### Request Management Enhancements
- [ ] Edit request page
  - File: `apps/web/app/dashboard/requests/[id]/edit/page.tsx`
  - Time: 4 hours

- [ ] Delete request functionality
  - Add to request detail page
  - Time: 2 hours

---

## 🟡 MEDIUM PRIORITY - Week 3-5

### Testing Infrastructure
- [ ] Set up Vitest for unit tests
  - File: `vitest.config.ts`
  - Time: 2 hours

- [ ] Set up Playwright for E2E tests
  - File: `playwright.config.ts`
  - Time: 2 hours

- [ ] Set up React Testing Library
  - File: `test-setup.ts`
  - Time: 2 hours

- [ ] Write critical path tests
  - Signup/login flow
  - Create organization
  - Connect email
  - Create rule
  - Time: 16 hours

### UI Polish
- [ ] Responsive design improvements
  - Mobile-first approach
  - Test on real devices
  - Time: 8 hours

- [ ] Empty states for all lists
  - Requests, rules, storage, employees
  - Time: 4 hours

- [ ] Success notifications for all actions
  - Forms, deletes, creates
  - Time: 4 hours

- [ ] Skeleton loaders
  - Replace spinners with skeletons
  - Time: 6 hours

### Storage Adapters
- [ ] SharePoint adapter (if needed)
  - File: `packages/storage-adapters/src/sharepoint/sharepoint-adapter.ts`
  - Time: 12 hours

- [ ] Azure Blob Storage adapter (if needed)
  - File: `packages/storage-adapters/src/azure-blob/azure-blob-adapter.ts`
  - Time: 10 hours

---

## 🟢 LOW PRIORITY - Week 6+

### Advanced Features
- [ ] Request templates
  - Save common request patterns
  - Time: 6 hours

- [ ] Bulk operations
  - Select multiple, bulk delete/download
  - Time: 8 hours

- [ ] Advanced routing rules
  - Visual rule builder
  - Rule testing/preview
  - Time: 16 hours

- [ ] Document search
  - Full-text search across documents
  - Time: 12 hours

### Analytics
- [ ] Request analytics dashboard
  - Charts, metrics, trends
  - Time: 12 hours

- [ ] Storage usage analytics
  - Storage per organization
  - Time: 6 hours

### Security
- [ ] Upgrade encryption (AES-256-GCM)
  - Replace current encryption
  - Time: 8 hours

- [ ] Key management service integration
  - AWS KMS or Supabase Vault
  - Time: 12 hours

- [ ] Security audit
  - Third-party audit
  - Time: 8 hours

---

## 📋 Quick Wins (Can do anytime)

### Small Improvements
- [ ] Add keyboard shortcuts
  - `/` to search, `n` for new, etc.
  - Time: 4 hours

- [ ] Add copy-to-clipboard for IDs/URLs
  - Employee IDs, request IDs
  - Time: 2 hours

- [ ] Add export functionality
  - CSV export for employees, requests
  - Time: 4 hours

- [ ] Improve date formatting
  - Relative dates (2 hours ago, etc.)
  - Time: 2 hours

- [ ] Add tooltips
  - Helpful hints on hover
  - Time: 4 hours

---

## 🎯 Sprint Planning Template

### Sprint Goal
_[Fill in current sprint goal]_

### Sprint Backlog
1. [ ] Task 1
2. [ ] Task 2
3. [ ] Task 3

### Definition of Done
- [ ] Code reviewed
- [ ] Tests written/passing
- [ ] Documentation updated
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Accessibility checked

---

## 📊 Progress Tracking

### Current Sprint: Week 1
- **Started**: [Date]
- **Target End**: [Date]
- **Completed**: 0/8 tasks

### Overall Progress
- **Critical**: 0/8 tasks (0%)
- **High**: 0/10 tasks (0%)
- **Medium**: 0/12 tasks (0%)
- **Low**: 0/10 tasks (0%)

---

## 🚀 Immediate Actions (This Week)

**Monday-Tuesday:**
- [ ] Implement `/api/email/disconnect`
- [ ] Implement `/api/requests/[id]/update`
- [ ] Implement `/api/requests/[id]/delete`

**Wednesday-Thursday:**
- [ ] Set up OneDrive OAuth flow
- [ ] Test OAuth with real account

**Friday:**
- [ ] Implement OneDrive `uploadFile()` and `downloadFile()`
- [ ] Test OneDrive adapter end-to-end

---

**Last Updated:** 2025-01-XX  
**Next Review:** End of week

