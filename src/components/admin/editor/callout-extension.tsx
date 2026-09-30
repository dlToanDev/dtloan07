'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

const CALLOUT_THEMES = {
  info: {
    label: 'Thông tin',
    icon: Info,
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-700 dark:text-sky-300',
    titleColor: 'text-sky-900 dark:text-sky-200',
  },
  warning: {
    label: 'Cảnh báo',
    icon: AlertTriangle,
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-700 dark:text-amber-300',
    titleColor: 'text-amber-900 dark:text-amber-200',
  },
  success: {
    label: 'Thành công',
    icon: CheckCircle2,
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    titleColor: 'text-emerald-900 dark:text-emerald-200',
  },
  danger: {
    label: 'Lưu ý quan trọng',
    icon: AlertCircle,
    borderColor: 'border-rose-500/40',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-700 dark:text-rose-300',
    titleColor: 'text-rose-900 dark:text-rose-200',
  },
} as const;

type CalloutType = keyof typeof CALLOUT_THEMES;

function CalloutNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const { type = 'info', title = '' } = node.attrs as {
    type: CalloutType;
    title: string;
  };

  const currentTheme = CALLOUT_THEMES[type] || CALLOUT_THEMES.info;
  const Icon = currentTheme.icon;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleSaveTitle = () => {
    updateAttributes({ title: editTitle.trim() });
    setIsEditingTitle(false);
  };

  return (
    <NodeViewWrapper
      className={`not-prose relative my-6 rounded-xl border ${currentTheme.borderColor} ${
        currentTheme.bgColor
      } p-4 transition-all ${selected ? 'ring-primary/20 ring-2' : ''} group`}
    >
      {/* Thanh hành động Callout (Chọn loại hộp, sửa tiêu đề, xóa) */}
      {editor.isEditable && (
        <div className="border-border bg-background/95 absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-lg border px-1.5 py-0.5 opacity-0 shadow-md backdrop-blur-xs transition-opacity group-hover:opacity-100">
          {(Object.keys(CALLOUT_THEMES) as CalloutType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => updateAttributes({ type: t })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                type === t
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title={`Chuyển sang ${CALLOUT_THEMES[t].label}`}
            >
              {CALLOUT_THEMES[t].label}
            </button>
          ))}

          <div className="bg-border mx-1 h-3.5 w-px" />

          <button
            type="button"
            onClick={() => setIsEditingTitle(!isEditingTitle)}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1 text-xs transition"
            title="Sửa tiêu đề Callout"
          >
            <Pencil className="size-3" />
          </button>

          <button
            type="button"
            onClick={deleteNode}
            className="hover:bg-destructive/10 text-destructive rounded p-1 text-xs transition"
            title="Xóa hộp ghi chú"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}

      {/* Header của Callout */}
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`size-4.5 shrink-0 ${currentTheme.textColor}`} />
        {editor.isEditable && isEditingTitle ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Nhập tiêu đề ghi chú..."
              className="border-input bg-background text-foreground h-6 flex-1 rounded px-2 text-xs font-semibold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
              }}
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-[10px]"
            >
              Lưu
            </button>
          </div>
        ) : (
          <span
            onClick={() => editor.isEditable && setIsEditingTitle(true)}
            className={`text-sm font-semibold ${
              editor.isEditable ? 'cursor-pointer hover:underline' : ''
            } ${currentTheme.titleColor}`}
            title={editor.isEditable ? 'Bấm để đổi tiêu đề' : undefined}
          >
            {title || currentTheme.label}
          </span>
        )}
      </div>

      {/* Phần nội dung có thể gõ chữ trực tiếp */}
      <div className="callout-inner-content text-sm leading-relaxed">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

export const CalloutExtension = Node.create({
  name: 'calloutBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-callout-type': attributes.type,
        }),
      },
      title: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-title': attributes.title }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'callout-block',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
});
