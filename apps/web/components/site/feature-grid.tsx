import Image from 'next/image';

export interface Feature {
  name: string;
  description: string;
  icon?: string;
  image?: { src: string; alt: string };
}

interface FeatureGridProps {
  features: Feature[];
  title?: string;
  subtitle?: string;
}

export function FeatureGrid({ features, title, subtitle }: FeatureGridProps) {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="mx-auto max-w-2xl lg:text-center">
            {title && (
              <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-wide">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature, index) => (
              <div key={index} className="relative pl-16 group">
                {feature.icon && (
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50 group-hover:shadow-xl group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-110">
                      <span className="text-2xl">{feature.icon}</span>
                    </div>
                    {feature.name}
                  </dt>
                )}
                {feature.image && (
                  <div className="mb-4">
                    <Image
                      src={feature.image.src}
                      alt={feature.image.alt}
                      width={400}
                      height={300}
                      className="rounded-lg"
                    />
                  </div>
                )}
                {!feature.icon && (
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    {feature.name}
                  </dt>
                )}
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

