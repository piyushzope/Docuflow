# Docuflow

Document collection platform with email-driven automation. Streamline document collection, verification, and storage by connecting institutional email accounts with intelligent automation and cloud storage.

**Status:** ✅ ~95% Complete - All Code Implemented - Deployment Pending (~50 min)

---

## ✨ Key Features

- ✅ **Email Integration** - Gmail & Outlook OAuth with automatic email processing
- ✅ **Document Management** - Full CRUD for document requests with status tracking
- ✅ **Smart Routing** - Automatic document routing based on configurable rules
- ✅ **Cloud Storage** - Support for Supabase Storage, Google Drive, and OneDrive
- ✅ **Activity Logging** - Complete audit trail of all actions
- ✅ **User-Friendly UI** - Responsive dashboard with consistent UX patterns
- ✅ **Production Ready** - Error handling, utilities, type safety throughout
- ✅ **Developer Friendly** - Comprehensive documentation and code examples

## Architecture

- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Frontend**: Next.js 14+ (React) with TypeScript
- **Email Integration**: OAuth for Gmail/Outlook, polling/webhook processing
- **Storage Adapters**: Pluggable system for OneDrive, Google Drive, SharePoint, Azure Blob Storage
- **Deployment**: Vercel (frontend), Supabase (backend)

## Project Structure

```
docuflow/
├── apps/
│   ├── web/              # Next.js frontend dashboard
│   └── email-worker/     # Background email processing service
├── packages/
│   ├── email-integrations/   # Gmail/Outlook API clients
│   ├── storage-adapters/     # Pluggable cloud storage adapters
│   └── shared/               # Shared types and utilities
├── supabase/
│   ├── migrations/           # Database schema migrations
│   ├── functions/            # Edge functions for webhooks
│   └── config.toml           # Supabase local configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI (optional, for local development)
- Google Cloud Project (for Gmail OAuth)
- Microsoft Azure App Registration (for Outlook OAuth)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in your Supabase and OAuth credentials.

3. Set up Supabase:

If using local Supabase:
```bash
supabase start
supabase db reset  # Runs migrations
```

If using hosted Supabase:
- Create a project at https://supabase.com
- Run migrations in the Supabase dashboard or via CLI:
```bash
supabase db push
```

4. Start the development server:

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Development

### Workspace Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js app for production
- `npm run start` - Start Next.js production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run unit tests (Vitest)
- `npm run test:e2e` - Run E2E tests (Playwright)

### Database Migrations

Migrations are located in `supabase/migrations/`. To create a new migration:

```bash
supabase migration new migration_name
```

To apply migrations:

```bash
supabase db reset  # Local
supabase db push   # Hosted
```

## Features

### Current MVP Scope

1. **Email Integration Layer**
   - Connect institutional email accounts (Outlook, Gmail) via OAuth
   - Automate email parsing to detect attachments and sender information

2. **Smart Document Routing**
   - Automatically classify and store documents based on sender, subject line, or pre-defined rules
   - Support storage options like OneDrive, Google Drive, SharePoint, and Azure Blob Storage

3. **Web Dashboard**
   - Create and track document requests
   - Show request status (e.g., "Pending," "Received," "Missing Files")
   - Configure routing rules for folder organization

4. **Notifications and Tracking**
   - Automatic email follow-ups or reminders for pending submissions
   - Activity logs for auditing and compliance

5. **Security and Compliance**
   - Encryption for data in transit and at rest
   - Row Level Security (RLS) policies
   - Audit logging for all operations

## Environment Variables

See `.env.example` for required environment variables.

## 📚 Documentation

**📖 [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Complete index of all documentation ⭐ NEW

### Getting Started
- **[ONBOARDING.md](./ONBOARDING.md)** - New developer onboarding guide
- **[DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md)** - Quick reference for common tasks
- **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - Comprehensive code examples

### Deployment
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Complete deployment guide
- **[DEPLOYMENT_STATUS_TRACKER.md](./DEPLOYMENT_STATUS_TRACKER.md)** - Track deployment progress
- **[CRON_JOBS_SETUP_GUIDE.md](./CRON_JOBS_SETUP_GUIDE.md)** - Cron jobs configuration

### Reference
- **[AGENTS.MD](./AGENTS.MD)** - Development workflow and patterns
- **[TESTING.md](./apps/web/TESTING.md)** - Testing guide
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database setup guide
- **[PROJECT_COMPLETION_REPORT.md](./PROJECT_COMPLETION_REPORT.md)** - Detailed completion report
- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Current project status
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history

## 📋 Quick Links

- **New to the project?** Start with [ONBOARDING.md](./ONBOARDING.md)
- **Need code examples?** Check [CODE_EXAMPLES.md](./CODE_EXAMPLES.md)
- **Deploying?** Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Project status?** See [CURRENT_STATUS.md](./CURRENT_STATUS.md)
- **All documentation?** See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) ⭐ NEW

## 📝 Project Status

- **Completion:** ~95% Complete
- **Status:** ✅ All Code Complete - Deployment Pending
- **Latest Updates:**
  - ✅ Email receiving fixes (status updates for all emails)
  - ✅ Token management system (refresh, status checking)
  - ✅ Send reminders system (Gmail/Outlook)
  - ✅ Comprehensive error handling
  - ✅ Cron jobs automation ready
- **Remaining:** Deploy 2 Edge Functions + configure cron jobs (~50 min)
- **Master Status:** See [PROJECT_STATUS_MASTER.md](./PROJECT_STATUS_MASTER.md) ⭐ NEW
- **Latest Changes:** See [CHANGELOG.md](./CHANGELOG.md)
- **Completion Report:** See [PROJECT_COMPLETION_REPORT.md](./PROJECT_COMPLETION_REPORT.md)

## License

ISC
