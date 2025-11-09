import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getJobs } from '@/lib/cms';
import { format } from 'date-fns';

export const metadata: Metadata = genMeta({
  title: 'Careers - Docuflow',
  description: 'Join the Docuflow team. We're hiring talented individuals to help us build the future of document management.',
});

export default async function CareersPage() {
  const jobs = await getJobs();

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Join Our Team
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We're building the future of document management. Join us in making document collection
            simple, automated, and secure.
          </p>
        </div>
        {jobs.length > 0 ? (
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <div className="space-y-8">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/careers/${job.slug}`}>
                        <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                          {job.title}
                        </h3>
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        {job.department && <span>{job.department}</span>}
                        {job.location && <span>{job.location}</span>}
                        {job.employment_type && (
                          <span className="capitalize">{job.employment_type.replace('_', ' ')}</span>
                        )}
                      </div>
                      {job.published_at && (
                        <p className="mt-2 text-sm text-gray-500">
                          Posted {format(new Date(job.published_at), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <a
                      href={job.application_url ? job.application_url : `/contact?subject=Job Application: ${encodeURIComponent(job.title)}`}
                      target={job.application_url ? "_blank" : undefined}
                      rel={job.application_url ? "noopener noreferrer" : undefined}
                      className="ml-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      Apply
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-16 max-w-2xl text-center">
            <p className="text-lg text-gray-600">
              We don't have any open positions at the moment, but we're always interested in hearing
              from talented individuals.{' '}
              <a href="/contact" className="font-semibold text-blue-600 hover:text-blue-500">
                Get in touch
              </a>{' '}
              to learn about future opportunities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

