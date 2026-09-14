import { Callout } from '@/components/mdx/callout';
import { CodeBlock } from '@/components/mdx/code-block';
import { FileTree } from '@/components/mdx/file-tree';
import { MdxImage } from '@/components/mdx/mdx-image';
import { Terminal } from '@/components/mdx/terminal';
import Link from 'next/link';
import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes } from 'react';

function MdxLink({ href = '', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isInternal = href.startsWith('/') || href.startsWith('#');

  if (isInternal) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  // Link ngoài: rel="noopener" bắt buộc khi có target="_blank",
  // nếu không trang đích truy cập được window.opener.
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

/** Thành phần dùng được trong mọi file MDX mà không cần import. */
export const mdxComponents: MDXComponents = {
  a: MdxLink,
  img: MdxImage,
  pre: CodeBlock,
  Callout,
  FileTree,
  Terminal,
};
