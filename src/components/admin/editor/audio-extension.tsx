'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Headphones, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

function AudioNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const { src, title, description } = node.attrs as {
    src: string;
    title: string;
    description: string;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editSrc, setEditSrc] = useState(src);
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);

  const handleSave = () => {
    updateAttributes({
      src: editSrc.trim(),
      title: editTitle.trim(),
      description: editDesc.trim(),
    });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper
      className={`not-prose group relative mx-auto my-6 max-w-3xl rounded-xl border transition-all ${
        selected
          ? 'border-primary ring-primary/20 ring-2'
          : 'border-border/80 hover:border-primary/50'
      } bg-card/60 p-4 shadow-xs`}
    >
      {/* Nút hành động nhanh trên góc */}
      {editor.isEditable && (
        <div className="border-border bg-background/95 absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-lg border px-1.5 py-1 opacity-0 shadow-md backdrop-blur-xs transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1 text-xs transition"
            title="Chỉnh sửa thông tin Audio"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="hover:bg-destructive/10 text-destructive rounded p-1 text-xs transition"
            title="Xóa audio"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {/* Form sửa nhanh */}
      {editor.isEditable && isEditing && (
        <div className="border-border bg-muted/40 mb-3 space-y-2 rounded-lg border p-3">
          <div className="text-primary text-xs font-semibold">Chỉnh sửa tệp âm thanh / Podcast</div>
          <div className="space-y-1.5">
            <input
              type="text"
              value={editSrc}
              onChange={(e) => setEditSrc(e.target.value)}
              placeholder="Đường dẫn audio (/audio/... hoặc URL https://...)"
              className="border-input bg-background w-full rounded-md border px-2.5 py-1 font-mono text-xs"
            />
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Tiêu đề audio..."
              className="border-input bg-background w-full rounded-md border px-2.5 py-1 text-xs"
            />
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Mô tả / ghi chú (không bắt buộc)..."
              className="border-input bg-background w-full rounded-md border px-2.5 py-1 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="hover:bg-muted rounded px-2.5 py-1 text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2.5 py-1 text-xs font-medium"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}

      {/* Trình phát Audio */}
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Headphones className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">
            {title || 'Bản ghi âm / Podcast'}
          </p>
          {description && <p className="text-muted-foreground truncate text-xs">{description}</p>}
        </div>
      </div>

      {src ? (
        <audio controls preload="metadata" className="accent-primary h-10 w-full">
          <source src={src} />
          Trình duyệt không hỗ trợ phát âm thanh.
        </audio>
      ) : (
        <p className="text-muted-foreground text-center text-xs italic">
          Chưa có tệp âm thanh. Bấm icon bút chì để nhập link hoặc upload.
        </p>
      )}
    </NodeViewWrapper>
  );
}

export const AudioExtension = Node.create({
  name: 'audioBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-src') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-src': attributes.src }),
      },
      title: {
        default: 'Bản ghi âm / Podcast',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-title': attributes.title }),
      },
      description: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-description') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-description': attributes.description,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="audio-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'audio-block',
      }),
      `[Audio: ${HTMLAttributes['data-title'] || HTMLAttributes['data-src'] || ''}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView);
  },
});
