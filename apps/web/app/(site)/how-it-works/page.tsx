import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'How It Works - Docuflow',
  description: 'Learn how Docuflow automates document collection and management in three simple steps.',
});

const steps = [
  {
    number: '1',
    title: 'Connect Your Accounts',
    description: 'Connect your email accounts (Gmail, Outlook) and storage services (Google Drive, OneDrive, etc.) to get started.',
  },
  {
    number: '2',
    title: 'Send Document Requests',
    description: 'Create and send document requests to individuals or groups. Set up rules for automatic routing and validation.',
  },
  {
    number: '3',
    title: 'Automate & Track',
    description: 'Documents are automatically collected, validated, and routed to the right location. Track progress in real-time.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            How It Works
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Get started with Docuflow in three simple steps. No technical expertise required.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {steps.map((step) => (
              <div key={step.number} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <span className="text-white text-xl font-bold">{step.number}</span>
                  </div>
                  {step.title}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{step.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-16 text-center">
          <a
            href="/signup"
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Get Started Free
          </a>
        </div>
      </div>
    </div>
  );
}

