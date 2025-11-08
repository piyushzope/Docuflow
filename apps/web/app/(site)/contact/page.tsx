import type { Metadata } from 'next';
import { Suspense } from 'react';
import { generateMetadata as genMeta } from '@/lib/seo';
import { ContactForm } from '@/components/site/contact-form';

export const metadata: Metadata = genMeta({
  title: 'Contact Us - Docuflow',
  description: 'Get in touch with our team. We\'re here to help with questions, support, or sales inquiries.',
});

export default function ContactPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Get in Touch
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Have a question? Want to learn more? We'd love to hear from you.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <Suspense fallback={<div>Loading form...</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

