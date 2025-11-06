# Docuflow - UX Design Brief

**Version:** 1.0  
**Date:** January 2025  
**Status:** Production Ready (~95% Complete)  
**Target Audience:** UX Designers

---

## 📋 Executive Summary

Docuflow is a document collection platform that streamlines document collection, verification, and storage through email-driven automation. It connects institutional email accounts (Gmail, Outlook) with intelligent automation and cloud storage solutions (Google Drive, OneDrive, Supabase Storage, SharePoint).

**Core Value Proposition:** Eliminate manual friction in document collection by automating email-based workflows, intelligent routing, and cloud storage organization.

---

## 🎯 User Personas

### Primary Persona: Institutional Administrator
- **Role:** HR Manager, Office Administrator, Document Manager
- **Goals:** 
  - Collect documents from employees/students/clients efficiently
  - Track collection status and completion
  - Maintain compliance and audit trails
  - Automate repetitive document collection tasks
- **Pain Points:**
  - Manual email management is time-consuming
  - Documents scattered across inboxes
  - No centralized tracking system
  - Difficult to ensure timely submissions

### Secondary Persona: Organization Owner
- **Role:** Organization owner or admin
- **Goals:**
  - Set up organization workflows
  - Configure integrations and storage
  - Manage team members and permissions
  - Monitor overall system health
- **Pain Points:**
  - Complex setup processes
  - Need clear visibility into system status

### User Roles (Access Control)
1. **Owner** - Full organization control, can manage admins
2. **Admin** - Can manage integrations, storage, rules, and members
3. **Member** - Can view and create requests, view documents

---

## 🏗️ Application Structure

### Authentication Flow
1. **Sign Up** (`/signup`) - New user registration
2. **Login** (`/login`) - Email/password authentication
3. **OAuth Providers** - Google, Microsoft (for email/storage integration)
4. **Organization Setup** - First-time organization creation

### Main Application Areas

#### 1. Dashboard (`/dashboard`)
- **Purpose:** Central hub showing overview metrics and quick access
- **Key Elements:**
  - KPI Cards: Total Requests, Open Requests, Completed, Overdue
  - Integration Status: Email and Storage connection status
  - Quick Actions: Cards linking to main features
  - Recent Activity: Activity log snippet
  - Recent Requests: Latest 5 document requests
  - Upcoming Due: Requests due in next 7 days
  - 7-day Request Sparkline Chart

#### 2. Document Requests (`/dashboard/requests`)
- **Purpose:** Create and manage document collection requests
- **Key Features:**
  - List view of all requests with status badges
  - Create new request form
  - Edit existing requests
  - View request details
  - Send reminder emails
  - Delete requests
- **Request Statuses:**
  - `pending` - Created but not sent
  - `sent` - Email sent to recipient
  - `received` - Documents received
  - `missing_files` - Received but incomplete
  - `completed` - All documents received and verified
  - `expired` - Past due date without completion

#### 3. Documents (`/dashboard/documents`)
- **Purpose:** View and manage collected documents
- **Key Features:**
  - Table view with sorting
  - Document detail view with preview
  - Download documents
  - Delete documents
  - Status tracking (received, verified, error)
  - Upload status indicators
  - Link to source request
  - Link to routing rule used

#### 4. Email Integrations (`/dashboard/integrations`)
- **Purpose:** Connect and manage email accounts
- **Key Features:**
  - Connect Gmail account (OAuth)
  - Connect Outlook account (OAuth)
  - View connected accounts
  - Account status indicators (token expiration, last sync)
  - Disconnect accounts
  - Manual email processing trigger (admin/owner)
  - Manual token refresh (admin/owner)
- **Status Display:**
  - Connection status
  - Last sync timestamp
  - Token expiration status
  - Error messages if any

#### 5. Storage Configuration (`/dashboard/storage`)
- **Purpose:** Configure cloud storage destinations
- **Key Features:**
  - Add storage providers (Supabase, Google Drive, OneDrive)
  - Configure folder paths
  - Test connections
  - View storage account info
  - Delete storage configs
  - Multiple storage configs support

#### 6. Routing Rules (`/dashboard/rules`)
- **Purpose:** Configure automatic document routing and organization
- **Key Features:**
  - Create custom routing rules
  - Set rule priority (higher = evaluated first)
  - Define matching conditions:
    - Sender pattern (regex)
    - Subject pattern (regex)
    - File types (extensions)
  - Configure destination folder paths with placeholders
  - Toggle rule active/inactive
  - Edit/delete rules
  - Create default rules (quick start)
- **Folder Path Placeholders:**
  - `{sender_email}` - Sender's email address
  - `{sender_name}` - Sender's display name
  - `{employee_email}` - Employee email (if in org)
  - `{employee_name}` - Employee full name (if in org)
  - `{date}` - YYYY-MM-DD format
  - `{year}` - YYYY
  - `{month}` - MM

#### 7. Activity Logs (`/dashboard/activity`)
- **Purpose:** Audit trail of all system actions
- **Key Features:**
  - Chronological list of activities
  - Filter by action type
  - Filter by resource type
  - View activity details
  - Export capabilities (future)

#### 8. Employees (`/dashboard/employees`)
- **Purpose:** Employee directory and management
- **Key Features:**
  - Browse employee directory
  - View employee profiles
  - Edit employee information
  - Create new employees
  - Link employees to documents
  - View employee-related documents and requests

#### 9. Organization Settings (`/dashboard/organization`)
- **Purpose:** Manage organization details
- **Key Features:**
  - View/edit organization name
  - Organization slug
  - Organization settings (JSONB)

#### 10. Setup Wizard (`/dashboard/setup`)
- **Purpose:** Guided first-time setup
- **Key Features:**
  - Step-by-step setup checklist
  - Connect email account (Step 1)
  - Configure storage (Step 2)
  - Create first request (Step 3)
  - Progress indicators
  - Quick action links

---

## 🔄 Key User Flows

### Flow 1: First-Time Setup
1. User signs up → Creates account
2. Redirected to organization creation
3. Creates organization
4. Redirected to setup wizard
5. Connects email account (Gmail/Outlook OAuth)
6. Configures storage (Google Drive/OneDrive/Supabase)
7. Optionally creates first document request
8. Redirected to main dashboard

### Flow 2: Create Document Request
1. User navigates to Requests page
2. Clicks "New Request"
3. Fills form:
   - Subject
   - Recipient email
   - Message body
   - Due date (optional)
   - Required document types (optional)
4. Saves request (status: `pending`)
5. Optionally sends request email (status: `sent`)
6. Request appears in list with status badge

### Flow 3: Automatic Document Collection
1. System polls email account (every 5 minutes)
2. Detects new emails with attachments
3. Extracts sender, subject, attachments
4. Matches to existing document requests (by recipient email)
5. Applies routing rules (by priority)
6. Uploads documents to configured storage
7. Updates request status (`received` or `missing_files`)
8. Creates document records
9. Logs activity

### Flow 4: Configure Routing Rule
1. User navigates to Rules page
2. Clicks "New Rule"
3. Fills form:
   - Rule name
   - Priority (number)
   - Conditions (sender pattern, subject pattern, file types)
   - Actions (folder path with placeholders)
   - Active toggle
4. Saves rule
5. Rule appears in list, evaluated on next document processing

### Flow 5: Send Reminder
1. User views requests list
2. Sees request with status `sent` or `missing_files`
3. Clicks "Send Reminder" button
4. System sends reminder email via connected email account
5. Activity logged
6. Success message displayed

### Flow 6: View Document
1. User navigates to Documents page
2. Sees table of collected documents
3. Clicks document name or "View" button
4. Document detail page shows:
   - File name and metadata
   - Source request link
   - Routing rule used
   - Upload status
   - Sender information
   - Preview (if supported file type)
   - Download button
   - Delete button

---

## 🎨 UI Components & Patterns

### Status Badges
- **Request Statuses:**
  - `pending` - Yellow badge
  - `sent` - Blue badge
  - `received` - Green badge
  - `missing_files` - Orange badge
  - `completed` - Green badge
  - `expired` - Red badge

- **Document Statuses:**
  - `received` - Green badge
  - `verified` - Green badge
  - `error` - Red badge

- **Upload Status:**
  - `pending` - Yellow
  - `uploaded` - Green
  - `failed` - Red
  - Shows error message if failed

- **Connection Status:**
  - Connected - Green badge
  - Not Connected - Yellow badge
  - Error - Red badge

### Common Components
1. **LoadingButton** - Button with loading state
2. **EmptyState** - Empty state with icon, title, description, CTA
3. **SkeletonLoader** - Loading placeholder
4. **QueryParamToast** - Success/error messages via URL params
5. **DocumentViewer** - Document preview component
6. **EmailAccountStatus** - Shows email account health
7. **UploadStatusBadge** - Shows document upload status
8. **RequestActionButtons** - Edit, send, reminder, delete actions
9. **RuleActionButtons** - Edit, delete, toggle active
10. **StorageActionButtons** - Test, edit, delete storage configs

### Layout Patterns
- **Header:** White background, shadow, max-width container
  - Page title and description
  - Back button (if applicable)
  - Primary action button (if applicable)
  - Sign out button (on dashboard)
- **Content Area:** Gray-50 background, max-width container
  - Cards with white background and shadow
  - Responsive grid layouts
  - Consistent spacing (p-6, gap-4, gap-6)
- **Tables:** White background, striped rows, hover effects
- **Forms:** Standard form patterns with labels, inputs, validation

### Color Palette
- **Primary:** Blue-600 (buttons, links)
- **Success:** Green-600/Green-100/Green-800 (badges, status)
- **Warning:** Yellow-600/Yellow-100/Yellow-800 (pending, alerts)
- **Error:** Red-600/Red-100/Red-800 (errors, expired)
- **Neutral:** Gray scale (text, backgrounds, borders)
- **Background:** Gray-50 (page background), White (cards)

### Typography
- **Headings:** Bold, Gray-900
  - H1: text-2xl
  - H2: text-lg
  - H3: text-lg font-semibold
- **Body:** Gray-600/700
- **Small Text:** text-sm, Gray-500/600
- **Code/Mono:** Font-mono for folder paths, regex patterns

---

## 📊 Data Visualization Needs

### Dashboard Metrics
- **KPI Cards:** Large numbers with labels
- **Sparkline Chart:** 7-day request volume (mini bar chart)
- **Status Indicators:** Color-coded badges with icons
- **Progress Indicators:** Setup wizard steps

### Lists & Tables
- **Request List:** Card-based or table view
- **Document Table:** Multi-column with sorting
- **Activity Log:** Timeline-style list
- **Rules Table:** Status, priority, conditions, actions

---

## 🔍 Key Interaction Patterns

### Form Interactions
- **Validation:** Real-time or on submit
- **Loading States:** Disable form during submission
- **Success Feedback:** Toast messages or query param redirects
- **Error Handling:** Inline error messages, red error boxes

### Navigation
- **Breadcrumbs:** Not currently implemented (consider adding)
- **Back Links:** "← Back" buttons in headers
- **Quick Actions:** Dashboard cards linking to features
- **Deep Linking:** Direct links to specific resources

### Feedback Mechanisms
- **Success Messages:** Green alert boxes, query param toasts
- **Error Messages:** Red alert boxes with details
- **Loading States:** Skeleton loaders, button loading states
- **Empty States:** Helpful messaging with CTAs

### Modals & Overlays
- **Delete Confirmations:** Confirmation dialogs (implemented as separate pages with confirmation)
- **Form Modals:** Consider for inline editing (currently separate pages)

---

## 🎯 Design Priorities

### Must-Have Design Elements
1. **Clear Status Communication**
   - Status badges throughout
   - Connection health indicators
   - Upload progress/status
   - Error states with actionable guidance

2. **Efficient Information Architecture**
   - Dashboard as central hub
   - Logical grouping of features
   - Quick access to common actions
   - Clear navigation hierarchy

3. **Accessibility (WCAG 2.2 AA)**
   - Keyboard navigation
   - Screen reader support
   - Color contrast compliance
   - Focus indicators
   - ARIA labels

4. **Responsive Design**
   - Mobile-friendly layouts
   - Tablet optimization
   - Desktop experience
   - Touch-friendly interactions

5. **Progressive Disclosure**
   - Setup wizard for new users
   - Collapsible sections (routing rules details)
   - Expandable information (request details)

### Design Considerations

#### 1. Trust & Security
- Clear indication of OAuth connections
- Token status transparency
- Error messages should guide users to fix issues
- Security indicators (encryption, secure connections)

#### 2. Automation Transparency
- Show when emails were last processed
- Display routing rule matches
- Activity log for auditability
- Clear indication of automated vs manual actions

#### 3. Error Recovery
- Clear error messages with next steps
- Retry mechanisms for failed operations
- Status indicators for connection issues
- Guidance for common problems (token expiration, etc.)

#### 4. Onboarding
- Setup wizard for new organizations
- Default rules for quick start
- Helpful empty states
- Tooltips or help text for complex features

---

## 📱 Current Page Structure

### Public Pages
- `/` - Landing/home page (redirects to login if not authenticated)
- `/login` - Login page (email/password form)
- `/signup` - Sign up page (email/password form)

### Authenticated Pages
- `/dashboard` - Main dashboard
- `/dashboard/requests` - Document requests list
- `/dashboard/requests/new` - Create request form
- `/dashboard/requests/[id]` - Request detail view
- `/dashboard/requests/[id]/edit` - Edit request form
- `/dashboard/documents` - Documents list
- `/dashboard/documents/[id]` - Document detail view
- `/dashboard/integrations` - Email integrations
- `/dashboard/storage` - Storage configuration list
- `/dashboard/storage/new` - Add storage form
- `/dashboard/storage/[id]` - Storage detail view
- `/dashboard/storage/[id]/edit` - Edit storage form
- `/dashboard/rules` - Routing rules list
- `/dashboard/rules/new` - Create rule form
- `/dashboard/rules/[id]/edit` - Edit rule form
- `/dashboard/activity` - Activity logs
- `/dashboard/employees` - Employee directory
- `/dashboard/employees/new` - Create employee form
- `/dashboard/employees/[id]` - Employee detail view
- `/dashboard/employees/[id]/edit` - Edit employee form
- `/dashboard/organization` - Organization settings
- `/dashboard/setup` - Setup wizard

### OAuth Callback Pages
- `/auth/google/callback` - Google OAuth callback
- `/auth/microsoft/callback` - Microsoft OAuth callback
- `/auth/onedrive/callback` - OneDrive OAuth callback
- `/auth/signout` - Sign out handler

---

## 🔐 Authentication & Security

### Authentication Methods
- **Email/Password:** Supabase Auth
- **OAuth Providers:**
  - Google (Gmail, Google Drive)
  - Microsoft (Outlook, OneDrive, SharePoint)

### Security Features
- Row Level Security (RLS) on all tables
- Encrypted OAuth tokens
- Organization-based data isolation
- Role-based access control (owner, admin, member)
- Secure token storage and refresh

### Security UX Considerations
- Clear indication of active sessions
- OAuth connection status
- Token expiration warnings
- Disconnect functionality
- Secure logout

---

## 📈 Status Tracking & Notifications

### Request Status Lifecycle
```
pending → sent → received → completed
                ↓
         missing_files
                ↓
            expired (if overdue)
```

### Document Status
- `received` - Document collected
- `verified` - Document verified (future)
- `error` - Processing error

### Upload Status
- `pending` - Queued for upload
- `uploaded` - Successfully uploaded to storage
- `failed` - Upload failed (with error message)

### Notification System
- Email reminders for pending requests
- Status updates visible in UI
- Activity log entries
- Error notifications (future: in-app notifications)

---

## 🎨 Design System Recommendations

### Component Library
Consider using or building:
- Button variants (primary, secondary, danger, ghost)
- Input components with validation states
- Select/Dropdown components
- Modal/Dialog components
- Toast/Notification components
- Card components
- Badge components
- Table components
- Form components

### Spacing System
- Consistent spacing scale (4px base)
- Max-width containers (max-w-7xl for main content)
- Consistent padding (p-4, p-6, p-8)

### Icon System
- Consistent icon library (Heroicons recommended)
- Icon sizes (h-4 w-4, h-5 w-5, h-6 w-6)
- Icon colors matching status system

---

## 🚀 Future Enhancements (Not in Current Scope)

### Potential UX Improvements
1. **Dashboard Enhancements**
   - Customizable dashboard widgets
   - More detailed analytics charts
   - Export capabilities

2. **Advanced Features**
   - Bulk operations (select multiple requests/documents)
   - Advanced filtering and search
   - Document preview in list view
   - In-app notifications
   - Email templates
   - Request templates

3. **User Experience**
   - Keyboard shortcuts
   - Drag-and-drop file uploads
   - Real-time updates (WebSocket)
   - Mobile app (future)

4. **Reporting**
   - Custom reports
   - Data visualization dashboards
   - Export to CSV/PDF

---

## 📝 Content Guidelines

### Tone & Voice
- **Professional** - Institutional/enterprise tone
- **Clear** - Avoid jargon, use plain language
- **Helpful** - Provide guidance and next steps
- **Concise** - Get to the point quickly

### Error Messages
- Clear explanation of what went wrong
- Actionable next steps
- Link to relevant help/documentation
- Avoid technical jargon when possible

### Success Messages
- Confirm what happened
- Provide next steps if applicable
- Use positive, encouraging language

### Empty States
- Explain why the state is empty
- Provide clear call-to-action
- Include helpful tips or examples

---

## 🎯 Design Deliverables Checklist

When designing, please provide:

- [ ] **User Flow Diagrams** - For key user journeys
- [ ] **Wireframes** - Low-fidelity for all main pages
- [ ] **High-Fidelity Mockups** - Desktop and mobile views
- [ ] **Component Library** - Reusable UI components
- [ ] **Design System** - Colors, typography, spacing, icons
- [ ] **Interaction Specifications** - Hover states, transitions, animations
- [ ] **Accessibility Audit** - WCAG 2.2 AA compliance
- [ ] **Responsive Breakpoints** - Mobile, tablet, desktop
- [ ] **Error State Designs** - All error scenarios
- [ ] **Loading States** - Skeleton loaders, spinners
- [ ] **Empty States** - All empty state variations
- [ ] **Microcopy** - Button labels, tooltips, help text

---

## 📚 Additional Resources

### Technical Documentation
- `README.md` - Project overview
- `AGENTS.MD` - Development workflow
- `DATABASE_SETUP.md` - Database schema
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide

### Code References
- Components: `apps/web/components/`
- Pages: `apps/web/app/dashboard/`
- API Routes: `apps/web/app/api/`
- Types: `apps/web/types/database.types.ts`

### Current Implementation
- Framework: Next.js 14+ (App Router)
- Styling: Tailwind CSS
- UI Patterns: Custom components (no design system library yet)
- Icons: Heroicons (via SVG)

---

## 🤝 Collaboration Notes

### Questions for Design Team
1. Should we implement a sidebar navigation or keep top navigation?
2. What level of detail in dashboard charts/metrics?
3. How should routing rule configuration be presented? (wizard vs. single form)
4. Should document preview be inline or modal?
5. Mobile-first or desktop-first approach?

### Design Handoff
- Provide Figma/Sketch files with organized artboards
- Include component specifications
- Provide design tokens (colors, spacing, typography)
- Document interaction behaviors
- Include accessibility specifications

---

**End of Design Brief**

This document should serve as the foundation for all UX design work. Please reference this document when making design decisions and ensure all designs align with the documented user flows, personas, and feature requirements.


