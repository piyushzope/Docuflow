import Link from 'next/link';
import Image from 'next/image';
import type { CaseStudy } from '@/types/cms';

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  return (
    <Link
      href={`/customers/${caseStudy.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      {caseStudy.cover_image_url && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100">
          <Image
            src={caseStudy.cover_image_url}
            alt={caseStudy.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            width={800}
            height={450}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between bg-white p-6">
        <div className="flex-1">
          {caseStudy.customer && (
            <p className="text-sm font-medium text-blue-600">{caseStudy.customer.name}</p>
          )}
          <h3 className="mt-2 text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {caseStudy.title}
          </h3>
          {caseStudy.excerpt && (
            <p className="mt-3 text-base text-gray-500 line-clamp-3">{caseStudy.excerpt}</p>
          )}
        </div>
        <div className="mt-6 flex items-center">
          <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
            Read case study
            <span aria-hidden="true" className="ml-2">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

