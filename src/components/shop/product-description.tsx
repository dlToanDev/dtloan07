import { compileMDX } from 'next-mdx-remote/rsc';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { mdxOptions } from '@/lib/mdx-options';

/** Product descriptions are authored by admins using the same editor as blog posts. */
export async function ProductDescription({ source }: { source: string }) {
  try {
    const { content } = await compileMDX({
      source,
      components: mdxComponents,
      options: { mdxOptions },
    });
    return (
      <div className="prose dark:prose-invert text-muted-foreground max-w-none min-w-0 text-sm leading-relaxed break-words sm:text-base [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto">
        {content}
      </div>
    );
  } catch (error) {
    console.error('Unable to render product description:', error);
    return <div className="text-muted-foreground whitespace-pre-wrap">{source}</div>;
  }
}
