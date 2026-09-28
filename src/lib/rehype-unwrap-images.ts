/**
 * Gỡ thẻ <p> bọc quanh ảnh đứng một mình (`![](...)` trên một dòng riêng). MdxImage render
 * <figure>, mà <figure> nằm trong <p> là HTML không hợp lệ → trình duyệt tự sửa DOM và React báo
 * lỗi hydration. Ảnh nằm giữa câu chữ thì giữ nguyên.
 */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
}

const isImage = (node: HastNode) => node.type === 'element' && node.tagName === 'img';
const isBlank = (node: HastNode) => node.type === 'text' && !node.value?.trim();

function unwrap(node: HastNode) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (
      child.type === 'element' &&
      child.tagName === 'p' &&
      child.children?.some(isImage) &&
      child.children.every((c) => isImage(c) || isBlank(c))
    )
      return child.children.filter(isImage);
    unwrap(child);
    return [child];
  });
}

export default function rehypeUnwrapImages() {
  return (tree: HastNode) => unwrap(tree);
}
