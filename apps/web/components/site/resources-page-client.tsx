'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import type { Post, Category, Tag } from '@/types/cms';

interface ResourcesPageClientProps {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
}

export function ResourcesPageClient({ posts, categories, tags }: ResourcesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category?.slug === selectedCategory);
    }

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(post => 
        post.tags?.some(tag => tag.slug === selectedTag)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [posts, selectedCategory, selectedTag, searchQuery]);

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Resources
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Learn best practices, tips, and insights for document collection and management.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mt-12 space-y-4">
          {/* Search Input */}
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Category and Tag Filters */}
          <div className="flex flex-wrap gap-4 justify-center">
            <div>
              <label className="sr-only">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="sr-only">Tag</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="rounded-md border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredPosts.length > 0 ? (
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <article key={post.id} className="flex flex-col">
                {post.cover_image_url && (
                  <Link href={`/resources/${post.slug}`} className="mb-4">
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      width={400}
                      height={225}
                      className="rounded-lg"
                    />
                  </Link>
                )}
                <div className="flex items-center gap-x-4 text-xs">
                  {post.published_at && (
                    <time dateTime={post.published_at} className="text-gray-500">
                      {format(new Date(post.published_at), 'MMMM d, yyyy')}
                    </time>
                  )}
                  {post.category && (
                    <Link
                      href={`/resources?category=${post.category.slug}`}
                      className="relative z-10 rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-200"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedCategory(post.category!.slug);
                      }}
                    >
                      {post.category.name}
                    </Link>
                  )}
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                    <Link href={`/resources/${post.slug}`}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h3>
                  {post.excerpt && (
                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">{post.excerpt}</p>
                  )}
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTag(tag.slug)}
                        className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600 hover:bg-gray-200"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                {post.author && (
                  <div className="relative mt-8 flex items-center gap-x-4">
                    <div className="text-sm leading-6">
                      <p className="font-semibold text-gray-900">
                        <span>{post.author.name}</span>
                      </p>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center py-12">
            <p className="text-gray-500">No articles found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

