import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode, { type Options as PrettyCodeOptions } from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import rehypeUnwrapImages from '@/lib/rehype-unwrap-images';
import type { PluggableList } from 'unified';

const prettyCodeOptions: PrettyCodeOptions = {
  // Hai theme cùng lúc: rehype-pretty-code gắn cả hai bộ biến CSS vào DOM,
  // globals.css chọn bộ nào theo class .dark. Không cần JS, không nháy màu.
  theme: {
    light: 'github-light-high-contrast',
    dark: 'github-dark-dimmed',
  },
  keepBackground: false,
  defaultLang: { block: 'text', inline: 'text' },
  onVisitLine(node) {
    // Dòng trống bị collapse sẽ làm hỏng nền highlight — chèn 1 ký tự rỗng.
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }];
    }
  },
  onVisitHighlightedLine(node) {
    node.properties.className = [...(node.properties.className ?? []), 'line--highlighted'];
  },
  onVisitHighlightedChars(node) {
    node.properties.className = ['word--highlighted'];
  },
};

export const mdxOptions: { remarkPlugins: PluggableList; rehypePlugins: PluggableList } = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [
    rehypeUnwrapImages,
    rehypeSlug,
    [rehypePrettyCode, prettyCodeOptions],
    [
      rehypeAutolinkHeadings,
      {
        behavior: 'append',
        properties: {
          className: ['heading-anchor'],
          'aria-hidden': 'true',
          tabIndex: -1,
        },
        content: { type: 'text', value: '#' },
      },
    ],
  ],
};
