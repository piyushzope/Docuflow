# Agents

> **Purpose**: This Agents.md defines the multi‑agent system used in Cursor to plan, design, implement, test, and launch a production‑ready web application. It standardizes roles, prompts, handoffs, and evaluation criteria so work is fast, auditable, and consistent.

---

## 1) Principles

* **Single source of truth**: Requirements live in `/docs/` and `README.md`. Agents must sync with these before starting.
* **Small, verifiable steps**: Prefer short diffs and focused PRs. Each step has tests or observable acceptance criteria.
* **Human‑in‑the‑loop**: Agents propose; maintainers approve.
* **Traceability**: Every automated change references an issue, task ID, or checklist item.
* **Security & privacy**: No secrets in code. Use `.env.local` for local dev and secret stores for deployments.

---

## 2) Repository Layout (Docuflow Monorepo)

```
/
├─ apps/
│  ├─ web/                   # Next.js App Router frontend dashboard
│  │  ├─ app/                # App router pages & API routes
│  │  ├─ components/         # Reusable UI components
│  │  ├─ lib/                # Client & server utilities
│  │  │  ├─ supabase/        # Supabase client/server/middleware
│  │  │  ├─ routing/         # Rules engine
│  │  │  └─ utils/           # Encryption, helpers
│  │  ├─ types/              # TypeScript types (database.types.ts)
│  │  └─ package.json
│  └─ email-worker/          # Background email processing service
│     ├─ src/
│     └─ package.json
├─ packages/
│  ├─ email-integrations/    # Gmail/Outlook API clients
│  ├─ storage-adapters/      # Pluggable cloud storage (GDrive, OneDrive, Supabase)
│  └─ shared/                # Shared utilities (encryption, types)
├─ supabase/
│  ├─ migrations/            # SQL migrations, RLS policies, functions
│  ├─ functions/             # Edge functions (process-emails)
│  └─ config.toml            # Supabase local configuration
├─ scripts/                  # Migration & setup scripts
│  ├─ run-migration.js
│  ├─ run-employee-directory-migration.js
│  └─ check-oauth-env.js
├─ docs/                     # Project docs (ADRs, specs)
├─ .github/                  # CI/CD workflows, issue templates
├─ package.json              # Root package.json (workspace)
├─ .env.example
└─ README.md
```

---

## 3) Agent Roster

Each agent has: **Mission**, **Primary Prompt**, **Inputs**, **Outputs**, **Handoffs**, **Quality Gates**.

### 3.1 Product Manager (PM)

* **Mission**: Translate business goals to backlog items with clear acceptance criteria.
* **Primary Prompt**:

  * *You are a pragmatic PM. Convert stakeholder goals into concise user stories with AC in Given‑When‑Then form. Prioritize via impact vs. effort. Flag unknowns & risks.*
* **Inputs**: Vision, KPIs, stakeholder notes.
* **Outputs**: `/docs/backlog.md`, issues labeled `type:feature` with AC & definition of done (DoD).
* **Handoffs**: To *Tech Lead* and *UX Designer*.
* **Quality Gates**: Each story has AC, metrics, dependencies.

### 3.2 UX Designer

* **Mission**: Produce flows and wireframes consistent with design system.
* **Primary Prompt**:

  * *Create task flows, low‑fi wireframes, and copy guidelines. Apply accessibility (WCAG 2.2 AA) & responsive patterns.*
* **Inputs**: PM stories, design tokens.
* **Outputs**: `/docs/wireframes/*.md` (links to Figma if used), `/public/wireframes/`.
* **Handoffs**: To *Frontend Dev* and *UX Writer*.
* **Quality Gates**: Keyboard nav plan; color contrast verified.

### 3.3 UX Writer / Content

* **Mission**: Clear, actionable microcopy.
* **Primary Prompt**:

  * *Draft concise, user‑first copy. Prefer verbs, avoid jargon, add helpful error states. Internationalization‑ready.*
* **Outputs**: `/docs/content/*.md`, i18n resource keys in `/public/locales/`.

### 3.4 Tech Lead (TL)

* **Mission**: Choose architecture & guardrails.
* **Primary Prompt**:

  * *Select stack, module boundaries, data flow, and error handling. Maintain ADRs. Keep cognitive load low. Plan observability.*
* **Outputs**: `/docs/architecture.md`, ADRs, `/docs/observability.md`.

### 3.5 API Designer

* **Mission**: Define stable contracts.
* **Primary Prompt**:

  * *Produce OpenAPI/AsyncAPI specs with examples and error schemas. Ensure idempotency & pagination guidelines.*
* **Outputs**: `/docs/specs/openapi.yaml`, `/docs/specs/errors.md`.

### 3.6 Database Engineer

* **Mission**: Model data, write SQL migrations, and enforce Row-Level Security (RLS).
* **Primary Prompt**:

  * *Propose normalized schema with pragmatic denormalization where needed. Write Supabase SQL migrations with RLS policies. Ensure migrations are idempotent, test for recursion issues, and enforce least-privilege access patterns.*
* **Outputs**: `supabase/migrations/*.sql` (schema, RLS policies, triggers, functions), seed/maintenance scripts in `/scripts/`.
* **Quality Gates**: All tables protected by RLS; policies tested for least privilege; no recursion issues; migrations runnable via `run-migration.js` or Supabase CLI.

### 3.7 Frontend Developer

* **Mission**: Implement UI with quality.
* **Primary Prompt**:

  * *Build accessible, responsive components using the design system. Strong typing, unit tests, storybook stories.*
* **Outputs**: `components/*`, `app/*` or `src/*`, stories, tests.

### 3.8 Backend Developer

* **Mission**: Implement services & data access via Supabase.
* **Primary Prompt**:

  * *Implement Next.js API routes, Supabase service clients, and business logic. Add Zod validation, logging, and tests. Handle edge cases & idempotency. Use Supabase client/server utilities from `lib/supabase/`.*
* **Outputs**: `app/api/*`, Supabase service layer, tests, observability hooks.

### 3.9 DevOps/Platform

* **Mission**: CI/CD, environments, secrets, infra as code.
* **Primary Prompt**:

  * *Create GitHub Actions for lint/tests/build/e2e. Provision preview deploys. Enforce secret scanning and branch protections.*
* **Outputs**: `.github/workflows/*`, infra code, environment docs.

### 3.10 QA Engineer

* **Mission**: Risk‑driven testing.
* **Primary Prompt**:

  * *Write test plans, e2e specs (Playwright), and regression suites. Add exploratory charters for high‑risk areas.*
* **Outputs**: `/docs/test-plan.md`, `tests/e2e/*`.

### 3.11 Security Engineer

* **Mission**: Shift‑left security.
* **Primary Prompt**:

  * *Threat model, add authN/Z patterns, validate inputs, and configure dependency scanning (Snyk, npm audit) and secret scanning.*
* **Outputs**: `/docs/threat-model.md`, security checklists.

### 3.12 Accessibility Lead

* **Mission**: WCAG 2.2 AA compliance.
* **Primary Prompt**:

  * *Run automated checks (axe), keyboard nav tests, screen‑reader notes, and color contrast validations.*
* **Outputs**: `/docs/a11y-report.md`.

### 3.13 Analytics Engineer

* **Mission**: Product telemetry & KPIs.
* **Primary Prompt**:

  * *Define events & schemas, add client/server instrumentation, produce dashboards.*
* **Outputs**: `/docs/analytics-spec.md`, `lib/analytics.ts`.

### 3.14 Performance Engineer

* **Mission**: Web vitals & backend perf.
* **Primary Prompt**:

  * *Budget for LCP/TTI/CLS, analyze traces, propose fixes.*
* **Outputs**: `/docs/perf-budget.md`, perf test scripts.

---

## 4) Agent Prompts Library (ready‑to‑paste)

### 4.1 PM — Backlog Builder

```
System: You are a Product Manager for {{PROJECT_NAME}}.
User: Convert the vision below into user stories with acceptance criteria (Given‑When‑Then), risks, and dependencies. Estimate impact vs effort (S/M/L). Output a markdown backlog table and a prioritized list.
Context: {{paste vision, KPIs, constraints}}
```

### 4.2 TL — Architecture Setup

```
System: You are a Tech Lead optimizing for maintainability and DX.
User: Propose the initial architecture for {{STACK}} (e.g., Next.js App Router + Supabase PostgreSQL + Supabase Auth). Include monorepo folder structure, data flow via Supabase clients, RLS patterns, error handling, and observability plan. Output ADR‑style decisions.
```

### 4.3 API — Contract First

```
System: You are an API Designer.
User: Draft OpenAPI 3.1 for the endpoints described. Include request/response schemas, pagination, sorting, filtering, error objects with codes, and examples. Validate for breaking changes.
Context: {{stories or data model}}
```

### 4.4 Frontend — Component Builder

```
System: You are a Frontend Developer.
User: Build a11y‑friendly React components matching the wireframes. Provide Storybook stories and @testing-library tests. Avoid inline styles; use Tailwind or CSS Modules. Document props.
Context: {{wireframes, tokens}}
```

### 4.5 Backend — Service Implementor

```
System: You are a Backend Developer.
User: Implement services and API routes for the following contracts. Add Zod validation, logging, and idempotency keys for POST. Include unit tests.
Context: {{openapi excerpt}}
```

### 4.6 QA — Test Plan

```
System: You are a QA Engineer.
User: Write a risk‑based test plan, smoke suite, and e2e scenarios (Playwright). Include data setup and teardown steps.
Context: {{stories, flows}}
```

### 4.7 Security — Threat Model

```
System: You are a Security Engineer.
User: Produce a concise threat model using STRIDE. List mitigations, required libraries/middleware, and CI checks.
```

### 4.8 Analytics — Event Spec

```
System: You are an Analytics Engineer.
User: Propose an event taxonomy with names, properties, and PII handling. Define success metrics and a validation checklist.
```

---

## 5) Workflows & Handoffs

### 5.1 Inception → MVP

1. **PM** drafts `/docs/backlog.md`.
2. **TL** creates `/docs/architecture.md` + ADRs.
3. **API Designer** drafts `/docs/specs/openapi.yaml`.
4. **DB Engineer** produces SQL schema + migrations in `supabase/migrations/*`, run via `run-migration.js` or Supabase CLI.
5. **Frontend/Backend** implement vertical slice (`feature/*` branch), open PR.
6. **QA** writes tests; **Accessibility** runs checks.
7. **Security** reviews RLS policies & OAuth flows; **Perf** validates budget.
8. **DevOps** enables preview & CI gates.
9. Merge to `main` when all gates pass.

**Docuflow-specific**: Validate OAuth env vars with `check-oauth-env.js`; test RLS policies in staging.

### 5.2 Issue Template (copy to `.github/ISSUE_TEMPLATE/feature_request.md`)

```
# Story
As a <user>, I want <goal>, so that <outcome>.

# Acceptance Criteria (Given‑When‑Then)
- [ ] Given … When … Then …
- [ ] Given … When … Then …

# Non‑functional
- [ ] a11y, perf budget, security notes

# Notes
Links, mocks, dependencies
```

### 5.3 PR Checklist (CI gate)

* [ ] Linked issue
* [ ] Tests added/updated
* [ ] Lint/typecheck pass
* [ ] a11y notes
* [ ] Secrets not committed
* [ ] Changelog updated (if user‑facing)

---

## 6) Cursor Usage Patterns

### 6.1 Composer / Chat Prompts

* **Plan first**: Ask an agent to create a plan diff (files, functions, tests) before code generation.
* **Guardrails**: Provide `CONSTRAINTS:` section (no secrets, must add tests, etc.).
* **Review loops**: Instruct agent to open a PR with a summary and checklist.

### 6.2 Structured Prompt Template

```
ROLE: <one of the Agents>
GOAL: <what to achieve>
CONTEXT: <files, specs, constraints>
OUTPUT: <diffs, files, tests, docs>
CHECKS: <lint, tests, a11y, perf>
NEXT: <who receives handoff>
```

### 6.3 Typical Commands (examples)

* *"Create a vertical slice for user signup using Next.js App Router, Supabase Auth (Google OAuth), SQL migration with RLS policies. Include Zod validation and Playwright tests."*
* *"Refactor DashboardPage into smaller components; add storybook stories and unit tests."*
* *"Write a SQL migration to add a new table with RLS policies; include trigger for audit logging."*
* *"Add a new storage adapter for Azure Blob Storage following the base-adapter pattern."*

---

## 7) Tech Stack (Docuflow)

* **Frontend**: Next.js App Router (TypeScript), Tailwind, shadcn/ui, Zod.
* **Backend**: Next.js API routes, Supabase (PostgreSQL, Auth, Storage, Edge Functions).
* **Database**: Supabase PostgreSQL with SQL migrations, RLS policies, triggers, functions.
* **Auth**: Supabase Auth with OAuth providers (Google, Microsoft, OneDrive).
* **Workers**: Node-based email worker (`apps/email-worker`) for Gmail/Outlook integration polling.
* **Storage Adapters**: Pluggable system (`packages/storage-adapters`) for OneDrive, Google Drive, Supabase Storage.
* **Email Integrations**: OAuth-based clients (`packages/email-integrations`) for Gmail/Outlook.
* **Testing**: Vitest/Jest (planned), Testing Library, Playwright (planned).
* **Quality**: ESLint, Prettier, TypeScript strict mode.
* **CI/CD**: GitHub Actions (planned), preview deploys (Vercel for frontend, Supabase for backend).
* **Observability**: Web Vitals (client), Supabase logs (server).

> See `/docs/architecture.md` for detailed stack decisions.

---

## 8) Environment & Secrets

* Add keys to `apps/web/.env.local`; commit `.env.example` only.
* Use `process.env.*` via typed helpers (consider `lib/env.ts` for validation).
* CI uses GitHub Environments & Secrets; deploys use platform secret stores.
* Validate OAuth configuration with `node check-oauth-env.js`.

**Example `apps/web/.env.local` (Docuflow)**

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Keep secret! Used for admin operations

# Google OAuth (optional, for Gmail integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Microsoft OAuth (optional, for Outlook/OneDrive integration)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id  # Optional, for single-tenant apps
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Encryption (required for storing OAuth tokens securely)
ENCRYPTION_KEY=your-32-char-or-longer-secret-key  # Must be set! Never use default in production

# App URL (for OAuth redirects)
NEXTAUTH_URL=http://localhost:3000
```

**Security Notes**:
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — use only in server-side code, never expose to client.
- `ENCRYPTION_KEY` must be set to encrypt OAuth tokens — see `lib/utils/encryption.ts`.
- OAuth credentials should match redirect URIs exactly (check Azure/Google console).

---

## 9) Quality Gates

* **Accessibility**: axe violations = 0 (critical/serious). Keyboard paths documented.
* **Performance**: LCP < 2.5s (p75), CLS < 0.1, TBT < 200ms, API p95 < 300ms.
* **Security**: No high CVEs, input validated, RLS policies on all tables, OAuth env vars validated (`check-oauth-env.js`), encryption key set.
* **Reliability**: Unit ≥ 80% critical modules; e2e covers happy paths; RLS policies tested for least privilege.

---

## 10) Testing Strategy

* **Unit**: pure functions, hooks, services
* **Integration**: component + API boundary tests
* **E2E**: primary flows with Playwright
* **Fixtures**: factories and seed data
* **Snapshots**: only for stable UI

**Playwright smoke template**

```ts
import { test, expect } from '@playwright/test';

test('signup and login', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
});
```

---

## 11) Definition of Done (DoD)

* Story AC met and demoed
* Docs & ADRs updated
* Tests & CI passing
* A11y/perf/security budgets met
* Feature flags documented (if any)

---

## 12) Recipes (copy/paste into Cursor)

### 12.1 Bootstrap Project

```
ROLE: Tech Lead
GOAL: Initialize Next.js App Router monorepo with TypeScript, Tailwind, shadcn, Supabase client setup, OAuth flows (Google/Microsoft), ESLint, Prettier.
CONTEXT: Empty repo. Use npm/pnpm. Set up Supabase project and migrations structure.
OUTPUT: Commit with working app, sample page, health check route, Supabase client utilities, and README setup steps.
CHECKS: npm/pnpm lint, typecheck; dev server runs; Supabase connection works.
NEXT: Hand off to PM to create backlog.
```

### 12.2 Vertical Slice: CRUD Resource

```
ROLE: Full‑stack Dev
GOAL: Implement CRUD for `Project` (id, name, description, ownerId) with Next.js API routes and Supabase, including RLS policies.
CONTEXT: OpenAPI excerpt, Supabase schema.
OUTPUT: SQL migration with RLS, UI (list, view, create/edit), API routes (`app/api/projects/*`), Supabase service calls, tests.
CHECKS: RLS policies tested, a11y, perf budget, e2e updated.
NEXT: QA & Security review.
```

### 12.3 Observability

```
ROLE: Platform
GOAL: Add request logging, error boundaries, and web vitals collection to analytics endpoint.
OUTPUT: lib/logging.ts, error handler, /api/vitals, dashboards doc.
```

---

## 13) Governance & Change Control

* Use ADRs for notable decisions.
* Labeling: `type:feature`, `type:bug`, `type:chore`, `risk:high`, `a11y`, `security`.
* Weekly triage: close stale issues > 30 days without activity (unless `pinned`).

---

## 14) Git Workflow & Recovery (Trunk-Based)

Docuflow uses a **trunk-based development** model with short-lived feature branches to maintain a stable `main` branch and enable quick recovery from issues.

### 14.1 Branching Model & Protections

* **`main` branch** (protected):
  * Squash merges only (no merge commits)
  * No direct pushes — all changes via Pull Requests
  * Require CI checks: lint, typecheck, build must pass
  * Require at least one approval for PRs
  * Auto-delete feature branches after merge

* **Feature branches**: `feature/<issue-or-task>-<short-desc>`
  * Examples: `feature/123-add-email-validation`, `feature/456-refactor-routing`
  * Keep PRs small (<300 LOC when possible)
  * Rebase on `main` before opening PR (or use "Update branch" button)
  * Delete after merge

* **Hotfix branches**: `hotfix/<issue>-<desc>`
  * Created from `main` for urgent production fixes
  * Merged back to `main` via PR
  * Consider reverting hotfix branch after merge if a proper fix is implemented

### 14.2 Checkpoints (When & How)

Create **annotated checkpoint tags** before risky operations and after successful milestones to enable quick recovery.

#### When to Create Checkpoints

**Before**:
* Running database migrations (especially non-idempotent ones)
* Major dependency upgrades (Next.js, Supabase SDK, etc.)
* Large refactors affecting multiple modules
* Infrastructure changes (Edge Functions, CI/CD config)
* Releases to production

**After**:
* Successful migration completion
* Feature rollout verification
* Post-deployment health checks passing

#### Tag Conventions

* **Manual checkpoints**: `checkpoint/<YYYY-MM-DD>-<topic>`
  * Example: `checkpoint/2025-01-15-pre-migration-add-validation-table`
  * Use annotated tags: `git tag -a checkpoint/2025-01-15-pre-migration-add-validation-table -m "Checkpoint before adding validation table. PR #123"`
  * Include link to PR/issue in tag message

* **Releases**: `v<MAJOR>.<MINOR>.<PATCH>` (SemVer)
  * Example: `v1.2.3`
  * Create release notes in GitHub Releases
  * Tag after successful deployment: `git tag -a v1.2.3 -m "Release v1.2.3: Add email validation"`

* **Database snapshots** (optional): `db/<YYYY-MM-DD>-<migration-name>`
  * Use when migration is complex and rollback SQL is not available
  * Example: `db/2025-01-15-validation-schema`

* **Snapshot branches** (for WIP preservation): `snapshot/<YYYY-MM-DD>-<topic>`
  * Use when you need to preserve work-in-progress state
  * Example: `snapshot/2025-01-15-routing-refactor-wip`
  * Delete after work is stabilized and merged

### 14.3 Restore Procedures (Quick Playbook)

#### Inspect History

```bash
# View commit history with tags and branches
git log --decorate --oneline --graph

# List all checkpoint tags
git tag -l "checkpoint/*"

# View details of a specific tag
git show checkpoint/2025-01-15-pre-migration-add-validation-table
```

#### Restore to a Checkpoint Tag

```bash
# Create a new branch from a checkpoint tag
git switch -c restore/checkpoint-2025-01-15 checkpoint/2025-01-15-pre-migration-add-validation-table

# Or checkout directly (detached HEAD, then create branch if needed)
git checkout checkpoint/2025-01-15-pre-migration-add-validation-table
git switch -c restore/checkpoint-2025-01-15
```

#### Revert a Bad Merge on Main

```bash
# Find the merge commit SHA
git log --oneline --merges

# Revert the merge (use -m 1 to revert to main branch parent)
git revert -m 1 <merge_commit_sha>

# Push and open PR
git push origin main
```

#### Cherry-Pick a Fix

```bash
# Find the commit SHA from a known good state
git log --oneline

# Cherry-pick into current branch
git cherry-pick <commit_sha>

# Resolve conflicts if any, then commit
```

#### Roll Back a Release

```bash
# Create branch from previous release tag
git switch -c rollback/v1.2.2 v1.2.2

# Open PR to main (review carefully before merging)
```

### 14.4 Database & Supabase Safety

#### Before Running a Migration

1. **Dump the database** (dev/staging environments):
   ```bash
   # Using Supabase CLI
   supabase db dump -f backups/20250115-1430-pre-validation-migration.sql
   
   # Or via psql (if direct access)
   pg_dump $DATABASE_URL > backups/20250115-1430-pre-validation-migration.sql
   ```
   > **Note**: Ensure `backups/` directory is in `.gitignore` (see section 14.6 for operational playbooks)

2. **Tag the code**:
   ```bash
   git tag -a checkpoint/2025-01-15-pre-migration-add-validation-table \
     -m "Checkpoint before validation table migration. PR #123"
   git push origin checkpoint/2025-01-15-pre-migration-add-validation-table
   ```

#### After Successful Migration

1. **Tag the code**:
   ```bash
   git tag -a checkpoint/2025-01-15-post-migration-add-validation-table \
     -m "Checkpoint after successful validation table migration. PR #123"
   git push origin checkpoint/2025-01-15-post-migration-add-validation-table
   ```

2. **Verify migration**:
   * Run validation queries
   * Check RLS policies are active
   * Test application functionality

#### Rollback Guidance

* **Preferred**: Use idempotent migrations with `IF NOT EXISTS` / `IF EXISTS` clauses
* **If down migration available**: Run the down migration SQL
* **If no down migration**: Restore from database dump in non-production, then craft down migration SQL for production
* **Document rollback steps** in migration PR description

### 14.5 Commit & PR Standards

#### Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format (enforced in PR reviews):

* `feat: add email validation to document routing`
* `fix: resolve Outlook token refresh issue`
* `chore: update dependencies`
* `docs: add Git workflow section to AGENTS.MD`
* `refactor: extract routing logic into separate module`
* `test: add unit tests for validation service`

#### PR Requirements

Every PR must include:

* **Linked issue**: Reference GitHub issue (e.g., "Closes #123" or "Related to #456")
* **Risk level**: `low` | `medium` | `high` (for high-risk PRs, add rollback plan)
* **Rollback plan**: How to revert if deployment fails (especially for migrations, infra changes)
* **Testing evidence**: Screenshots, test results, or manual testing checklist
* **Scope**: Clear description of what changed and why

#### PR Title Format

Use conventional commit format in PR title (will be used in CHANGELOG):

```
feat: Add email validation to document routing
fix: Resolve Outlook token refresh 401 errors
chore: Update Next.js to 15.1.0
```

#### Squash Merge

* All PRs are squash-merged to `main`
* PR title becomes the commit message
* PR description is preserved in commit body

### 14.6 Operational Playbooks

#### Create a Checkpoint Tag

```bash
# Set variables
DATE=$(date -u +"%Y-%m-%d")
TOPIC="pre-migration-add-validation-table"
PR_NUMBER="123"

# Create annotated tag
git tag -a "checkpoint/${DATE}-${TOPIC}" \
  -m "Checkpoint before ${TOPIC}. PR #${PR_NUMBER}"

# Push tag
git push origin "checkpoint/${DATE}-${TOPIC}"
```

#### Restore to a Checkpoint

```bash
# List available checkpoints
git tag -l "checkpoint/*" | sort -V

# Create restore branch from checkpoint
TAG="checkpoint/2025-01-15-pre-migration-add-validation-table"
git switch -c "restore/${TAG}" "${TAG}"

# Verify you're on the right commit
git log --oneline -5
```

#### Revert a Merge Commit

```bash
# Find merge commit SHA
git log --oneline --merges -10

# Revert (use -m 1 for main branch parent)
MERGE_SHA="abc1234"
git revert -m 1 "${MERGE_SHA}"

# Push and create PR
git push origin main
```

#### Create a Release Tag

```bash
# Set version
VERSION="1.2.3"
RELEASE_NOTES="Add email validation, fix Outlook token refresh"

# Create annotated tag
git tag -a "v${VERSION}" -m "Release v${VERSION}: ${RELEASE_NOTES}"

# Push tag
git push origin "v${VERSION}"

# Create GitHub Release (via UI or gh CLI)
gh release create "v${VERSION}" --title "v${VERSION}" --notes "${RELEASE_NOTES}"
```

#### Database Backup Before Migration

```bash
# Set variables
DATE=$(date -u +"%Y%m%d")
TIME=$(date -u +"%H%M")
MIGRATION_NAME="add-validation-table"
BACKUP_FILE="backups/${DATE}-${TIME}-pre-${MIGRATION_NAME}.sql"

# Create backups directory if it doesn't exist
mkdir -p backups

# Dump database (Supabase CLI)
supabase db dump -f "${BACKUP_FILE}"

# Verify backup file exists
ls -lh "${BACKUP_FILE}"
```

---

## 15) Onboarding Checklist

* [ ] Clone repo, install Node LTS & npm/pnpm
* [ ] Copy `.env.example` → `apps/web/.env.local` and fill Supabase/OAuth credentials
* [ ] Run `node check-oauth-env.js` to validate OAuth configuration
* [ ] Set up Supabase project and run migrations (see `DATABASE_SETUP.md`)
* [ ] Run `npm run dev` (from root or `apps/web`)
* [ ] Run tests `npm test` & e2e `npm run e2e` (when available)
* [ ] Read `/README.md`, `/docs/architecture.md`, and recent ADRs
* [ ] Review `supabase/migrations/` to understand schema and RLS policies

---

## 16) Glossary (customize)

* **ADR**: Architecture Decision Record
* **AC**: Acceptance Criteria
* **DoD**: Definition of Done
* **WCAG**: Web Content Accessibility Guidelines

---

## 17) Project Variables (Docuflow)

* **Project name**: Docuflow
* **Brand tone**: Professional, trustworthy, automation-focused
* **Primary persona**: Institutional administrators, HR teams, document managers
* **Top KPIs**: Document collection completion rate, time-to-collect, storage integration success
* **Stack**: Next.js App Router, Supabase (PostgreSQL + Auth + Storage), OAuth (Google/Microsoft), TypeScript
* **Environments**: dev (local) / preview (Vercel preview) / prod (Vercel + Supabase cloud)
* **Domains**: Configure per environment in Supabase Auth settings and OAuth redirect URIs

---

## 18) Maintenance

* Weekly dependency updates
* Monthly security audit & threat model review (including RLS policy review)
* Quarterly performance review vs budget
* Regular OAuth token rotation checks (Microsoft secrets expire)
* Monitor Supabase migration history and RLS policy effectiveness

---

## 19) Appendix — Sample ADR Template

```
# ADR-000: Title
Date: 2025-01-01

## Context
Why we are making this decision

## Decision
What we decided

## Consequences
Positive, negative, and follow‑ups
```

---

## 20) Docuflow-Specific Notes

### Key Files & Patterns

* **Supabase Clients**: 
  - `apps/web/lib/supabase/client.ts` — browser client
  - `apps/web/lib/supabase/server.ts` — server-side client
  - `apps/web/lib/supabase/middleware.ts` — auth middleware

* **OAuth Flows**: 
  - Google: `apps/web/app/auth/google/route.ts` & `callback/route.ts`
  - Microsoft: `apps/web/app/auth/microsoft/route.ts` & `callback/route.ts`
  - OneDrive: `apps/web/app/auth/onedrive/route.ts` & `callback/route.ts`

* **Database Migrations**:
  - Run via `node run-migration.js <migration-file>` or Supabase CLI
  - All migrations in `supabase/migrations/` with timestamped names
  - Include RLS policies in same file or dedicated policy migration

* **Storage Adapters**: 
  - Base class: `packages/storage-adapters/src/base-adapter.ts`
  - Implementations: OneDrive, Google Drive, Supabase Storage
  - Used by routing engine: `apps/web/lib/routing/rules-engine.ts`

* **Email Worker**: 
  - Background service: `apps/email-worker/src/index.ts`
  - Processes email accounts via polling
  - Uses `packages/email-integrations/` clients

### Setup Scripts

* `check-oauth-env.js` — Validates OAuth environment configuration
* `run-migration.js` — Runs a single SQL migration file
* `run-employee-directory-migration.js` — Employee directory schema migration

### Documentation References

* `DATABASE_SETUP.md` — Supabase setup and migration guide
* `EMPLOYEE_DIRECTORY_SETUP.md` — Employee account creation workflow
* `MICROSOFT_OAUTH_SETUP.md` — Microsoft OAuth configuration steps
* `README.md` — Project overview and quick start

---

> Keep this file current. When agents produce new artifacts (e.g., test plans, threat models), cross‑link them here so new contributors and agents have a dependable map of the system.
