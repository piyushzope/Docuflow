import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { generateMetadata as genMeta, generateBreadcrumbSchema } from '@/lib/seo';
import { CTA } from '@/components/site/cta';
import Script from 'next/script';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);

  if (!solution) {
    return {
      title: 'Solution Not Found',
    };
  }

  return genMeta({
    title: `${solution.title} - Solutions - Docuflow`,
    description: solution.description,
    url: `/solutions/${slug}`,
  });
}

interface Solution {
  slug: string;
  title: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  useCases: string[];
  features: Array<{ title: string; description: string }>;
  benefits: string[];
  ctaTitle: string;
  ctaSubtitle: string;
}

function getSolutionBySlug(slug: string): Solution | null {
  const solutions: Record<string, Solution> = {
    hr: {
      slug: 'hr',
      title: 'HR & Employee Onboarding',
      description: 'Streamline employee onboarding with automated document collection for I-9s, W-4s, and other required forms.',
      heroTitle: 'Simplify Employee Onboarding',
      heroSubtitle: 'Automate document collection for new hires, reducing administrative burden and ensuring compliance.',
      useCases: [
        'New employee onboarding document collection',
        'I-9 and W-4 form management',
        'Background check document verification',
        'Certification and license tracking',
        'Annual compliance document renewal',
        'Offboarding document collection',
      ],
      features: [
        {
          title: 'Bulk Employee Import',
          description: 'Import employee data from your HRIS or CSV files to quickly set up document requests for entire departments or the whole organization.',
        },
        {
          title: 'Automated Reminders',
          description: 'Set up automated follow-up emails for incomplete submissions, reducing manual follow-up work by up to 80%.',
        },
        {
          title: 'Compliance Tracking',
          description: 'Track completion status for required documents and generate reports for audits and compliance reviews.',
        },
        {
          title: 'Template Library',
          description: 'Use pre-built templates for common HR documents like I-9s, W-4s, and direct deposit forms.',
        },
      ],
      benefits: [
        'Reduce onboarding time by 60%',
        'Ensure 100% compliance with required documents',
        'Eliminate manual follow-ups and reminders',
        'Centralize all employee documents in one place',
        'Generate compliance reports on demand',
      ],
      ctaTitle: 'Ready to streamline your HR onboarding?',
      ctaSubtitle: 'See how Docuflow can transform your employee onboarding process.',
    },
    compliance: {
      slug: 'compliance',
      title: 'Compliance & Auditing',
      description: 'Ensure compliance with automated document collection, validation, and audit trails for regulatory requirements.',
      heroTitle: 'Stay Compliant with Ease',
      heroSubtitle: 'Automate document collection and validation to meet regulatory requirements and simplify audits.',
      useCases: [
        'Regulatory compliance document collection',
        'Audit trail generation and reporting',
        'Document validation and completeness checks',
        'Multi-year document retention',
        'Compliance reporting and dashboards',
        'Automated compliance reminders',
      ],
      features: [
        {
          title: 'Document Validation',
          description: 'Automatically validate document types, formats, and completeness before storage to ensure compliance.',
        },
        {
          title: 'Audit Logs',
          description: 'Comprehensive audit logs track all document actions, changes, and access for compliance and security monitoring.',
        },
        {
          title: 'Compliance Reporting',
          description: 'Generate detailed reports for compliance reviews, audits, and regulatory submissions.',
        },
        {
          title: 'Smart Routing',
          description: 'Automatically route documents to compliant storage locations based on retention and security requirements.',
        },
      ],
      benefits: [
        'Reduce compliance risk with automated validation',
        'Generate audit reports in minutes, not days',
        'Maintain complete audit trails automatically',
        'Ensure document retention compliance',
        'Simplify regulatory submissions',
      ],
      ctaTitle: 'Need help with compliance?',
      ctaSubtitle: 'Learn how Docuflow can help your organization meet regulatory requirements.',
    },
    healthcare: {
      slug: 'healthcare',
      title: 'Healthcare & Medical Records',
      description: 'Securely collect and manage patient documents, medical records, and insurance forms with HIPAA compliance.',
      heroTitle: 'HIPAA-Compliant Document Management',
      heroSubtitle: 'Securely collect and manage patient documents while maintaining HIPAA compliance and patient privacy.',
      useCases: [
        'Patient intake document collection',
        'Insurance form management',
        'Medical record organization',
        'HIPAA-compliant document storage',
        'Patient consent form collection',
        'Provider credentialing documents',
      ],
      features: [
        {
          title: 'HIPAA Compliance',
          description: 'Built with HIPAA compliance in mind, with encryption, access controls, and audit logs for protected health information (PHI).',
        },
        {
          title: 'Secure Storage',
          description: 'Documents are encrypted at rest and in transit, with role-based access controls to protect patient privacy.',
        },
        {
          title: 'Automated Validation',
          description: 'Validate insurance forms, medical records, and other documents before storage to ensure completeness.',
        },
        {
          title: 'Patient Portal Integration',
          description: 'Integrate with patient portals to streamline document collection and reduce administrative burden.',
        },
      ],
      benefits: [
        'Maintain HIPAA compliance automatically',
        'Reduce patient intake time by 50%',
        'Centralize patient documents securely',
        'Simplify insurance form management',
        'Improve patient satisfaction',
      ],
      ctaTitle: 'Ready to improve patient document management?',
      ctaSubtitle: 'Discover how Docuflow can help your healthcare organization.',
    },
    education: {
      slug: 'education',
      title: 'Education & Student Records',
      description: 'Manage student documents, transcripts, and enrollment forms efficiently for educational institutions.',
      heroTitle: 'Streamline Student Document Management',
      heroSubtitle: 'Automate collection of student documents, transcripts, and enrollment forms to reduce administrative overhead.',
      useCases: [
        'Student enrollment document collection',
        'Transcript and record management',
        'Financial aid document processing',
        'Student compliance tracking',
        'Graduation requirement verification',
        'Transfer student document collection',
      ],
      features: [
        {
          title: 'Student Directory',
          description: 'Manage student information and send bulk document requests to classes, programs, or the entire student body.',
        },
        {
          title: 'Document Tracking',
          description: 'Track completion status for required documents and send automated reminders for missing items.',
        },
        {
          title: 'Compliance Management',
          description: 'Ensure all required student documents are collected and maintained for accreditation and compliance.',
        },
        {
          title: 'Integration Ready',
          description: 'Integrate with student information systems (SIS) to sync student data and streamline workflows.',
        },
      ],
      benefits: [
        'Reduce enrollment processing time by 70%',
        'Ensure 100% document completion',
        'Simplify compliance and accreditation',
        'Improve student experience',
        'Centralize student records',
      ],
      ctaTitle: 'Want to improve student document management?',
      ctaSubtitle: 'See how Docuflow can help your educational institution.',
    },
    financial: {
      slug: 'financial',
      title: 'Financial Services',
      description: 'Collect financial documents, tax forms, and compliance paperwork with bank-level security and encryption.',
      heroTitle: 'Secure Financial Document Management',
      heroSubtitle: 'Streamline collection of financial documents, tax forms, and compliance paperwork with enterprise-grade security.',
      useCases: [
        'Client onboarding document collection',
        'Tax form management and processing',
        'KYC/AML compliance documentation',
        'Financial statement collection',
        'Regulatory compliance reporting',
        'Account opening document processing',
      ],
      features: [
        {
          title: 'Bank-Level Security',
          description: 'Enterprise-grade encryption and security controls to protect sensitive financial information.',
        },
        {
          title: 'Compliance Automation',
          description: 'Automate collection and validation of required compliance documents for KYC, AML, and regulatory requirements.',
        },
        {
          title: 'Audit Trail',
          description: 'Complete audit logs for all document actions to meet financial services regulatory requirements.',
        },
        {
          title: 'Secure Storage',
          description: 'Store documents in compliant storage with encryption at rest and in transit.',
        },
      ],
      benefits: [
        'Reduce client onboarding time by 65%',
        'Ensure 100% compliance with regulatory requirements',
        'Maintain complete audit trails automatically',
        'Protect sensitive financial data with encryption',
        'Simplify regulatory reporting and submissions',
      ],
      ctaTitle: 'Ready to streamline financial document management?',
      ctaSubtitle: 'Discover how Docuflow can help your financial services organization.',
    },
    'real-estate': {
      slug: 'real-estate',
      title: 'Real Estate & Property Management',
      description: 'Automate collection of lease documents, applications, and property-related paperwork.',
      heroTitle: 'Streamline Property Document Management',
      heroSubtitle: 'Automate collection of lease documents, rental applications, and property-related paperwork to reduce administrative overhead.',
      useCases: [
        'Rental application document collection',
        'Lease agreement management',
        'Tenant onboarding paperwork',
        'Property maintenance documentation',
        'Compliance document tracking',
        'Property sale document processing',
      ],
      features: [
        {
          title: 'Application Processing',
          description: 'Automate collection of rental applications, credit checks, and reference documents from prospective tenants.',
        },
        {
          title: 'Lease Management',
          description: 'Organize and track lease agreements, renewals, and related documents in one centralized location.',
        },
        {
          title: 'Tenant Onboarding',
          description: 'Streamline tenant onboarding with automated document collection and validation.',
        },
        {
          title: 'Compliance Tracking',
          description: 'Track compliance documents and generate reports for property inspections and audits.',
        },
      ],
      benefits: [
        'Reduce application processing time by 70%',
        'Ensure complete tenant documentation',
        'Simplify lease agreement management',
        'Improve tenant satisfaction',
        'Centralize all property documents',
      ],
      ctaTitle: 'Want to improve property document management?',
      ctaSubtitle: 'See how Docuflow can help your real estate or property management business.',
    },
  };

  return solutions[slug] || null;
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);

  if (!solution) {
    notFound();
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: solution.title },
  ]);

  return (
    <>
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {solution.heroTitle}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {solution.heroSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">
                  Use Cases
                </h2>
                <ul className="space-y-4">
                  {solution.useCases.map((useCase, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-3 mt-1">✓</span>
                      <span className="text-gray-700">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">
                  Key Benefits
                </h2>
                <ul className="space-y-4">
                  {solution.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-3 mt-1">→</span>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Key Features
            </h2>
          </div>
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {solution.features.map((feature, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <Link
              href="/features"
              className="text-sm font-semibold text-blue-600 hover:text-blue-500"
            >
              ← Back to all features
            </Link>
          </div>
        </div>
      </div>

      <CTA
        title={solution.ctaTitle}
        subtitle={solution.ctaSubtitle}
        primary={{ text: 'Start Free Trial', href: '/signup' }}
        secondary={{ text: 'Contact Sales', href: '/contact' }}
      />

      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
    </>
  );
}

