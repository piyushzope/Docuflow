-- Populate Changelog with Sample Entries
-- This migration adds initial changelog entries to showcase product updates

INSERT INTO public.cms_changelog (
  slug,
  title,
  description,
  content_md,
  version,
  release_date,
  published_at,
  status,
  tags
) VALUES
(
  'v2-0-0-major-update',
  'Major Platform Update: Enhanced Automation & New Integrations',
  'We''re excited to announce our biggest update yet with enhanced automation capabilities, new storage integrations, and improved analytics.',
  '# Major Platform Update: v2.0.0

## What''s New

### Enhanced Automation
- **Scheduled Document Requests**: Set up recurring document requests with custom schedules (daily, weekly, monthly, quarterly, or annually)
- **Smart Follow-ups**: Automated follow-up emails are now sent based on configurable rules and timing
- **Bulk Operations**: Send document requests to hundreds of employees simultaneously with improved performance

### New Storage Integrations
- **Azure Blob Storage**: Full support for Microsoft Azure Blob Storage with automatic folder organization
- **SharePoint Integration**: Direct integration with SharePoint Online for seamless document routing
- **Enhanced OneDrive**: Improved OneDrive integration with better folder structure and metadata handling

### Improved Analytics
- **Real-time Dashboards**: New real-time analytics dashboards with live updates
- **Custom Reports**: Create and schedule custom reports with exportable formats (PDF, CSV, Excel)
- **Completion Forecasting**: AI-powered predictions for document collection completion rates

### API Enhancements
- **REST API v2**: New API endpoints with improved authentication and rate limiting
- **Webhook Support**: Real-time webhooks for document events (received, validated, stored)
- **GraphQL API**: New GraphQL endpoint for flexible data queries

## Improvements

- **Performance**: 3x faster document processing and routing
- **UI/UX**: Redesigned dashboard with improved navigation and mobile responsiveness
- **Security**: Enhanced encryption and compliance features (SOC 2 Type II certified)
- **Reliability**: 99.9% uptime SLA with improved error handling and recovery

## Bug Fixes

- Fixed issue with email parsing for complex email formats
- Resolved routing rule conflicts when multiple rules match
- Improved handling of large file uploads (>100MB)
- Fixed timezone issues in scheduled requests

## Migration Notes

Existing customers will be automatically upgraded. No action required. API v1 will continue to be supported for 6 months.',
  '2.0.0',
  '2025-01-15',
  '2025-01-15T00:00:00Z',
  'published',
  ARRAY['major', 'automation', 'integrations', 'analytics']
),
(
  'v1-5-0-analytics-update',
  'Analytics & Reporting Enhancements',
  'New analytics features including completion forecasting, custom reports, and improved dashboards.',
  '# Analytics & Reporting Enhancements: v1.5.0

## New Features

### Completion Forecasting
Predict when document collections will be completed using machine learning models. Get insights into potential delays and bottlenecks.

### Custom Reports
- Create custom report templates with drag-and-drop builder
- Schedule reports to be generated and emailed automatically
- Export reports in multiple formats: PDF, CSV, Excel, JSON

### Enhanced Dashboards
- Real-time metrics with auto-refresh
- Customizable dashboard layouts
- Department-level analytics
- Document type breakdowns

## Improvements

- Faster report generation (up to 10x improvement)
- Better visualization of trends and patterns
- Improved mobile dashboard experience',
  '1.5.0',
  '2024-12-20',
  '2024-12-20T00:00:00Z',
  'published',
  ARRAY['analytics', 'reporting', 'enhancement']
),
(
  'v1-4-0-scheduled-requests',
  'Scheduled & Recurring Document Requests',
  'Set up automated document requests that run on a schedule. Perfect for annual renewals, quarterly updates, and monthly submissions.',
  '# Scheduled & Recurring Document Requests: v1.4.0

## New Features

### Scheduled Requests
Schedule document requests to be sent at specific dates and times. Perfect for:
- Annual employee document renewals
- Quarterly compliance submissions
- Monthly status updates
- One-time future requests

### Recurring Requests
Set up requests that automatically repeat:
- **Daily**: Every day at a specified time
- **Weekly**: Every week on specific days
- **Monthly**: Every month on a specific date
- **Quarterly**: Every 3 months
- **Annually**: Once per year

### Smart Scheduling
- Timezone-aware scheduling
- Skip weekends/holidays option
- Automatic retry for failed sends
- Pause/resume recurring requests

## Use Cases

- **HR Teams**: Automate I-9 and W-4 renewals
- **Compliance**: Quarterly audit document collection
- **Healthcare**: Annual credential renewals
- **Education**: Semester document submissions',
  '1.4.0',
  '2024-11-15',
  '2024-11-15T00:00:00Z',
  'published',
  ARRAY['automation', 'scheduling', 'feature']
),
(
  'v1-3-0-azure-sharepoint',
  'Azure Blob Storage & SharePoint Integration',
  'New storage integrations for Microsoft Azure Blob Storage and SharePoint Online.',
  '# Azure Blob Storage & SharePoint Integration: v1.3.0

## New Integrations

### Azure Blob Storage
Full support for Microsoft Azure Blob Storage:
- Automatic container creation and organization
- Folder structure based on routing rules
- Metadata tagging for easy search
- Cost-effective storage option

### SharePoint Online
Direct integration with SharePoint Online:
- Route documents to specific SharePoint sites
- Automatic folder creation by date/department
- Support for document libraries
- Permission management

## Setup

Both integrations use OAuth 2.0 for secure authentication. Setup takes less than 5 minutes:
1. Navigate to Integrations in your dashboard
2. Select Azure Blob or SharePoint
3. Authorize access
4. Configure routing rules

## Benefits

- **Flexibility**: Choose the storage solution that fits your organization
- **Compliance**: Keep documents in your existing Microsoft infrastructure
- **Cost**: Optimize storage costs with Azure Blob
- **Collaboration**: Leverage SharePoint''s collaboration features',
  '1.3.0',
  '2024-10-10',
  '2024-10-10T00:00:00Z',
  'published',
  ARRAY['integrations', 'storage', 'microsoft']
),
(
  'v1-2-0-api-webhooks',
  'REST API v2 & Webhook Support',
  'New API endpoints and webhook support for real-time integrations.',
  '# REST API v2 & Webhook Support: v1.2.0

## API v2

### New Endpoints
- `GET /api/v2/documents` - Enhanced document listing with filters
- `POST /api/v2/requests` - Create document requests programmatically
- `GET /api/v2/analytics` - Access analytics data via API
- `PUT /api/v2/rules` - Manage routing rules via API

### Improvements
- Better error handling with detailed error codes
- Rate limiting with clear headers
- Pagination for large datasets
- Filtering and sorting options

## Webhooks

Subscribe to real-time events:
- **document.received**: When a document is received via email
- **document.validated**: When document validation completes
- **document.stored**: When a document is successfully stored
- **request.completed**: When a document request is fully completed
- **request.reminder**: When a reminder is sent

### Webhook Security
- HMAC signature verification
- Retry logic with exponential backoff
- Webhook delivery status tracking

## GraphQL API

New GraphQL endpoint for flexible queries:
- Query exactly the data you need
- Combine multiple resources in one request
- Real-time subscriptions (coming soon)

## Documentation

Full API documentation available at: https://docs.docuflow.com/api',
  '1.2.0',
  '2024-09-05',
  '2024-09-05T00:00:00Z',
  'published',
  ARRAY['api', 'webhooks', 'integration']
),
(
  'v1-1-0-bulk-operations',
  'Bulk Operations & Performance Improvements',
  'Send document requests to hundreds of employees at once with improved performance and reliability.',
  '# Bulk Operations & Performance Improvements: v1.1.0

## Bulk Operations

### Bulk Document Requests
- Send requests to up to 1,000 employees simultaneously
- Progress tracking with real-time updates
- Error handling for individual failures
- Resume failed bulk operations

### Bulk Employee Import
- Import employees from CSV/Excel files
- Automatic duplicate detection
- Validation before import
- Import history and rollback

## Performance Improvements

- **3x Faster Processing**: Optimized document routing and storage
- **Reduced Latency**: Average response time reduced by 60%
- **Better Caching**: Improved cache strategies for faster page loads
- **Database Optimization**: Query performance improvements

## Reliability

- **99.9% Uptime**: Improved infrastructure reliability
- **Better Error Recovery**: Automatic retry for transient failures
- **Health Monitoring**: Enhanced monitoring and alerting
- **Graceful Degradation**: System continues operating during partial failures

## UI Improvements

- Loading states for all async operations
- Better error messages
- Improved mobile experience
- Dark mode support (beta)',
  '1.1.0',
  '2024-08-01',
  '2024-08-01T00:00:00Z',
  'published',
  ARRAY['performance', 'bulk', 'improvement']
),
(
  'v1-0-0-launch',
  'Docuflow Launch: Automated Document Collection Platform',
  'We''re excited to launch Docuflow, the automated document collection platform that streamlines your document workflows.',
  '# Docuflow Launch: v1.0.0

## Welcome to Docuflow!

We''re thrilled to announce the launch of Docuflow, a comprehensive platform designed to automate document collection and organization for institutions and organizations.

## Core Features

### Automated Document Requests
- Send personalized document requests to individuals or groups
- Automated follow-ups and reminders
- Real-time tracking of request status

### Smart Document Routing
- Automatically route documents to the correct storage location
- Support for Google Drive, OneDrive, and Supabase Storage
- Configurable routing rules based on sender, document type, and metadata

### Email Integration
- Connect Gmail and Outlook accounts
- Automatic processing of incoming documents
- Attachment extraction and validation

### Document Validation
- Automatic validation of document types and formats
- File size and completeness checks
- Custom validation rules

### Employee Directory
- Manage your employee database
- Bulk import from CSV or Excel
- Segment targeting for document requests

### Analytics & Reporting
- Track completion rates and document types
- Storage usage analytics
- Exportable reports

## Getting Started

1. Sign up for a free 14-day trial
2. Connect your email accounts
3. Set up storage integrations
4. Create your first document request

## What''s Next

We have an exciting roadmap ahead with features like:
- Scheduled and recurring requests
- Advanced analytics
- API access
- Additional storage integrations

Thank you for being part of our journey!',
  '1.0.0',
  '2024-07-01',
  '2024-07-01T00:00:00Z',
  'published',
  ARRAY['launch', 'announcement', 'feature']
);

