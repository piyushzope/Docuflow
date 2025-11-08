import Link from 'next/link';

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: { text: string; href: string };
  popular?: boolean;
}

interface PricingTableProps {
  tiers: PricingTier[];
  title?: string;
  subtitle?: string;
}

export function PricingTable({ tiers, title, subtitle }: PricingTableProps) {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="mx-auto max-w-4xl text-center">
            {title && (
              <h2 className="text-base font-semibold leading-7 text-blue-600">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 ${
                tier.popular
                  ? 'bg-gray-900 ring-gray-900 lg:z-10 lg:rounded-3xl'
                  : 'bg-white lg:z-0'
              }`}
            >
              {tier.popular && (
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    className={`text-lg font-semibold leading-8 ${
                      tier.popular ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {tier.name}
                  </h3>
                  <p className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-600">
                    Most popular
                  </p>
                </div>
              )}
              {!tier.popular && (
                <h3 className={`text-lg font-semibold leading-8 text-gray-900`}>{tier.name}</h3>
              )}
              <p
                className={`mt-4 text-sm leading-6 ${
                  tier.popular ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {tier.description}
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    tier.popular ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    className={`text-sm font-semibold leading-6 ${
                      tier.popular ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {tier.period}
                  </span>
                )}
              </p>
              <Link
                href={tier.cta.href}
                className={`mt-6 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.popular
                    ? 'bg-white text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline-white'
                    : 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:outline-blue-600'
                }`}
              >
                {tier.cta.text}
              </Link>
              <ul
                role="list"
                className={`mt-8 space-y-3 text-sm leading-6 ${
                  tier.popular ? 'text-gray-300' : 'text-gray-600'
                } sm:mt-10`}
              >
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex gap-x-3">
                    <span
                      className={`h-6 w-5 shrink-0 ${
                        tier.popular ? 'text-white' : 'text-blue-600'
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

