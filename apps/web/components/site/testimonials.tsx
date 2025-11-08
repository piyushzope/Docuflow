import Image from 'next/image';
import type { Testimonial } from '@/types/cms';

interface TestimonialsProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
}

export function Testimonials({ testimonials, title, subtitle }: TestimonialsProps) {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="mx-auto max-w-xl text-center">
            {title && (
              <h2 className="text-base font-semibold uppercase leading-8 tracking-wide text-blue-600">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="-mt-8 sm:-mx-4 sm:columns-1 sm:text-[0] lg:columns-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="pt-8 sm:inline-block sm:w-full sm:px-4"
              >
                <figure className="group rounded-2xl bg-white p-8 text-sm leading-6 shadow-md ring-1 ring-gray-900/5 transition-all duration-300 hover:shadow-xl hover:ring-blue-500/20">
                  <div className="flex items-center gap-x-4">
                    {testimonial.author_avatar_url && (
                      <Image
                        className="h-12 w-12 rounded-full bg-gray-50 ring-2 ring-gray-100"
                        src={testimonial.author_avatar_url}
                        alt={testimonial.author_name}
                        width={48}
                        height={48}
                      />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.author_name}</div>
                      {testimonial.author_title && (
                        <div className="text-sm text-gray-600">{testimonial.author_title}</div>
                      )}
                      {testimonial.customer && (
                        <div className="text-xs text-gray-500">{testimonial.customer.name}</div>
                      )}
                    </div>
                  </div>
                  {testimonial.rating && (
                    <div className="mt-4 flex items-center">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-lg">★</span>
                      ))}
                    </div>
                  )}
                  <blockquote className="mt-6 text-gray-900">
                    <p className="text-base leading-7">"{testimonial.content}"</p>
                  </blockquote>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

