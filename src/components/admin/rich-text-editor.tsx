'use client';

import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link as TiptapLink } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { FileAudio, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AudioExtension } from './editor/audio-extension';
import { CalloutExtension } from './editor/callout-extension';
import { EditorToolbar } from './editor/editor-toolbar';
import { CustomImageExtension } from './editor/image-extension';
import { VideoExtension } from './editor/video-extension';
import { htmlToMarkdown, markdownToHtml } from '@/lib/editor-converter';
import { uploadPostAudio, uploadPostImage } from '@/server/actions/post';

interface RichTextEditorProps {
  value: string; // Markdown / MDX string
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onError?: (error: string) => void;
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  minHeight = 'min-h-[36rem]',
  onUploadStart,
  onUploadEnd,
  onError,
}: RichTextEditorProps) {
  const lastMarkdownRef = useRef(value);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        dropcursor: {
          color: '#3b82f6',
          width: 2,
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-primary underline font-medium hover:opacity-80 transition',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CustomImageExtension,
      VideoExtension,
      AudioExtension,
      CalloutExtension,
    ],
    content: markdownToHtml(value),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: readOnly
          ? 'prose dark:prose-invert max-w-none focus:outline-none leading-relaxed'
          : `prose dark:prose-invert max-w-none focus:outline-none ${minHeight} px-8 py-6 leading-relaxed selection:bg-primary/20`,
      },
      handlePaste: (_view, event) => {
        const image = Array.from(event.clipboardData?.files || []).find((file) =>
          file.type.startsWith('image/'),
        );
        if (!image) return false;

        event.preventDefault();
        void uploadAndInsertImage(image);
        return true;
      },
      handleDrop: (_view, event) => {
        const hasFiles = event.dataTransfer?.types?.includes('Files');
        if (!hasFiles) return false;

        event.preventDefault();

        const file = Array.from(event.dataTransfer?.files || []).find(
          (candidate) => candidate.type.startsWith('image/') || candidate.type.startsWith('audio/'),
        );

        if (!file) {
          onError?.(
            'Chỉ hỗ trợ kéo thả ảnh hoặc audio. Video được chèn bằng URL từ thanh công cụ.',
          );
          setIsDraggingMedia(false);
          return true;
        }

        setIsDraggingMedia(false);

        if (file.type.startsWith('audio/')) {
          void uploadAndInsertAudio(file);
        } else {
          void uploadAndInsertImage(file);
        }
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      // Bỏ qua cập nhật "phản hồi" không làm đổi nội dung (vd. ngay sau setContent từ props) —
      // nếu báo lên cha, cha và editor có thể ghi đè nhau mãi (Maximum update depth).
      if (markdown === lastMarkdownRef.current) return;
      lastMarkdownRef.current = markdown;
      onChange(markdown);
    },
    immediatelyRender: false,
  });

  const uploadAndInsertImage = async (file: File) => {
    if (!editor) return;

    setUploadingMedia(file.name);
    onUploadStart?.();
    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadPostImage(formData);

      if (!result.success || !result.url) {
        onError?.(result.error || 'Không thể tải ảnh lên máy chủ.');
        return;
      }

      const alt = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      editor
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: {
            src: result.url,
            alt: alt || 'Ảnh minh họa',
            alignment: 'center',
            width: '100%',
          },
        })
        .run();
    } catch {
      onError?.('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setUploadingMedia('');
      onUploadEnd?.();
    }
  };

  const uploadAndInsertAudio = async (file: File) => {
    if (!editor) return;

    setUploadingMedia(file.name);
    onUploadStart?.();
    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadPostAudio(formData);

      if (!result.success || !result.url) {
        onError?.(result.error || 'Không thể tải audio lên máy chủ.');
        return;
      }

      const title = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      editor
        .chain()
        .focus()
        .insertContent({
          type: 'audioBlock',
          attrs: {
            src: result.url,
            title: title || 'Bản ghi âm / Podcast',
            description: '',
          },
        })
        .run();
    } catch {
      onError?.('Lỗi kết nối khi tải audio lên.');
    } finally {
      setUploadingMedia('');
      onUploadEnd?.();
    }
  };

  // Đồng bộ từ props bên ngoài khi value thay đổi (như khi import file docx/markdown hoặc chuyển tab)
  useEffect(() => {
    if (!editor) return;

    editor.setEditable(!readOnly);

    if (value !== lastMarkdownRef.current) {
      lastMarkdownRef.current = value;
      const html = markdownToHtml(value);
      editor.commands.setContent(html, { emitUpdate: false });
      // Markdown sau khi qua editor có thể khác chút (thuộc tính ảnh, khoảng trắng); ghi nhớ bản
      // đã chuẩn hóa để lần onUpdate kế tiếp không coi đó là thay đổi mới.
      lastMarkdownRef.current = htmlToMarkdown(editor.getHTML());
    }
  }, [value, editor, readOnly]);

  // Thống kê nhanh: số từ, số ký tự
  const textContent = editor?.getText() || '';
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = textContent.length;

  if (readOnly) {
    return <EditorContent editor={editor} />;
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="lg:grid lg:h-[38rem] lg:grid-cols-[14rem_minmax(0,1fr)] lg:overflow-hidden">
        {/* Công cụ nằm bên trái trên desktop, cuộn ngang gọn gàng trên mobile. */}
        <EditorToolbar editor={editor} />

        {/* Phần giữa chỉ dành cho trang nội dung. */}
        <div
          className="bg-muted/20 relative min-h-[38rem] border-t p-3 sm:p-5 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-t-0 lg:border-l lg:p-8"
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes('Files')) setIsDraggingMedia(true);
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) event.preventDefault();
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDraggingMedia(false);
            }
          }}
          onDrop={() => setIsDraggingMedia(false)}
        >
          {(isDraggingMedia || uploadingMedia) && (
            <div className="border-primary bg-background/95 text-foreground pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed p-6 text-center shadow-lg backdrop-blur-sm sm:inset-5 lg:inset-8">
              <div className="space-y-3">
                <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                  {uploadingMedia ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <UploadCloud className="size-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {uploadingMedia ? 'Đang tải phương tiện...' : 'Thả file vào nội dung'}
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-xs truncate text-xs">
                    {uploadingMedia || 'Hỗ trợ ảnh và audio từ máy tính'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-border/70 bg-background mx-auto min-h-[36rem] w-full max-w-4xl rounded-sm border shadow-sm">
            <EditorContent editor={editor} />
          </div>

          <div className="text-muted-foreground mx-auto mt-3 flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <ImagePlus className="size-3.5" /> Kéo thả hoặc dán ảnh
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileAudio className="size-3.5" /> Kéo thả audio
            </span>
          </div>
        </div>
      </div>

      <div className="border-border bg-card text-muted-foreground flex flex-wrap items-center justify-between border-t px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span>{wordCount.toLocaleString()} từ</span>
          <span>•</span>
          <span>{charCount.toLocaleString()} ký tự</span>
          <span>•</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            Trình soạn thảo trực quan (Word / WYSIWYG)
          </span>
        </div>
        <div className="hidden text-[11px] sm:block">Tự động lưu định dạng sang Markdown / MDX</div>
      </div>
    </div>
  );
}
