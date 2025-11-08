import type { Metadata } from 'next';
import { PricingTable, type PricingTier } from '@/components/site/pricing-table';
import { FAQ } from '@/components/site/faq';
import { CTA } from '@/components/site/cta';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getFAQs } from '@/lib/cms';

export const metadata: Metadata = genMeta({
  title: 'Pricing - Docuflow',
  description: 'Simple, transparent pricing for document collection and management. Choose the plan that fits your organization.',
});

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$199',
    period: '/month',
    description: 'Perfect for small teams getting started with document automation.',
    features: [
      'Up to 100 employees',
      '1,000 documents/month',
      'Email integration (Gmail/Outlook)',
      'Basic routing rules (up to 5 rules)',
      '1 storage integration (Google Drive, OneDrive, or Supabase)',
      'Document validation (file type & size)',
      'Automated document requests',
      'Email templates (up to 10)',
      'Basic analytics dashboard',
      'Email support (48-hour response)',
      '14-day free trial',
    ],
    cta: { text: 'Start Free Trial', href: '/signup' },
  },
  {
    name: 'Professional',
    price: '$399',
    period: '/month',
    description: 'For growing organizations that need advanced features and support.',
    features: [
      'Up to 500 employees',
      '10,000 documents/month',
      'All email integrations (Gmail, Outlook, multiple accounts)',
      'Advanced routing rules (unlimited)',
      'Multiple storage integrations (all providers)',
      'Advanced document validation (custom rules)',
      'Automated document requests with scheduling',
      'Custom email templates (unlimited)',
      'Advanced analytics & reporting',
      'Scheduled sending & recurring requests',
      'Bulk document requests',
      'Priority support (24-hour response)',
      'API access',
      '14-day free trial',
    ],
    cta: { text: 'Start Free Trial', href: '/signup' },
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom requirements and dedicated support.',
    features: [
      'Unlimited employees',
      'Unlimited documents/month',
      'All email integrations (unlimited accounts)',
      'Unlimited routing rules & advanced logic',
      'All storage integrations (unlimited)',
      'Custom document validation rules',
      'Advanced automation workflows',
      'Custom email templates & branding',
      'Enterprise analytics & custom reports',
      'Advanced scheduling & automation',
      'Bulk operations & API access',
      'Dedicated account manager',
      '24/7 priority support (1-hour response)',
      'SLA guarantee (99.9% uptime)',
      'Custom integrations & webhooks',
      'Custom security policies & compliance',
      'On-premise deployment option',
      'Single Sign-On (SSO)',
      'Advanced audit logs & reporting',
    ],
    cta: { text: 'Contact Sales', href: '/contact' },
  },
];

export default async function PricingPage() {
  const faqs = await getFAQs({ category: 'pricing' });

  return (
    <>
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Choose the plan that fits your organization. All plans include a 14-day free trial.
            </p>
          </div>
        </div>
      </div>
      <PricingTable tiers={tiers} />
      {faqs.length > 0 && (
        <div id="faq" className="scroll-mt-24">
          <FAQ
            faqs={faqs}
            title="Pricing FAQ"
            subtitle="Common questions about our pricing and plans"
          />
        </div>
      )}
      <CTA
        title="Not sure which plan is right for you?"
        subtitle="Contact our sales team to discuss your specific needs and find the perfect solution."
        primary={{ text: 'Contact Sales', href: '/contact' }}
        secondary={{ text: 'Start Free Trial', href: '/signup' }}
      />
    </>
  );
}

