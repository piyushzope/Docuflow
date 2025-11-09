import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getFAQs } from '@/lib/cms';
import { FAQ } from '@/components/site/faq';

export const metadata: Metadata = genMeta({
  title: 'FAQ - Docuflow',
  description: 'Frequently asked questions about Docuflow, pricing, features, and more.',
});

export default async function FAQPage() {
  const faqs = await getFAQs();

  // Group FAQs by category
  const faqsByCategory = faqs.reduce((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Find answers to common questions about Docuflow.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          {Object.entries(faqsByCategory).map(([category, categoryFaqs]) => (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{category}</h2>
              <FAQ faqs={categoryFaqs} />
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600">
            Still have questions?{' '}
            <a href="/contact" className="font-semibold text-blue-600 hover:text-blue-500">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

