import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'Privacy Policy - Docuflow',
  description: 'Privacy Policy for Docuflow',
});

export default function PrivacyPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Privacy Policy
        </h1>
        <div className="mt-12 prose prose-lg max-w-none">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
          <div className="mt-8">
            <h2>1. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us, such as when you create an
              account, use our services, or contact us for support.
            </p>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services;</li>
              <li>Process transactions and send related information;</li>
              <li>Send technical notices, updates, and support messages;</li>
              <li>Respond to your comments and questions;</li>
              <li>Monitor and analyze trends and usage.</li>
            </ul>
            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may
              share your information only in the following circumstances:
            </p>
            <ul>
              <li>With your consent;</li>
              <li>To comply with legal obligations;</li>
              <li>To protect our rights and safety;</li>
              <li>With service providers who assist us in operating our platform.</li>
            </ul>
            <h2>4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction.
            </p>
            <h2>5. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any time.
              You may also opt out of certain communications from us.
            </p>
            <h2>6. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="/contact" className="text-blue-600 hover:text-blue-500">
                our contact page
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

