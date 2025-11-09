import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'Security & Compliance - Docuflow',
  description: 'Enterprise-grade security and compliance features. SOC 2, GDPR, HIPAA compliant.',
});

const securityFeatures = [
  {
    name: 'Encryption',
    description: 'All data is encrypted at rest and in transit using industry-standard AES-256 encryption.',
  },
  {
    name: 'Access Control',
    description: 'Role-based access control (RBAC) with row-level security policies to ensure users only see what they should.',
  },
  {
    name: 'Audit Logs',
    description: 'Comprehensive audit logs track all actions, changes, and access for compliance and security monitoring.',
  },
  {
    name: 'SOC 2 Type II',
    description: 'Certified for SOC 2 Type II compliance, ensuring the highest standards for security, availability, and confidentiality.',
  },
  {
    name: 'GDPR Compliant',
    description: 'Fully compliant with GDPR requirements, including data portability, right to deletion, and privacy by design.',
  },
  {
    name: 'HIPAA Ready',
    description: 'Built with HIPAA compliance in mind, with features for healthcare organizations handling PHI.',
  },
  {
    name: 'Regular Security Audits',
    description: 'Regular third-party security audits and penetration testing to identify and address vulnerabilities.',
  },
  {
    name: 'Data Residency',
    description: 'Control where your data is stored with options for data residency in multiple regions.',
  },
];

export default function SecurityPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Security & Compliance
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Enterprise-grade security and compliance features to protect your sensitive documents and data.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <span className="text-white text-xl">🔒</span>
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600">
            Have questions about security?{' '}
            <a href="/contact" className="font-semibold text-blue-600 hover:text-blue-500">
              Contact our security team
            </a>
          </p>
        </div>
      </div>

      {/* Compliance Sections */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Compliance & Certifications
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Docuflow meets the highest standards for security and compliance.
            </p>
          </div>
          
          <div className="mx-auto max-w-4xl space-y-12">
            {/* SOC 2 */}
            <section id="soc2" className="scroll-mt-24 bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">SOC 2 Type II Certified</h3>
              <p className="text-gray-600 mb-4">
                Docuflow is certified for SOC 2 Type II compliance, ensuring the highest standards for security, 
                availability, processing integrity, confidentiality, and privacy.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Regular third-party security audits</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Comprehensive access controls and monitoring</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Incident response and business continuity plans</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="mt-6 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
              >
                Request SOC 2 report →
              </Link>
            </section>

            {/* GDPR */}
            <section id="gdpr" className="scroll-mt-24 bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">GDPR Compliant</h3>
              <p className="text-gray-600 mb-4">
                Docuflow is fully compliant with the General Data Protection Regulation (GDPR), 
                ensuring your data is protected according to European Union standards.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Right to access and data portability</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Right to deletion and data erasure</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Privacy by design and default</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Data processing agreements (DPAs) available</span>
                </li>
              </ul>
              <Link
                href="/legal/privacy"
                className="mt-6 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
              >
                Read our Privacy Policy →
              </Link>
            </section>

            {/* HIPAA */}
            <section id="hipaa" className="scroll-mt-24 bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">HIPAA Ready</h3>
              <p className="text-gray-600 mb-4">
                Docuflow is built with HIPAA compliance in mind, with features designed to help 
                healthcare organizations handle protected health information (PHI) securely.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Encryption of PHI at rest and in transit</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Access controls and audit logs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Business Associate Agreements (BAAs) available</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">✓</span>
                  <span>Secure document storage and transmission</span>
                </li>
              </ul>
              <Link
                href="/solutions/healthcare"
                className="mt-6 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
              >
                Learn about our Healthcare solution →
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

