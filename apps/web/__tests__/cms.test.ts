import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPosts,
  getPostBySlug,
  getRelatedPosts,
  getCaseStudies,
  getCaseStudyBySlug,
  getIntegrations,
  getIntegrationBySlug,
  getChangelogEntries,
  getChangelogEntryBySlug,
  getJobs,
  getJobBySlug,
  getCategories,
  getTags,
  getTestimonials,
  getCustomers,
  getFAQs,
} from '@/lib/cms';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('CMS Fetchers', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  describe('getPosts', () => {
    it('should return empty array on error', async () => {
      mockSupabase.single = undefined;
      mockSupabase.textSearch = vi.fn().mockReturnThis();
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getPosts();
      expect(result).toEqual([]);
    });

    it('should return posts with flattened tags', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Test Post',
          slug: 'test-post',
          tags: [
            { tag: { id: '1', name: 'Tech' } },
            { tag: { id: '2', name: 'News' } },
          ],
        },
      ];

      mockSupabase.order = vi.fn().mockReturnValue({
        data: mockData,
        error: null,
      });

      const result = await getPosts();
      expect(result).toHaveLength(1);
      expect(result[0].tags).toEqual([
        { id: '1', name: 'Tech' },
        { id: '2', name: 'News' },
      ]);
    });

    it('should apply limit option', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      await getPosts({ limit: 10 });
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it('should apply categoryId filter', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      await getPosts({ categoryId: 'cat-1' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });

    it('should apply search filter', async () => {
      mockSupabase.textSearch = vi.fn().mockReturnThis();
      mockSupabase.order = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      await getPosts({ search: 'test query' });
      expect(mockSupabase.textSearch).toHaveBeenCalledWith(
        'search_vector',
        'test query',
        { type: 'websearch', config: 'english' }
      );
    });
  });

  describe('getPostBySlug', () => {
    it('should return null when post not found', async () => {
      mockSupabase.single = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getPostBySlug('non-existent');
      expect(result).toBeNull();
    });

    it('should return post with flattened tags', async () => {
      const mockData = {
        id: '1',
        title: 'Test Post',
        slug: 'test-post',
        tags: [{ tag: { id: '1', name: 'Tech' } }],
      };

      mockSupabase.single = vi.fn().mockReturnValue({
        data: mockData,
        error: null,
      });

      const result = await getPostBySlug('test-post');
      expect(result).not.toBeNull();
      expect(result?.tags).toEqual([{ id: '1', name: 'Tech' }]);
    });
  });

  describe('getRelatedPosts', () => {
    it('should return empty array when post not found', async () => {
      mockSupabase.single = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getRelatedPosts('non-existent');
      expect(result).toEqual([]);
    });

    it('should return related posts by category', async () => {
      // First call for getPostBySlug
      mockSupabase.single = vi.fn()
        .mockReturnValueOnce({
          data: {
            id: '1',
            category_id: 'cat-1',
            slug: 'test-post',
          },
          error: null,
        })
        .mockReturnValueOnce({
          data: [
            { id: '2', slug: 'related-1', title: 'Related Post' },
          ],
          error: null,
        });

      const result = await getRelatedPosts('test-post');
      expect(result).toHaveLength(1);
      expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });
  });

  describe('getCaseStudies', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getCaseStudies();
      expect(result).toEqual([]);
    });

    it('should return case studies with customer data', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Test Case Study',
          customer: { id: '1', name: 'Test Company' },
        },
      ];

      mockSupabase.order = vi.fn().mockReturnValue({
        data: mockData,
        error: null,
      });

      const result = await getCaseStudies();
      expect(result).toHaveLength(1);
      expect(result[0].customer).toEqual({ id: '1', name: 'Test Company' });
    });

    it('should apply limit option', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      await getCaseStudies({ limit: 5 });
      expect(mockSupabase.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getCaseStudyBySlug', () => {
    it('should return null when case study not found', async () => {
      mockSupabase.single = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getCaseStudyBySlug('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getIntegrations', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getIntegrations();
      expect(result).toEqual([]);
    });

    it('should return integrations ordered by display_order', async () => {
      const mockData = [
        { id: '1', name: 'Integration 1', display_order: 1 },
        { id: '2', name: 'Integration 2', display_order: 2 },
      ];

      mockSupabase.order = vi.fn().mockReturnValue({
        data: mockData,
        error: null,
      });

      const result = await getIntegrations();
      expect(result).toHaveLength(2);
    });
  });

  describe('getIntegrationBySlug', () => {
    it('should return null when integration not found', async () => {
      mockSupabase.single = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getIntegrationBySlug('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getChangelogEntries', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getChangelogEntries();
      expect(result).toEqual([]);
    });

    it('should apply limit option', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      await getChangelogEntries({ limit: 20 });
      expect(mockSupabase.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getChangelogEntryBySlug', () => {
    it('should return null when entry not found', async () => {
      mockSupabase.single = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getChangelogEntryBySlug('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getJobs', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getJobs();
      expect(result).toEqual([]);
    });
  });

  describe('getJobBySlug', () => {
    it('should return null when job not found', async () => {
      mockSupabase.single = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getJobBySlug('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getCategories', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getCategories();
      expect(result).toEqual([]);
    });
  });

  describe('getTags', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getTags();
      expect(result).toEqual([]);
    });
  });

  describe('getTestimonials', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getTestimonials();
      expect(result).toEqual([]);
    });

    it('should filter by featured when option provided', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      await getTestimonials({ featured: true });
      expect(mockSupabase.eq).toHaveBeenCalledWith('featured', true);
    });
  });

  describe('getCustomers', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getCustomers();
      expect(result).toEqual([]);
    });
  });

  describe('getFAQs', () => {
    it('should return empty array on error', async () => {
      mockSupabase.order = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getFAQs();
      expect(result).toEqual([]);
    });
  });
});

