'use client';

import { useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link as TiptapLink } from '@tiptap/extension-link';
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Strikethrough,
} from 'lucide-react';
import { uploadCommunityImage } from '@/server/actions/community-post';
import { cn } from '@/lib/utils';

function ToolButton({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded-md p-1.5 transition disabled:opacity-40',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
}) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Dán đường dẫn (https://…)', previous ?? 'https://');
    if (url === null) return;
    if (url.trim() === '' || url === 'https://') return editor.chain().focus().unsetLink().run();
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="border-border flex flex-wrap gap-0.5 border-b p-1.5">
      <ToolButton
        title="Đậm"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton
        title="Nghiêng"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton
        title="Gạch ngang"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolButton>
      <ToolButton
        title="Tiêu đề lớn"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolButton>
      <ToolButton
        title="Tiêu đề nhỏ"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolButton>
      <ToolButton
        title="Danh sách"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolButton>
      <ToolButton
        title="Danh sách số"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton
        title="Trích dẫn"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolButton>
      <ToolButton
        title="Khối code"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="size-4" />
      </ToolButton>
      <ToolButton title="Chèn link" active={editor.isActive('link')} onClick={setLink}>
        <Link2 className="size-4" />
      </ToolButton>
      <ToolButton title="Chèn ảnh" onClick={onPickImage} disabled={uploading}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
      </ToolButton>
    </div>
  );
}

/** Trình soạn bài cho tài khoản Pro: chỉ các định dạng mà bộ lọc HTML cho phép. */
export function CommunityEditor({
  value,
  onChange,
  onError,
  onUploadingChange,
}: {
  value: string;
  onChange: (html: string) => void;
  onError: (message: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
      TiptapLink.configure({ openOnClick: false, autolink: true }),
      Image,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert min-h-[320px] max-w-none px-4 py-3 focus:outline-none [&_img]:max-w-full',
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const upload = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const result = await uploadCommunityImage(form);
      if (!result.ok) return onError(result.error);
      editor.chain().focus().setImage({ src: result.data.url, alt: file.name }).run();
    } catch {
      onError('Không tải được ảnh, vui lòng thử lại.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className="border-border bg-background overflow-hidden rounded-lg border">
      {editor && (
        <Toolbar
          editor={editor}
          uploading={uploading}
          onPickImage={() => fileRef.current?.click()}
        />
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
