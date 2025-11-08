import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'Solutions - Docuflow',
  description: 'Industry-specific solutions for document collection and management.',
});

const solutions = [
  {
    name: 'HR & Employee Onboarding',
    description: 'Streamline employee onboarding with automated document collection for I-9s, W-4s, and other required forms.',
    href: '/solutions/hr',
  },
  {
    name: 'Compliance & Auditing',
    description: 'Ensure compliance with automated document collection, validation, and audit trails for regulatory requirements.',
    href: '/solutions/compliance',
  },
  {
    name: 'Healthcare & Medical Records',
    description: 'Securely collect and manage patient documents, medical records, and insurance forms with HIPAA compliance.',
    href: '/solutions/healthcare',
  },
  {
    name: 'Education & Student Records',
    description: 'Manage student documents, transcripts, and enrollment forms efficiently for educational institutions.',
    href: '/solutions/education',
  },
  {
    name: 'Financial Services',
    description: 'Collect financial documents, tax forms, and compliance paperwork with bank-level security and encryption.',
    href: '/solutions/financial',
  },
  {
    name: 'Real Estate & Property Management',
    description: 'Automate collection of lease documents, applications, and property-related paperwork.',
    href: '/solutions/real-estate',
  },
];

export default function SolutionsPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Solutions for Every Industry
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Discover how Docuflow can solve your specific document collection challenges.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {solutions.map((solution) => (
            <Link
              key={solution.name}
              href={solution.href}
              className="group rounded-2xl bg-gray-50 p-8 hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-lg font-semibold leading-8 text-gray-900 group-hover:text-blue-600">
                {solution.name}
              </h3>
              <p className="mt-4 text-base leading-7 text-gray-600">{solution.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

