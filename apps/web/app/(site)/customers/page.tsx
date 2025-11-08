import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getCaseStudies, getCustomers } from '@/lib/cms';
import { CaseStudyCard } from '@/components/site/case-study-card';
import { LogoCloud, type Logo } from '@/components/site/logo-cloud';
import { CustomersPageClient } from '@/components/site/customers-page-client';

export const metadata: Metadata = genMeta({
  title: 'Customers - Docuflow',
  description: 'See how organizations use Docuflow to streamline document collection and management.',
});

export default async function CustomersPage() {
  const [caseStudies, customers] = await Promise.all([
    getCaseStudies(),
    getCustomers(),
  ]);

  return <CustomersPageClient caseStudies={caseStudies} customers={customers} />;
}
