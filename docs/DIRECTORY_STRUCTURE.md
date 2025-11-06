# Directory Structure

This document explains the organization of documentation and scripts in the Docuflow repository.

## Root Directory

The root directory contains only essential project files:
- `README.md` - Main project documentation
- `AGENTS.MD` - Multi-agent system documentation
- `CHANGELOG.md` - Project changelog
- `GIT_SETUP.md` - Git repository setup guide
- `package.json` - Root package.json for monorepo
- `setup-remote.sh` - Git remote setup utility script

## Documentation Structure

### `docs/` - Main Documentation

#### `docs/setup/` - Setup Guides
Essential setup and configuration documentation:
- `DATABASE_SETUP.md` - Supabase database setup guide
- `EMPLOYEE_DIRECTORY_SETUP.md` - Employee account creation workflow
- `MICROSOFT_OAUTH_SETUP.md` - Microsoft OAuth configuration
- `ONBOARDING.md` - Developer onboarding guide
- `DEVELOPER_QUICK_REFERENCE.md` - Quick reference for developers
- `DOCUMENTATION_INDEX.md` - Documentation index
- `DOCUMENT_ROUTING_FIX.md` - Document routing setup
- `DOCUMENT_VALIDATION_SETUP.md` - Document validation setup
- `SUPABASE_CRON_SETUP.md` - Cron jobs setup
- `CRON_JOBS_SETUP_GUIDE.md` - Cron jobs guide
- `CRON_JOBS_SETUP_COMPLETE.md` - Cron jobs completion notes
- `COMPLETE_TESTING_GUIDE.md` - Testing guide

#### `docs/deployment/` - Deployment Documentation
All deployment-related documentation:
- `DEPLOYMENT_GUIDE.md` - Main deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- `DEPLOYMENT_CHECKLIST_COMPLETE.md` - Completed checklist
- `DEPLOYMENT_COMPLETE.md` - Deployment completion notes
- `DEPLOYMENT_STATUS.md` - Deployment status
- `DEPLOYMENT_STATUS_TRACKER.md` - Status tracker
- `DEPLOYMENT_VERIFICATION.md` - Verification guide
- `DEPLOYMENT_READY_CHECKLIST.md` - Pre-deployment checklist
- `QUICK_DEPLOY.md` - Quick deployment guide
- `QUICK_START_DEPLOYMENT.md` - Quick start guide
- `deploy-via-dashboard.md` - Dashboard deployment guide
- `EDGE_FUNCTION_DEPLOYMENT_NEEDED.md` - Edge function deployment
- `DEPLOY_REMAINING_FUNCTIONS.md` - Remaining functions
- `PRODUCTION_READINESS_CHECKLIST.md` - Production readiness
- `README_CRON_FIX.md` - Cron fix documentation
- `RUN_EMAIL_DISCONNECT_MIGRATION.md` - Email disconnect migration
- `RUN_MIGRATION_NOW.md` - Migration instructions
- `UI_ENHANCEMENT_SUMMARY.md` - UI enhancements

#### `docs/troubleshooting/` - Troubleshooting Guides
Fix guides and troubleshooting documentation:
- `EMAIL_RECEIVING_FIX.md` - Email receiving issues
- `EMAIL_STORAGE_PIPELINE_FIX_COMPLETE.md` - Storage pipeline fixes
- `FIX_EDGE_FUNCTION_SECRETS.md` - Edge function secrets
- `FIX_EMAIL_PROCESSING_AUTOMATION.md` - Email processing fixes
- `FIX_ORGANIZATION_RLS.md` - Organization RLS fixes
- `JWT_ERROR_FIX.md` - JWT error fixes
- `NEXTJS_15_FIXES.md` - Next.js 15 fixes
- `OUTLOOK_TOKEN_FIX_IMPLEMENTED.md` - Outlook token fixes
- `fix-outlook-token.md` - Outlook token troubleshooting
- `AUTOMATIC_TOKEN_REFRESH_SOLUTION.md` - Token refresh solution
- `DEBUG_EMAIL_PROCESSING.md` - Email processing debugging
- `ERROR_HANDLING_IMPROVEMENTS.md` - Error handling improvements

#### `docs/archive/` - Archived Documentation

##### `docs/archive/sessions/` - Session Summaries
Historical session and sprint summaries:
- `SPRINT_*.md` - Sprint progress summaries
- `FINAL_*.md` - Final summaries
- `SESSION_SUMMARY.md` - Session summaries
- `COMPLETE_SESSION_SUMMARY.md` - Complete session summary
- `IMPLEMENTATION_*.md` - Implementation progress
- `PROJECT_*.md` - Project status documents
- `CURRENT_STATUS.md` - Current status
- `NEXT_ACTIONS.md` - Next actions
- `NEXT_STEPS*.md` - Next steps documents
- `CODE_EXAMPLES.md` - Code examples

##### `docs/archive/progress/` - Feature Progress
Feature implementation and progress tracking:
- `STATUS_TRACKING_*.md` - Status tracking implementation
- `EMAIL_RECEIVING_*.md` - Email receiving progress
- `EMAIL_STORAGE_*.md` - Email storage progress
- `REFRESH_TOKENS_*.md` - Token refresh progress
- `SEND_REMINDERS_*.md` - Reminders progress
- `VALIDATION_*.md` - Validation progress
- `APPLY_STATUS_TRACKING.md` - Status tracking application

## Scripts Structure

### `scripts/` - Main Scripts Directory

#### `scripts/sql/` - SQL Scripts
Database-related SQL scripts:
- `check-validation-status.sql` - Validation status check
- `configure-database-settings.sql` - Database configuration
- `diagnose-cron-jobs.sql` - Cron jobs diagnosis
- `enable-pg-net-extension.sql` - PostgreSQL extension
- `fix-automatic-email-processing-direct.sql` - Email processing fixes
- `fix-automatic-email-processing.sql` - Email processing fixes
- `fix-cron-jobs.sql` - Cron jobs fixes
- `setup-cron-jobs.sql` - Cron jobs setup
- `test-status-tracking.sql` - Status tracking tests
- `verify-cron-jobs.sql` - Cron jobs verification
- `verify-migration.sql` - Migration verification
- `FIX_ORGANIZATION_RLS.sql` - Organization RLS fix
- `MANUAL_FIX_PROFILE.sql` - Profile manual fix
- `RUN_THIS_MIGRATION.sql` - Migration runner

#### `scripts/deployment/` - Deployment Scripts
Scripts for deployment tasks:
- `deploy-edge-function.sh` - Edge function deployment
- `deploy-manual.sh` - Manual deployment
- `deploy-validation-functions.sh` - Validation functions deployment
- `set-edge-function-secrets.sh` - Edge function secrets setup
- `copy-migration.sh` - Migration copying

#### `scripts/testing/` - Test Scripts
Testing and verification scripts:
- `test-edge-function.js` - Edge function tests
- `test-email-receiving-fix.js` - Email receiving tests
- `test-process-emails.sh` - Email processing tests
- `test-refresh-tokens.sh` - Token refresh tests
- `test-send-reminders.sh` - Reminder sending tests
- `verify-deployment.sh` - Deployment verification
- `verify-edge-functions.sh` - Edge functions verification
- `verify-status-tracking.js` - Status tracking verification
- `verify-validation-setup.js` - Validation setup verification

### Root Scripts
Utility scripts kept in root for easy access:
- `run-migration.js` - Main migration runner
- `run-*.js` - Various migration runners
- `check-oauth-env.js` - OAuth environment checker
- `execute-*.js` - SQL execution scripts
- `fix-*.js` - Fix scripts
- `generate-*.js` - Code generation scripts
- `prepare-deployment.js` - Deployment preparation
- `process-emails-ready-for-deployment.ts` - Email processing
- `quick-fix-*.js` - Quick fix scripts
- `setup-microsoft-oauth.ps1` - Microsoft OAuth setup (PowerShell)
- `get-microsoft-oauth-creds.ps1` - OAuth credentials (PowerShell)

## Other Directories

- `apps/` - Application code (Next.js web app, email worker)
- `packages/` - Shared packages (email integrations, storage adapters, shared utilities)
- `supabase/` - Supabase configuration, migrations, and edge functions
- `.github/` - GitHub workflows and templates

