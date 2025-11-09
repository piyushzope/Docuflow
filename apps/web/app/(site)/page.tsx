import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Hero } from '@/components/site/hero';
import { FeatureGrid, type Feature } from '@/components/site/feature-grid';
import { Testimonials } from '@/components/site/testimonials';
import { LogoCloud, type Logo } from '@/components/site/logo-cloud';
import { CTA } from '@/components/site/cta';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getTestimonials } from '@/lib/cms';
import { getCustomers } from '@/lib/cms';

export const metadata: Metadata = genMeta({
  title: 'Docuflow - Automated Document Collection Platform',
  description: 'Automated document collection and organization platform for institutions and organizations.',
});

const features: Feature[] = [
  {
    name: 'Automated Collection',
    description: 'Send document requests automatically and track responses in real-time. Reduce manual follow-ups by up to 80%.',
    icon: '📧',
  },
  {
    name: 'Smart Routing',
    description: 'Intelligently route documents to the right storage location based on rules you define. Support for Google Drive, OneDrive, and more.',
    icon: '🗂️',
  },
  {
    name: 'Email Integration',
    description: 'Connect Gmail and Outlook accounts to automatically process incoming documents and attachments.',
    icon: '✉️',
  },
  {
    name: 'Document Validation',
    description: 'Automatically validate document types, formats, and completeness before storing. Ensure compliance with your requirements.',
    icon: '✅',
  },
  {
    name: 'Employee Directory',
    description: 'Manage your employee database and send bulk document requests. Import from CSV or Excel files.',
    icon: '👥',
  },
  {
    name: 'Analytics & Reporting',
    description: 'Track completion rates, document types, and storage usage with comprehensive analytics dashboards.',
    icon: '📊',
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  const [testimonials, customers] = await Promise.all([
    getTestimonials({ featured: true, limit: 6 }),
    getCustomers({ featured: true }),
  ]);

  const logos: Logo[] = customers.slice(0, 10).map(customer => ({
    name: customer.name,
    logo: customer.logo_url || '/placeholder-logo.svg',
    url: customer.website_url || undefined,
  }));

  return (
    <>
      <Hero
        title="Automated Document Collection Made Simple"
        subtitle="Streamline your document collection process with intelligent automation, smart routing, and seamless integrations. Save time, reduce errors, and ensure compliance."
        ctaPrimary={{ text: 'Get Started Free', href: '/signup' }}
        ctaSecondary={{ text: 'See How It Works', href: '/how-it-works' }}
      />
      <LogoCloud logos={logos} title="Trusted by leading organizations" />
      <FeatureGrid
        features={features}
        title="Everything you need"
        subtitle="Powerful features for document management"
      />
      {testimonials.length > 0 && (
        <Testimonials
          testimonials={testimonials}
          title="Testimonials"
          subtitle="What our customers are saying"
        />
      )}
      <CTA
        title="Ready to get started?"
        subtitle="Join organizations that trust Docuflow for their document collection needs."
        primary={{ text: 'Start Free Trial', href: '/signup' }}
        secondary={{ text: 'Contact Sales', href: '/contact' }}
      />
    </>
  );
}

