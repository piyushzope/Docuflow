import type { Metadata } from 'next';
import Link from 'next/link';
import { FeatureGrid, type Feature } from '@/components/site/feature-grid';
import { CTA } from '@/components/site/cta';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'Features - Docuflow',
  description: 'Discover powerful features for automated document collection, smart routing, email integration, and more.',
});

const features: Feature[] = [
  {
    name: 'Automated Document Requests',
    description: 'Send personalized document requests to individuals or groups with automated follow-ups and reminders. Track responses in real-time and reduce manual work by up to 95%.',
    icon: '📧',
  },
  {
    name: 'Smart Document Routing',
    description: 'Automatically route documents to the correct storage location based on configurable rules. Support for Google Drive, OneDrive, SharePoint, Azure Blob, and Supabase Storage.',
    icon: '🗂️',
  },
  {
    name: 'Email Integration',
    description: 'Connect Gmail and Outlook accounts to automatically process incoming documents and attachments. Set up rules to filter and route emails based on sender, subject, or file type.',
    icon: '✉️',
  },
  {
    name: 'Document Validation',
    description: 'Automatically validate document types, formats, file sizes, and completeness. Ensure compliance with your organization\'s requirements before storing documents.',
    icon: '✅',
  },
  {
    name: 'Employee Directory',
    description: 'Manage your employee database with bulk import from CSV or Excel. Send document requests to groups, departments, or the entire organization with a few clicks.',
    icon: '👥',
  },
  {
    name: 'Analytics & Reporting',
    description: 'Track completion rates, document types, storage usage, and request timelines with comprehensive analytics dashboards. Export reports for compliance and auditing.',
    icon: '📊',
  },
  {
    name: 'Scheduled Sending',
    description: 'Schedule document requests to be sent at specific times. Set up recurring requests for annual renewals, quarterly updates, or monthly submissions.',
    icon: '📅',
  },
  {
    name: 'Template Management',
    description: 'Create and reuse email templates for common document requests. Customize messages while maintaining consistency across your organization.',
    icon: '📝',
  },
  {
    name: 'Security & Compliance',
    description: 'Enterprise-grade security with encryption at rest and in transit. Row-level security policies, audit logs, and compliance with SOC 2, GDPR, and HIPAA requirements.',
    icon: '🔒',
  },
];

const featureSections = [
  {
    id: 'automated-requests',
    title: 'Automated Document Requests',
    description: 'Streamline your document collection process with intelligent automation.',
    details: [
      'Send one-off or bulk document requests to individuals or entire groups',
      'Create reusable templates for common document types (I-9s, W-4s, certifications)',
      'Schedule requests to be sent at specific times or set up recurring reminders',
      'Automated follow-up emails for incomplete submissions',
      'Real-time tracking of request status and completion rates',
      'Customizable email templates with personalization tokens',
    ],
    relatedSolution: '/solutions/hr',
  },
  {
    id: 'smart-routing',
    title: 'Smart Document Routing',
    description: 'Intelligently route documents to the right storage location automatically.',
    details: [
      'Conditional routing rules based on sender, document type, or metadata',
      'Support for multiple storage providers (Google Drive, OneDrive, SharePoint, Azure Blob, Supabase)',
      'Automatic folder organization by date, department, or document type',
      'Metadata tagging for easy search and retrieval',
      'Conflict resolution for duplicate documents',
      'Custom routing logic with JavaScript expressions',
    ],
    relatedSolution: '/solutions/compliance',
  },
  {
    id: 'email-integration',
    title: 'Email Integration',
    description: 'Connect your email accounts to automatically process incoming documents.',
    details: [
      'OAuth-based integration with Gmail and Outlook',
      'Automatic attachment extraction and processing',
      'Email parsing to extract sender, subject, and metadata',
      'Status checks and health monitoring for connected accounts',
      'Support for multiple email accounts per organization',
      'Automatic token refresh and error recovery',
    ],
    relatedSolution: '/integrations',
  },
  {
    id: 'document-validation',
    title: 'Document Validation',
    description: 'Ensure document quality and compliance before storage.',
    details: [
      'File type validation (PDF, DOCX, XLSX, images)',
      'File size limits and format checks',
      'Required document set enforcement',
      'Completeness summaries and validation reports',
      'Content hash checking for duplicate detection',
      'Custom validation rules via API',
    ],
    relatedSolution: '/solutions/compliance',
  },
  {
    id: 'employee-directory',
    title: 'Employee Directory',
    description: 'Manage your employee database and target document requests effectively.',
    details: [
      'Comprehensive employee profiles with custom fields',
      'Bulk import from CSV or Excel files',
      'Segment targeting by department, team, or custom criteria',
      'Analytics per department and employee',
      'Export employee data for reporting',
      'Integration with HR systems via API',
    ],
    relatedSolution: '/solutions/hr',
  },
  {
    id: 'analytics-reporting',
    title: 'Analytics & Reporting',
    description: 'Gain insights into your document collection process.',
    details: [
      'Completion rate trends and forecasts',
      'Document type breakdown and distribution',
      'Storage usage analytics across providers',
      'Request timeline tracking and bottlenecks',
      'Exportable reports for compliance and auditing',
      'Real-time dashboards with KPI tracking',
    ],
    relatedSolution: '/solutions/compliance',
  },
];

export default function FeaturesPage() {
  return (
    <>
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Powerful Features for Document Management
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Everything you need to automate document collection, streamline workflows, and ensure compliance.
            </p>
          </div>
        </div>
      </div>
      <FeatureGrid features={features} />
      
      {/* Detailed Feature Sections */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Explore Features in Detail
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Learn how each feature can transform your document collection process.
            </p>
          </div>
          <div className="mx-auto max-w-4xl space-y-16">
            {featureSections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h3>
                  <p className="text-lg text-gray-600 mb-6">{section.description}</p>
                  <ul className="space-y-3 mb-6">
                    {section.details.map((detail, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-3 mt-1">✓</span>
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {section.relatedSolution && (
                    <Link
                      href={section.relatedSolution}
                      className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
                    >
                      See how this helps {section.relatedSolution.includes('hr') ? 'HR teams' : section.relatedSolution.includes('compliance') ? 'compliance' : 'organizations'} →
                    </Link>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
      
      <CTA
        title="Ready to experience these features?"
        subtitle="Start your free trial today and see how Docuflow can transform your document collection process."
        primary={{ text: 'Start Free Trial', href: '/signup' }}
        secondary={{ text: 'Contact Sales', href: '/contact' }}
      />
    </>
  );
}

