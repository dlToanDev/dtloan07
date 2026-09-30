'use client';

import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

function ImageNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const {
    src,
    alt = '',
    alignment = 'center',
    width = '100%',
  } = node.attrs as {
    src: string;
    alt: string;
    alignment: 'left' | 'center' | 'right';
    width: string;
  };

  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [caption, setCaption] = useState(alt);

  const handleSaveCaption = () => {
    updateAttributes({ alt: caption.trim() });
    setIsEditingCaption(false);
  };

  const alignContainerClass =
    alignment === 'left'
      ? 'flex justify-start text-left'
      : alignment === 'right'
        ? 'flex justify-end text-right'
        : 'flex justify-center text-center';

  return (
    <NodeViewWrapper className={`not-prose relative my-6 ${alignContainerClass} group`}>
      <div
        className={`relative inline-block rounded-lg transition-all ${
          selected ? 'ring-primary ring-2' : ''
        }`}
        style={{ width: width || '100%', maxWidth: '100%' }}
      >
        {/* Floating toolbar khi hover hoặc click vào ảnh */}
        {editor.isEditable && (
          <div className="border-border bg-background/95 absolute -top-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border px-1.5 py-1 opacity-0 shadow-md backdrop-blur-xs transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => updateAttributes({ alignment: 'left' })}
              className={`rounded p-1 text-xs transition ${
                alignment === 'left'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Căn trái"
            >
              <AlignLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ alignment: 'center' })}
              className={`rounded p-1 text-xs transition ${
                alignment === 'center'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Căn giữa"
            >
              <AlignCenter className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ alignment: 'right' })}
              className={`rounded p-1 text-xs transition ${
                alignment === 'right'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Căn phải"
            >
              <AlignRight className="size-3.5" />
            </button>

            <div className="bg-border mx-1 h-3.5 w-px" />

            {/* Thay đổi kích thước ảnh nhanh */}
            <button
              type="button"
              onClick={() => updateAttributes({ width: '50%' })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                width === '50%'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Thu nhỏ 50%"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ width: '75%' })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                width === '75%'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Trung bình 75%"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ width: '100%' })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                width === '100%'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Kích thước đầy đủ 100%"
            >
              100%
            </button>

            <div className="bg-border mx-1 h-3.5 w-px" />

            <button
              type="button"
              onClick={() => setIsEditingCaption(!isEditingCaption)}
              className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1 text-xs transition"
              title="Sửa chú thích ảnh"
            >
              <Pencil className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={deleteNode}
              className="hover:bg-destructive/10 text-destructive rounded p-1 text-xs transition"
              title="Xóa ảnh"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || 'Hình ảnh'}
          className="border-border/80 block h-auto w-full rounded-lg border object-contain shadow-xs"
        />

        {/* Chú thích ảnh (Caption) */}
        {editor.isEditable && isEditingCaption ? (
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Nhập chú thích ảnh..."
              className="border-input bg-background h-7 w-full max-w-sm rounded border px-2.5 text-center text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCaption();
              }}
            />
            <button
              type="button"
              onClick={handleSaveCaption}
              className="bg-primary text-primary-foreground h-7 rounded px-2.5 text-xs font-medium"
            >
              Lưu
            </button>
          </div>
        ) : alt || editor.isEditable ? (
          <p
            onClick={() => editor.isEditable && setIsEditingCaption(true)}
            className={`text-muted-foreground mt-1.5 text-center text-xs italic ${
              editor.isEditable ? 'hover:text-foreground cursor-pointer transition-colors' : ''
            }`}
            title={editor.isEditable ? 'Bấm để sửa chú thích' : undefined}
          >
            {alt ? alt : <span className="opacity-50">+ Thêm chú thích cho ảnh</span>}
          </p>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

export const CustomImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
        renderHTML: (attributes) => ({ 'data-alignment': attributes.alignment }),
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('data-width') || '100%',
        renderHTML: (attributes) => ({ 'data-width': attributes.width }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
