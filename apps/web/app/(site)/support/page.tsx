import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'Support - Docuflow',
  description: 'Get help with Docuflow. Documentation, guides, and support resources.',
});

const supportResources = [
  {
    name: 'Documentation',
    description: 'Comprehensive guides and API documentation',
    href: '/resources',
    icon: '📚',
  },
  {
    name: 'FAQ',
    description: 'Answers to frequently asked questions',
    href: '/faq',
    icon: '❓',
  },
  {
    name: 'Contact Support',
    description: 'Get in touch with our support team',
    href: '/contact',
    icon: '💬',
  },
  {
    name: 'Status Page',
    description: 'Check system status and uptime',
    href: '/status',
    icon: '📊',
  },
  {
    name: 'Changelog',
    description: 'See what\'s new and what\'s changed',
    href: '/changelog',
    icon: '📝',
  },
  {
    name: 'Security',
    description: 'Learn about our security practices',
    href: '/security',
    icon: '🔒',
  },
];

export default function SupportPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Support & Resources
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Get help, find answers, and learn how to get the most out of Docuflow.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {supportResources.map((resource) => (
            <Link
              key={resource.name}
              href={resource.href}
              className="group rounded-2xl bg-gray-50 p-8 hover:bg-gray-100 transition-colors"
            >
              <div className="text-4xl mb-4">{resource.icon}</div>
              <h3 className="text-lg font-semibold leading-8 text-gray-900 group-hover:text-blue-600">
                {resource.name}
              </h3>
              <p className="mt-4 text-base leading-7 text-gray-600">{resource.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Immediate Help?</h2>
          <p className="text-lg text-gray-600 mb-6">
            Our support team is here to help you succeed.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

