// SEO Utilities for Marketing Site
// Generates metadata, OpenGraph, Twitter cards, and JSON-LD structured data

import type { Metadata } from 'next';
import type { Post, CaseStudy, ChangelogEntry } from '@/types/cms';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://docuflow.com';
const SITE_NAME = 'Docuflow';
const DEFAULT_DESCRIPTION = 'Automated document collection and organization platform for institutions and organizations.';

export interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  noindex?: boolean;
  nofollow?: boolean;
}

export function generateMetadata(config: SEOConfig): Metadata {
  const title = config.title
    ? `${config.title} | ${SITE_NAME}`
    : `${SITE_NAME} - ${DEFAULT_DESCRIPTION}`;
  const description = config.description || DEFAULT_DESCRIPTION;
  const url = config.url || SITE_URL;
  const image = config.image || `${SITE_URL}/og-image.jpg`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: config.type || 'website',
      url,
      title,
      description,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(config.publishedTime && { publishedTime: config.publishedTime }),
      ...(config.modifiedTime && { modifiedTime: config.modifiedTime }),
      ...(config.authors && { authors: config.authors }),
      ...(config.tags && { tags: config.tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: !config.noindex,
      follow: !config.nofollow,
      googleBot: {
        index: !config.noindex,
        follow: !config.nofollow,
      },
    },
  };
}

export function generatePostMetadata(post: Post): Metadata {
  return generateMetadata({
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/resources/${post.slug}`,
    image: post.cover_image_url || undefined,
    type: 'article',
    publishedTime: post.published_at || undefined,
    modifiedTime: post.updated_at,
    authors: post.author ? [post.author.name] : undefined,
    tags: post.tags?.map(t => t.name),
  });
}

export function generateCaseStudyMetadata(caseStudy: CaseStudy): Metadata {
  return generateMetadata({
    title: caseStudy.seo_title || caseStudy.title,
    description: caseStudy.seo_description || caseStudy.excerpt || DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/customers/${caseStudy.slug}`,
    image: caseStudy.cover_image_url || undefined,
    type: 'article',
    publishedTime: caseStudy.published_at || undefined,
    modifiedTime: caseStudy.updated_at,
  });
}

// JSON-LD Structured Data
export interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: {
    '@type': 'ContactPoint';
    contactType: string;
    email?: string;
    telephone?: string;
  };
}

export function generateOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      // Add social media links here
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@docuflow.com',
    },
  };
}

export interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: {
      '@type': 'EntryPoint';
      urlTemplate: string;
    };
    'query-input': string;
  };
}

export function generateWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/resources?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article' | 'BlogPosting';
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: {
    '@type': 'Person';
    name: string;
    url?: string;
  };
  publisher?: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
}

export function generateArticleSchema(post: Post): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.name,
          url: post.author.social_links?.website || undefined,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };
}

export interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url?: string }>): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url || undefined,
    })),
  };
}

export function generateChangelogSchema(entry: ChangelogEntry): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.title,
    description: entry.description || undefined,
    datePublished: entry.published_at || undefined,
    dateModified: entry.updated_at,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };
}

