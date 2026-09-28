import { EditorContent } from '@/components/mdx/editor-content';

/** Product descriptions are authored by admins using the same editor as blog posts. */
export function ProductDescription({ source }: { source: string }) {
  return <EditorContent source={source} className="text-muted-foreground text-sm sm:text-base" />;
}
