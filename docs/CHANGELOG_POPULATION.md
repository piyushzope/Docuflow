# Changelog Population Guide

The changelog has been populated with sample entries showcasing product updates and features.

## Migration File

The changelog entries are in: `supabase/migrations/20250115000000_populate_changelog.sql`

## Running the Migration

### Option 1: Using the Migration Script

```bash
node scripts/run-migration.js supabase/migrations/20250115000000_populate_changelog.sql
```

### Option 2: Using Supabase CLI

```bash
supabase db push
```

### Option 3: Direct SQL Execution

If you have direct database access, you can execute the SQL file directly in your Supabase SQL editor.

## Changelog Entries Included

1. **v2.0.0 - Major Platform Update** (January 15, 2025)
   - Enhanced automation capabilities
   - New storage integrations (Azure Blob, SharePoint)
   - Improved analytics
   - API enhancements

2. **v1.5.0 - Analytics & Reporting Enhancements** (December 20, 2024)
   - Completion forecasting
   - Custom reports
   - Enhanced dashboards

3. **v1.4.0 - Scheduled & Recurring Document Requests** (November 15, 2024)
   - Scheduled requests
   - Recurring automation
   - Smart scheduling

4. **v1.3.0 - Azure Blob Storage & SharePoint Integration** (October 10, 2024)
   - Azure Blob Storage support
   - SharePoint Online integration

5. **v1.2.0 - REST API v2 & Webhook Support** (September 5, 2024)
   - New API endpoints
   - Webhook support
   - GraphQL API

6. **v1.1.0 - Bulk Operations & Performance Improvements** (August 1, 2024)
   - Bulk document requests
   - Performance improvements
   - Reliability enhancements

7. **v1.0.0 - Docuflow Launch** (July 1, 2024)
   - Initial platform launch
   - Core features announcement

## Viewing the Changelog

After running the migration, you can view the changelog at:
- List page: `/changelog`
- Individual entries: `/changelog/{slug}`

Example URLs:
- `/changelog/v2-0-0-major-update`
- `/changelog/v1-5-0-analytics-update`
- `/changelog/v1-4-0-scheduled-requests`

## Customizing Entries

To add or modify changelog entries:

1. Edit the migration file or create a new one
2. Use the following structure:

```sql
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
) VALUES (
  'your-slug-here',
  'Your Title',
  'Short description',
  '# Markdown content here',
  '1.0.0',
  '2025-01-15',
  '2025-01-15T00:00:00Z',
  'published',
  ARRAY['tag1', 'tag2']
);
```

## Fields Explained

- `slug`: URL-friendly identifier (must be unique)
- `title`: Display title
- `description`: Short summary (shown in list view)
- `content_md`: Full markdown content (shown in detail view)
- `version`: Version number (e.g., "2.0.0")
- `release_date`: Date of release (DATE format)
- `published_at`: Publication timestamp (TIMESTAMPTZ)
- `status`: Must be 'published' to appear publicly
- `tags`: Array of tags for categorization

## Notes

- All entries are set to `status = 'published'` and have `published_at` set
- Entries are ordered by `release_date` DESC (newest first)
- The changelog page uses ISR with 30-minute revalidation
- Markdown content supports full markdown syntax

