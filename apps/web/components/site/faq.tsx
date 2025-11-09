'use client';

import { useState } from 'react';
import type { FAQ } from '@/types/cms';

interface FAQProps {
  faqs: FAQ[];
  title?: string;
  subtitle?: string;
}

export function FAQ({ faqs, title, subtitle }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="mx-auto max-w-4xl divide-y divide-gray-900/10">
            {title && (
              <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-6 text-lg leading-8 text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
        <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="pt-6">
              <dt>
                <button
                  type="button"
                  className="flex w-full items-start justify-between text-left text-gray-900"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  aria-expanded={openIndex === index}
                >
                  <span className="text-base font-semibold leading-7">{faq.question}</span>
                  <span className="ml-6 flex h-7 items-center">
                    <svg
                      className={`h-6 w-6 transform transition-transform ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </button>
              </dt>
              {openIndex === index && (
                <dd className="mt-2 pr-12">
                  <p className="text-base leading-7 text-gray-600">{faq.answer}</p>
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

