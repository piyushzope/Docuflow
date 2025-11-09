import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { generatePostMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getPostBySlug, getRelatedPosts, getPosts } from '@/lib/cms';
import { Markdown } from '@/components/site/markdown';
import { format } from 'date-fns';
import Script from 'next/script';

// ISR: Revalidate every hour
export const revalidate = 3600;

// Generate static params for popular posts at build time
export async function generateStaticParams() {
  try {
    const posts = await getPosts({ limit: 50 });
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for posts:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return generatePostMetadata(post);
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, relatedPosts] = await Promise.all([
    getPostBySlug(slug),
    getRelatedPosts(slug),
  ]);

  if (!post) {
    notFound();
  }

  const articleSchema = generateArticleSchema(post);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Resources', url: '/resources' },
    { name: post.title },
  ]);

  return (
    <>
      <article className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <header>
            {post.category && (
              <Link
                href={`/resources?category=${post.category.slug}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                {post.category.name}
              </Link>
            )}
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-6 text-xl leading-8 text-gray-600">{post.excerpt}</p>
            )}
            <div className="mt-8 flex items-center gap-x-4">
              {post.author && (
                <div className="flex items-center gap-x-4">
                  {post.author.avatar_url && (
                    <Image
                      src={post.author.avatar_url}
                      alt={post.author.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full bg-gray-50"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{post.author.name}</p>
                    {post.author.bio && (
                      <p className="text-sm text-gray-500">{post.author.bio}</p>
                    )}
                  </div>
                </div>
              )}
              {post.published_at && (
                <time
                  dateTime={post.published_at}
                  className="text-sm text-gray-500"
                >
                  {format(new Date(post.published_at), 'MMMM d, yyyy')}
                </time>
              )}
              {post.reading_time_minutes && (
                <span className="text-sm text-gray-500">
                  {post.reading_time_minutes} min read
                </span>
              )}
            </div>
          </header>
          {post.cover_image_url && (
            <div className="mt-12">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                width={1200}
                height={630}
                className="rounded-lg"
                priority
              />
            </div>
          )}
          <div className="mt-12">
            <Markdown content={post.content_md} />
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-12">
              <h3 className="text-sm font-medium text-gray-900">Tags</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {relatedPosts.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Related Posts</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {relatedPosts.slice(0, 4).map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/resources/${relatedPost.slug}`}
                    className="group"
                  >
                    <h4 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
                      {relatedPost.title}
                    </h4>
                    {relatedPost.excerpt && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
    </>
  );
}

