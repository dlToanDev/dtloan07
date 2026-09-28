import { describe, it, expect } from 'vitest';
import rehypeUnwrapImages from '@/lib/rehype-unwrap-images';

const el = (tagName: string, children: object[] = []) => ({ type: 'element', tagName, children });
const text = (value: string) => ({ type: 'text', value });

describe('rehypeUnwrapImages', () => {
  it('gỡ <p> chỉ chứa ảnh, giữ nguyên ảnh nằm giữa chữ', () => {
    const tree = el('root', [
      el('p', [text('\n'), el('img'), text(' ')]),
      el('p', [text('Xem hình '), el('img'), text(' bên dưới')]),
      el('div', [el('p', [el('img'), el('img')])]),
    ]);
    rehypeUnwrapImages()(tree as never);
    expect(tree.children.map((c: { tagName?: string }) => c.tagName)).toEqual(['img', 'p', 'div']);
    expect(
      (tree.children[2] as { children: { tagName: string }[] }).children.map((c) => c.tagName),
    ).toEqual(['img', 'img']);
  });
});
