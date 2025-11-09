import Link from 'next/link';

interface CTAProps {
  title: string;
  subtitle: string;
  primary: { text: string; href: string };
  secondary?: { text: string; href: string };
}

export function CTA({ title, subtitle, primary, secondary }: CTAProps) {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 -z-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-10"></div>
      
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
            {subtitle}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href={primary.href}
              className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-blue-600 shadow-lg hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:shadow-xl hover:scale-105"
            >
              {primary.text}
            </Link>
            {secondary && (
              <Link
                href={secondary.href}
                className="text-sm font-semibold leading-6 text-white hover:text-blue-100 transition-colors duration-200"
              >
                {secondary.text} <span aria-hidden="true" className="inline-block transition-transform duration-200 hover:translate-x-1">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

