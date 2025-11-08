// Safe Markdown Renderer
// Renders markdown content with sanitization

import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

interface MarkdownProps {
  content: string;
  className?: string;
}

export async function Markdown({ content, className = '' }: MarkdownProps) {
  const processor = unified()
    .use(remark)
    .use(remarkRehype)
    .use(rehypeSanitize, {
      tagNames: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
      ],
      attributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        code: ['class'],
      },
    })
    .use(rehypeStringify);

  const result = await processor.process(content);
  const html = String(result);

  return (
    <div
      className={`prose prose-lg max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

