'use client';

import { useState, useMemo } from 'react';
import { CaseStudyCard } from '@/components/site/case-study-card';
import { LogoCloud, type Logo } from '@/components/site/logo-cloud';
import type { CaseStudy, Customer } from '@/types/cms';

interface CustomersPageClientProps {
  caseStudies: CaseStudy[];
  customers: Customer[];
}

export function CustomersPageClient({ caseStudies, customers }: CustomersPageClientProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

  const industries = useMemo(() => {
    const industrySet = new Set<string>();
    customers.forEach(c => {
      if (c.industry) industrySet.add(c.industry);
    });
    return Array.from(industrySet).sort();
  }, [customers]);

  const filteredCaseStudies = useMemo(() => {
    if (selectedIndustry === 'all') return caseStudies;
    return caseStudies.filter(cs => cs.customer?.industry === selectedIndustry);
  }, [caseStudies, selectedIndustry]);

  const logos: Logo[] = customers.map(customer => ({
    name: customer.name,
    logo: customer.logo_url || '/placeholder-logo.svg',
    url: customer.website_url || undefined,
  }));

  // Calculate metrics from case studies
  const metrics = useMemo(() => {
    const metricsData: Record<string, number> = {};
    caseStudies.forEach(cs => {
      if (cs.metrics) {
        Object.entries(cs.metrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            metricsData[key] = (metricsData[key] || 0) + value;
          }
        });
      }
    });
    return metricsData;
  }, [caseStudies]);

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Trusted by Leading Organizations
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            See how companies like yours use Docuflow to transform their document collection process.
          </p>
        </div>

        {/* Metrics Block */}
        {Object.keys(metrics).length > 0 && (
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(metrics).slice(0, 4).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{value.toLocaleString()}</div>
                <div className="mt-2 text-sm font-medium text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {logos.length > 0 && (
          <div className="mt-16">
            <LogoCloud logos={logos} />
          </div>
        )}

        {caseStudies.length > 0 && (
          <div className="mt-24">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-4">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Case Studies
              </h2>
              
              {/* Filters */}
              {industries.length > 0 && (
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="rounded-md border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Industries</option>
                  {industries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              )}
            </div>
            
            {filteredCaseStudies.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCaseStudies.map((caseStudy) => (
                  <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No case studies found for the selected filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

