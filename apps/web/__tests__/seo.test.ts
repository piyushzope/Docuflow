import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateMetadata,
  generatePostMetadata,
  generateCaseStudyMetadata,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateChangelogSchema,
  type SEOConfig,
} from '@/lib/seo';
import type { Post, CaseStudy, ChangelogEntry } from '@/types/cms';

// Mock environment variable
const originalEnv = process.env;

describe('SEO Utilities', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: 'https://docuflow.com',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateMetadata', () => {
    it('should generate basic metadata with title and description', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        description: 'Test description',
      };

      const metadata = generateMetadata(config);

      expect(metadata.title).toBe('Test Page | Docuflow');
      expect(metadata.description).toBe('Test description');
      expect(metadata.alternates?.canonical).toBe('https://docuflow.com');
    });

    it('should use default title when not provided', () => {
      const config: SEOConfig = {
        description: 'Test description',
      };

      const metadata = generateMetadata(config);

      expect(metadata.title).toContain('Docuflow');
    });

    it('should include OpenGraph tags', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        description: 'Test description',
        url: '/test-page',
      };

      const metadata = generateMetadata(config);

      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.title).toBe('Test Page | Docuflow');
      expect(metadata.openGraph?.description).toBe('Test description');
      expect(metadata.openGraph?.url).toBe('/test-page');
      expect(metadata.openGraph?.type).toBe('website');
    });

    it('should include Twitter card tags', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        description: 'Test description',
      };

      const metadata = generateMetadata(config);

      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toBe('Test Page | Docuflow');
    });

    it('should set article type with published time', () => {
      const config: SEOConfig = {
        title: 'Test Article',
        type: 'article',
        publishedTime: '2024-01-01T00:00:00Z',
      };

      const metadata = generateMetadata(config);

      expect(metadata.openGraph?.type).toBe('article');
      expect(metadata.openGraph?.publishedTime).toBe('2024-01-01T00:00:00Z');
    });

    it('should respect noindex and nofollow flags', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        noindex: true,
        nofollow: true,
      };

      const metadata = generateMetadata(config);

      expect(metadata.robots?.index).toBe(false);
      expect(metadata.robots?.follow).toBe(false);
      expect(metadata.robots?.googleBot?.index).toBe(false);
      expect(metadata.robots?.googleBot?.follow).toBe(false);
    });

    it('should include custom image', () => {
      const config: SEOConfig = {
        title: 'Test Page',
        image: 'https://example.com/image.jpg',
      };

      const metadata = generateMetadata(config);

      expect(metadata.openGraph?.images?.[0]?.url).toBe('https://example.com/image.jpg');
      expect(metadata.twitter?.images?.[0]).toBe('https://example.com/image.jpg');
    });
  });

  describe('generatePostMetadata', () => {
    it('should generate metadata from post data', () => {
      const post: Post = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
        excerpt: 'Test excerpt',
        seo_title: 'SEO Title',
        seo_description: 'SEO Description',
        cover_image_url: 'https://example.com/image.jpg',
        published_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        author: {
          id: '1',
          name: 'John Doe',
        },
        tags: [
          { id: '1', name: 'Tech' },
          { id: '2', name: 'News' },
        ],
      } as Post;

      const metadata = generatePostMetadata(post);

      expect(metadata.title).toBe('SEO Title | Docuflow');
      expect(metadata.description).toBe('SEO Description');
      expect(metadata.openGraph?.type).toBe('article');
      expect(metadata.openGraph?.publishedTime).toBe('2024-01-01T00:00:00Z');
      expect(metadata.openGraph?.modifiedTime).toBe('2024-01-02T00:00:00Z');
      expect(metadata.openGraph?.authors).toEqual(['John Doe']);
      expect(metadata.openGraph?.tags).toEqual(['Tech', 'News']);
      expect(metadata.alternates?.canonical).toBe('https://docuflow.com/resources/test-post');
    });

    it('should fallback to title when seo_title not provided', () => {
      const post: Post = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
      } as Post;

      const metadata = generatePostMetadata(post);

      expect(metadata.title).toBe('Test Post | Docuflow');
    });

    it('should fallback to excerpt when seo_description not provided', () => {
      const post: Post = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
        excerpt: 'Test excerpt',
      } as Post;

      const metadata = generatePostMetadata(post);

      expect(metadata.description).toBe('Test excerpt');
    });
  });

  describe('generateCaseStudyMetadata', () => {
    it('should generate metadata from case study data', () => {
      const caseStudy: CaseStudy = {
        id: '1',
        title: 'Test Case Study',
        slug: 'test-case-study',
        excerpt: 'Test excerpt',
        cover_image_url: 'https://example.com/image.jpg',
        published_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      } as CaseStudy;

      const metadata = generateCaseStudyMetadata(caseStudy);

      expect(metadata.title).toBe('Test Case Study | Docuflow');
      expect(metadata.openGraph?.type).toBe('article');
      expect(metadata.alternates?.canonical).toBe('https://docuflow.com/customers/test-case-study');
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate valid Organization schema', () => {
      const schema = generateOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('Docuflow');
      expect(schema.url).toBe('https://docuflow.com');
      expect(schema.contactPoint).toBeDefined();
      expect(schema.contactPoint?.['@type']).toBe('ContactPoint');
    });
  });

  describe('generateWebSiteSchema', () => {
    it('should generate valid WebSite schema with search action', () => {
      const schema = generateWebSiteSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Docuflow');
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction?.['@type']).toBe('SearchAction');
      expect(schema.potentialAction?.target?.urlTemplate).toContain('/resources?search=');
    });
  });

  describe('generateArticleSchema', () => {
    it('should generate valid Article schema from post', () => {
      const post: Post = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
        excerpt: 'Test excerpt',
        cover_image_url: 'https://example.com/image.jpg',
        published_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        author: {
          id: '1',
          name: 'John Doe',
          social_links: {
            website: 'https://johndoe.com',
          },
        },
      } as Post;

      const schema = generateArticleSchema(post);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BlogPosting');
      expect(schema.headline).toBe('Test Post');
      expect(schema.description).toBe('Test excerpt');
      expect(schema.image).toBe('https://example.com/image.jpg');
      expect(schema.datePublished).toBe('2024-01-01T00:00:00Z');
      expect(schema.dateModified).toBe('2024-01-02T00:00:00Z');
      expect(schema.author).toBeDefined();
      expect(schema.author?.['@type']).toBe('Person');
      expect(schema.author?.name).toBe('John Doe');
      expect(schema.author?.url).toBe('https://johndoe.com');
      expect(schema.publisher).toBeDefined();
      expect(schema.publisher?.['@type']).toBe('Organization');
    });

    it('should handle post without author', () => {
      const post: Post = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
      } as Post;

      const schema = generateArticleSchema(post);

      expect(schema.author).toBeUndefined();
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate valid BreadcrumbList schema', () => {
      const items = [
        { name: 'Home', url: '/' },
        { name: 'Resources', url: '/resources' },
        { name: 'Test Post' },
      ];

      const schema = generateBreadcrumbSchema(items);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe('Home');
      expect(schema.itemListElement[0].item).toBe('/');
      expect(schema.itemListElement[2].item).toBeUndefined();
    });
  });

  describe('generateChangelogSchema', () => {
    it('should generate valid Article schema from changelog entry', () => {
      const entry: ChangelogEntry = {
        id: '1',
        title: 'Version 1.0.0',
        slug: 'version-1-0-0',
        description: 'Initial release',
        published_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      } as ChangelogEntry;

      const schema = generateChangelogSchema(entry);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Article');
      expect(schema.headline).toBe('Version 1.0.0');
      expect(schema.description).toBe('Initial release');
      expect(schema.datePublished).toBe('2024-01-01T00:00:00Z');
      expect(schema.publisher).toBeDefined();
    });
  });
});

