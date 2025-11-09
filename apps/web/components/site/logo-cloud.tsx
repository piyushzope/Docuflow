import Image from 'next/image';

export interface Logo {
  name: string;
  logo: string;
  url?: string;
}

interface LogoCloudProps {
  logos: Logo[];
  title?: string;
}

export function LogoCloud({ logos, title }: LogoCloudProps) {
  if (logos.length === 0) return null;

  return (
    <div className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {title && (
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        )}
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          {logos.map((logo, index) => (
            <div key={index} className="col-span-2 max-h-12 w-full object-contain lg:col-span-1 flex items-center justify-center">
              {logo.url ? (
                <a 
                  href={logo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Image
                    className="max-h-12 w-full object-contain opacity-50 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-110"
                    src={logo.logo}
                    alt={logo.name}
                    width={120}
                    height={48}
                  />
                </a>
              ) : (
                <Image
                  className="max-h-12 w-full object-contain opacity-50 grayscale"
                  src={logo.logo}
                  alt={logo.name}
                  width={120}
                  height={48}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

