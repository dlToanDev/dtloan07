import { compileMDX } from 'next-mdx-remote/rsc';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { mdxOptions } from '@/lib/mdx-options';

/** Hiển thị nội dung admin soạn bằng trình soạn thảo bài viết (Markdown/MDX). */
export async function EditorContent({
  source,
  className = '',
}: {
  source: string;
  className?: string;
}) {
  try {
    const { content } = await compileMDX({
      source,
      components: mdxComponents,
      options: { mdxOptions },
    });
    return (
      <div
        className={`prose dark:prose-invert max-w-none min-w-0 leading-relaxed break-words [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto ${className}`}
      >
        {content}
      </div>
    );
  } catch (error) {
    console.error('Unable to render editor content:', error);
    return <div className="text-muted-foreground whitespace-pre-wrap">{source}</div>;
  }
}
