'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Pencil,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react';
import { useState } from 'react';

function getEmbedUrl(src: string): string | null {
  try {
    const url = new URL(src);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (hostname === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      const parts = url.pathname.split('/').filter(Boolean);
      const videoId =
        url.searchParams.get('v') ||
        (['embed', 'shorts', 'live'].includes(parts[0] ?? '') ? parts[1] : null);
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
      const videoId = url.pathname
        .split('/')
        .filter(Boolean)
        .findLast((part) => /^\d+$/.test(part));
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function VideoNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const {
    src,
    title,
    align = 'center',
  } = node.attrs as {
    src: string;
    title: string;
    align: 'left' | 'center' | 'right';
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editSrc, setEditSrc] = useState(src);
  const [editTitle, setEditTitle] = useState(title);

  const embedUrl = src ? getEmbedUrl(src) : null;

  const handleSave = () => {
    updateAttributes({
      src: editSrc.trim(),
      title: editTitle.trim(),
    });
    setIsEditing(false);
  };

  const alignClass = align === 'left' ? 'mr-auto' : align === 'right' ? 'ml-auto' : 'mx-auto';

  return (
    <NodeViewWrapper
      className={`not-prose my-6 max-w-3xl ${alignClass} group relative rounded-xl border transition-all ${
        selected
          ? 'border-primary ring-primary/20 ring-2'
          : 'border-border/80 hover:border-primary/50'
      } bg-card/60 p-3 shadow-xs`}
    >
      {/* Thanh công cụ quản lý Video nhanh khi hover hoặc chọn */}
      {editor.isEditable && (
        <div className="border-border bg-background/95 absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-lg border px-1.5 py-1 opacity-0 shadow-md backdrop-blur-xs transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => updateAttributes({ align: 'left' })}
            className={`hover:bg-muted rounded p-1 text-xs transition ${
              align === 'left'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground'
            }`}
            title="Căn trái"
          >
            <AlignLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ align: 'center' })}
            className={`hover:bg-muted rounded p-1 text-xs transition ${
              align === 'center'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground'
            }`}
            title="Căn giữa"
          >
            <AlignCenter className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ align: 'right' })}
            className={`hover:bg-muted rounded p-1 text-xs transition ${
              align === 'right'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground'
            }`}
            title="Căn phải"
          >
            <AlignRight className="size-3.5" />
          </button>

          <div className="bg-border mx-1 h-3.5 w-px" />

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1 text-xs transition"
            title="Chỉnh sửa URL / Tiêu đề"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="hover:bg-destructive/10 text-destructive rounded p-1 text-xs transition"
            title="Xóa video"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {/* Form sửa nhanh URL/tiêu đề */}
      {editor.isEditable && isEditing && (
        <div className="border-border bg-muted/40 mb-3 space-y-2 rounded-lg border p-3">
          <div className="text-primary text-xs font-semibold">Chỉnh sửa thông tin Video</div>
          <div className="space-y-1.5">
            <input
              type="url"
              value={editSrc}
              onChange={(e) => setEditSrc(e.target.value)}
              placeholder="URL YouTube, Vimeo hoặc link MP4..."
              className="border-input bg-background w-full rounded-md border px-2.5 py-1 font-mono text-xs"
            />
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Tiêu đề / Chú thích video..."
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

      {/* Khung phát Video */}
      <div className="border-border bg-muted/30 relative aspect-video w-full overflow-hidden rounded-lg border">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title || 'Video minh họa'}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : src ? (
          <video src={src} controls className="size-full bg-black object-contain">
            Trình duyệt không hỗ trợ phát video.
          </video>
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2 p-4 text-xs">
            <VideoIcon className="size-8 opacity-40" />
            <p>Chưa có đường dẫn video</p>
          </div>
        )}
      </div>

      {title ? (
        <figcaption className="text-muted-foreground mt-2 text-center text-xs font-medium italic">
          {title}
        </figcaption>
      ) : null}
    </NodeViewWrapper>
  );
}

export const VideoExtension = Node.create({
  name: 'videoBlock',
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
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-title': attributes.title }),
      },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-align': attributes.align }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'video-block',
      }),
      `[Video: ${HTMLAttributes['data-title'] || HTMLAttributes['data-src'] || ''}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },
});
