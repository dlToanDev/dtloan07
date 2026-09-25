'use client';

import { type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Code,
  Columns,
  Headphones,
  Highlighter,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo,
  RemoveFormatting,
  Rows,
  Sparkles,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { uploadPostAudio, uploadPostImage } from '@/server/actions/post';

interface EditorToolbarProps {
  editor: Editor | null;
}

const PRESET_COLORS = [
  { label: 'Mặc định', color: '' },
  { label: 'Đen', color: '#111827' },
  { label: 'Xám', color: '#6b7280' },
  { label: 'Đỏ', color: '#ef4444' },
  { label: 'Cam', color: '#f97316' },
  { label: 'Vàng', color: '#eab308' },
  { label: 'Xanh lá', color: '#10b981' },
  { label: 'Xanh ngọc', color: '#06b6d4' },
  { label: 'Xanh dương', color: '#3b82f6' },
  { label: 'Chàm', color: '#6366f1' },
  { label: 'Tím', color: '#8b5cf6' },
  { label: 'Hồng', color: '#ec4899' },
];

const PRESET_HIGHLIGHTS = [
  { label: 'Bỏ highlight', color: '' },
  { label: 'Vàng dạ quang', color: '#fef08a' },
  { label: 'Xanh lá nhạt', color: '#bbf7d0' },
  { label: 'Xanh dương nhạt', color: '#bfdbfe' },
  { label: 'Hồng nhạt', color: '#fbcfe8' },
  { label: 'Tím nhạt', color: '#e9d5ff' },
  { label: 'Cam nhạt', color: '#fed7aa' },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  // Popover states
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);

  // Dialog states for Media
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Image dialog form
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('center');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Video dialog form
  const [videoSrc, setVideoSrc] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  // Audio dialog form
  const [audioTab, setAudioTab] = useState<'upload' | 'url'>('upload');
  const [audioSrc, setAudioSrc] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [audioDesc, setAudioDesc] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Link dialog form
  const [linkUrl, setLinkUrl] = useState('');

  // Error/notice inside dialogs
  const [dialogError, setDialogError] = useState('');

  // Click outside to close menus
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
        setShowHeadingMenu(false);
        setShowTableMenu(false);
        setShowCalloutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  // Image Insertion Handler
  const handleInsertImage = () => {
    if (!imageUrl.trim()) {
      setDialogError('Vui lòng chọn hoặc nhập đường dẫn ảnh.');
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: {
          src: imageUrl.trim(),
          alt: imageAlt.trim() || 'Hình ảnh bài viết',
          alignment: imageAlign,
          width: '100%',
        },
      })
      .run();

    setShowImageDialog(false);
    setImageUrl('');
    setImageAlt('');
    setDialogError('');
  };

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setDialogError('');

    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await uploadPostImage(formData);

      if (res.success && res.url) {
        setImageUrl(res.url);
        if (!imageAlt) {
          setImageAlt(
            file.name
              .replace(/\.[^.]+$/, '')
              .replace(/[-_]+/g, ' ')
              .trim(),
          );
        }
      } else {
        setDialogError(res.error || 'Không thể tải ảnh lên.');
      }
    } catch {
      setDialogError('Lỗi kết nối khi tải ảnh.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Video Insertion Handler
  const handleInsertVideo = () => {
    if (!videoSrc.trim()) {
      setDialogError('Vui lòng nhập link video YouTube, Vimeo hoặc MP4.');
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'videoBlock',
        attrs: {
          src: videoSrc.trim(),
          title: videoTitle.trim() || 'Video minh họa',
          align: 'center',
        },
      })
      .run();

    setShowVideoDialog(false);
    setVideoSrc('');
    setVideoTitle('');
    setDialogError('');
  };

  // Audio Insertion Handler
  const handleInsertAudio = () => {
    if (!audioSrc.trim()) {
      setDialogError('Vui lòng chọn hoặc nhập đường dẫn audio.');
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'audioBlock',
        attrs: {
          src: audioSrc.trim(),
          title: audioTitle.trim() || 'Bản ghi âm / Podcast',
          description: audioDesc.trim(),
        },
      })
      .run();

    setShowAudioDialog(false);
    setAudioSrc('');
    setAudioTitle('');
    setAudioDesc('');
    setDialogError('');
  };

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    setDialogError('');

    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await uploadPostAudio(formData);

      if (res.success && res.url) {
        setAudioSrc(res.url);
        if (!audioTitle) {
          setAudioTitle(
            file.name
              .replace(/\.[^.]+$/, '')
              .replace(/[-_]+/g, ' ')
              .trim(),
          );
        }
      } else {
        setDialogError(res.error || 'Không thể tải file âm thanh lên.');
      }
    } catch {
      setDialogError('Lỗi kết nối khi tải audio.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Link Insertion Handler
  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (
        !/^https?:\/\//i.test(finalUrl) &&
        !finalUrl.startsWith('/') &&
        !finalUrl.startsWith('#')
      ) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().setLink({ href: finalUrl }).run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  // Callout Insertion Handler
  const handleInsertCallout = (type: 'info' | 'warning' | 'success' | 'danger') => {
    const titles = {
      info: 'Thông tin bổ sung',
      warning: 'Lưu ý quan trọng',
      success: 'Kết quả đạt được',
      danger: 'Cảnh báo nguy hiểm',
    };
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'calloutBlock',
        attrs: {
          type,
          title: titles[type],
        },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Nhập nội dung ghi chú tại đây...' }],
          },
        ],
      })
      .run();
    setShowCalloutMenu(false);
  };

  // Determine current active heading
  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'Tiêu đề 1 (H1)'
    : editor.isActive('heading', { level: 2 })
      ? 'Tiêu đề 2 (H2)'
      : editor.isActive('heading', { level: 3 })
        ? 'Tiêu đề 3 (H3)'
        : editor.isActive('heading', { level: 4 })
          ? 'Tiêu đề 4 (H4)'
          : 'Đoạn văn (Normal)';

  return (
    <div
      ref={toolbarRef}
      className="border-border bg-card sticky top-0 z-20 flex flex-wrap items-center gap-1 rounded-t-lg p-2 lg:static lg:h-full lg:max-h-none lg:flex-col lg:items-stretch lg:gap-0 lg:self-stretch lg:rounded-l-lg lg:rounded-tr-none lg:p-3"
    >
      {/* 1. LỊCH SỬ (Undo / Redo) */}
      <div className="flex items-center gap-0.5 lg:justify-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1.5 transition disabled:opacity-30"
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1.5 transition disabled:opacity-30"
          title="Làm lại (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo className="size-4" />
        </button>
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 2. CHỌN KIỂU ĐOẠN VĂN / TIÊU ĐỀ (Heading / Paragraph) */}
      <div className="relative lg:w-full">
        <button
          type="button"
          onClick={() => {
            setShowHeadingMenu(!showHeadingMenu);
            setShowColorPicker(false);
            setShowHighlightPicker(false);
            setShowTableMenu(false);
            setShowCalloutMenu(false);
          }}
          className="border-border hover:bg-muted text-foreground flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition lg:w-full lg:justify-between"
        >
          <span className="w-28 truncate text-left">{currentHeading}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>

        {showHeadingMenu && (
          <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-44 space-y-0.5 rounded-lg border p-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setShowHeadingMenu(false);
              }}
              className={`hover:bg-muted flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition ${
                editor.isActive('paragraph') ? 'bg-primary/10 text-primary font-semibold' : ''
              }`}
            >
              <span>Đoạn văn thường</span>
              {editor.isActive('paragraph') && <Check className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                setShowHeadingMenu(false);
              }}
              className={`hover:bg-muted flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-primary/10 text-primary font-semibold'
                  : ''
              }`}
            >
              <span className="text-base font-bold">Tiêu đề 1 (H1)</span>
              {editor.isActive('heading', { level: 1 }) && <Check className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                setShowHeadingMenu(false);
              }}
              className={`hover:bg-muted flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-primary/10 text-primary font-semibold'
                  : ''
              }`}
            >
              <span className="text-sm font-semibold">Tiêu đề 2 (H2)</span>
              {editor.isActive('heading', { level: 2 }) && <Check className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                setShowHeadingMenu(false);
              }}
              className={`hover:bg-muted flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-primary/10 text-primary font-semibold'
                  : ''
              }`}
            >
              <span className="text-xs font-semibold">Tiêu đề 3 (H3)</span>
              {editor.isActive('heading', { level: 3 }) && <Check className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 4 }).run();
                setShowHeadingMenu(false);
              }}
              className={`hover:bg-muted flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition ${
                editor.isActive('heading', { level: 4 })
                  ? 'bg-primary/10 text-primary font-semibold'
                  : ''
              }`}
            >
              <span className="text-xs">Tiêu đề 4 (H4)</span>
              {editor.isActive('heading', { level: 4 }) && <Check className="size-3.5" />}
            </button>
          </div>
        )}
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 3. ĐỊNH DẠNG VĂN BẢN (Bold, Italic, Underline, Strikethrough, Code) */}
      <div className="flex items-center gap-0.5 lg:flex-wrap lg:justify-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('bold')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="In đậm (Ctrl+B)"
        >
          <Bold className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('italic')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('underline')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Gạch chân (Ctrl+U)"
        >
          <UnderlineIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('strike')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Gạch ngang"
        >
          <Strikethrough className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('code')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Mã nội dòng (Inline code)"
        >
          <Code className="size-4" />
        </button>
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 4. MÀU CHỮ & MÀU NỀN (Color & Highlight) */}
      <div className="flex items-center gap-0.5 lg:justify-center">
        {/* Màu chữ */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
              setShowHeadingMenu(false);
            }}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 rounded p-1.5 text-xs transition"
            title="Màu chữ văn bản"
          >
            <Palette className="size-4" />
            <ChevronDown className="size-3 opacity-60" />
          </button>

          {showColorPicker && (
            <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-52 rounded-lg border p-3 shadow-lg">
              <div className="text-muted-foreground mb-2 text-xs font-semibold">Chọn màu chữ</div>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_COLORS.map(({ label, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (!color) {
                        editor.chain().focus().unsetColor().run();
                      } else {
                        editor.chain().focus().setColor(color).run();
                      }
                      setShowColorPicker(false);
                    }}
                    className="border-border relative flex size-6 cursor-pointer items-center justify-center rounded-md border transition-transform hover:scale-110"
                    style={{ backgroundColor: color || 'transparent' }}
                    title={label}
                  >
                    {!color && <X className="text-muted-foreground size-3.5" />}
                  </button>
                ))}
              </div>
              <div className="border-border mt-3 flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground text-[11px]">Màu tùy chỉnh:</span>
                <input
                  type="color"
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run();
                    setShowColorPicker(false);
                  }}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Mở bảng màu"
                />
              </div>
            </div>
          )}
        </div>

        {/* Màu nền / Highlight */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
              setShowHeadingMenu(false);
            }}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 rounded p-1.5 text-xs transition"
            title="Màu nền đánh dấu (Highlight)"
          >
            <Highlighter className="size-4" />
            <ChevronDown className="size-3 opacity-60" />
          </button>

          {showHighlightPicker && (
            <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-52 rounded-lg border p-3 shadow-lg">
              <div className="text-muted-foreground mb-2 text-xs font-semibold">Màu đánh dấu</div>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_HIGHLIGHTS.map(({ label, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (!color) {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().setHighlight({ color }).run();
                      }
                      setShowHighlightPicker(false);
                    }}
                    className="border-border relative flex h-7 cursor-pointer items-center justify-center rounded-md border text-[10px] font-medium transition hover:scale-105"
                    style={{ backgroundColor: color || 'transparent' }}
                    title={label}
                  >
                    {!color ? <X className="size-3.5" /> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 5. CĂN LỀ & BỐ CỤC (Left, Center, Right, Justify) */}
      <div className="flex items-center gap-0.5 lg:justify-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Căn trái"
        >
          <AlignLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Căn giữa"
        >
          <AlignCenter className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Căn phải"
        >
          <AlignRight className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive({ textAlign: 'justify' })
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Căn đều hai bên"
        >
          <AlignJustify className="size-4" />
        </button>
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 6. DANH SÁCH (Bullets, Numbers, Task List) */}
      <div className="flex items-center gap-0.5 lg:justify-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('bulletList')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Danh sách gạch đầu dòng"
        >
          <List className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('orderedList')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Danh sách đánh số"
        >
          <ListOrdered className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('taskList')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Danh sách công việc (Checklist)"
        >
          <CheckSquare className="size-4" />
        </button>
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 7. KHỐI NỘI DUNG (Blockquote, Code Block, Divider, Table, Callout) */}
      <div className="flex items-center gap-0.5 lg:justify-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('blockquote')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Trích dẫn (Blockquote)"
        >
          <Quote className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`rounded p-1.5 text-xs transition ${
            editor.isActive('codeBlock')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Khối mã nguồn (Code block)"
        >
          <SquareCode className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1.5 text-xs transition"
          title="Kẻ đường phân cách ngang"
        >
          <Minus className="size-4" />
        </button>

        {/* Menu Bảng (Table) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTableMenu(!showTableMenu);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
              setShowCalloutMenu(false);
            }}
            className={`flex items-center gap-1 rounded p-1.5 text-xs transition ${
              editor.isActive('table')
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
            title="Bảng biểu (Table)"
          >
            <TableIcon className="size-4" />
            <ChevronDown className="size-3 opacity-60" />
          </button>

          {showTableMenu && (
            <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-48 space-y-1 rounded-lg border p-1.5 text-xs shadow-lg">
              <button
                type="button"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                  setShowTableMenu(false);
                }}
                className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-left"
              >
                <TableIcon className="size-3.5" /> Tạo bảng 3x3
              </button>

              {editor.isActive('table') && (
                <>
                  <div className="bg-border my-1 h-px" />
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addRowBefore().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1 text-left"
                  >
                    <Rows className="size-3.5" /> Thêm hàng trên
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1 text-left"
                  >
                    <Rows className="size-3.5" /> Thêm hàng dưới
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addColumnBefore().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1 text-left"
                  >
                    <Columns className="size-3.5" /> Thêm cột trái
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1 text-left"
                  >
                    <Columns className="size-3.5" /> Thêm cột phải
                  </button>
                  <div className="bg-border my-1 h-px" />
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteRow().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-destructive/10 text-destructive flex w-full items-center gap-2 rounded px-2 py-1 text-left"
                  >
                    <Trash2 className="size-3.5" /> Xóa hàng này
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-destructive/10 text-destructive flex w-full items-center gap-2 rounded px-2 py-1 text-left"
                  >
                    <Trash2 className="size-3.5" /> Xóa cột này
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-destructive/10 text-destructive flex w-full items-center gap-2 rounded px-2 py-1 text-left font-semibold"
                  >
                    <Trash2 className="size-3.5" /> Xóa toàn bộ bảng
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Menu Hộp Ghi Chú (Callout) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowCalloutMenu(!showCalloutMenu);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
              setShowTableMenu(false);
            }}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 rounded p-1.5 text-xs transition"
            title="Chèn hộp ghi chú (Callout)"
          >
            <Sparkles className="size-4" />
            <ChevronDown className="size-3 opacity-60" />
          </button>

          {showCalloutMenu && (
            <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-48 space-y-1 rounded-lg border p-1.5 text-xs shadow-lg">
              <button
                type="button"
                onClick={() => handleInsertCallout('info')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
              >
                <span className="size-2 rounded-full bg-sky-500" /> Hộp Thông tin (Info)
              </button>
              <button
                type="button"
                onClick={() => handleInsertCallout('warning')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
              >
                <span className="size-2 rounded-full bg-amber-500" /> Hộp Cảnh báo (Warning)
              </button>
              <button
                type="button"
                onClick={() => handleInsertCallout('success')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
              >
                <span className="size-2 rounded-full bg-emerald-500" /> Hộp Thành công (Success)
              </button>
              <button
                type="button"
                onClick={() => handleInsertCallout('danger')}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
              >
                <span className="size-2 rounded-full bg-rose-500" /> Hộp Chú ý (Danger)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-border mx-1 h-5 w-px lg:mx-0 lg:my-2 lg:h-px lg:w-full" />

      {/* 8. ĐA PHƯƠNG TIỆN (Ảnh, Video, Audio, Link) */}
      <div className="flex items-center gap-1 lg:order-first lg:grid lg:grid-cols-2 lg:gap-1.5">
        <div className="hidden lg:col-span-2 lg:mb-1 lg:block">
          <p className="text-foreground text-xs font-semibold">Thêm phương tiện</p>
          <p className="text-muted-foreground mt-0.5 text-[10px] leading-4">
            Chọn file hoặc kéo thả vào trang viết.
          </p>
        </div>
        {/* Nút Chèn Liên Kết */}
        <button
          type="button"
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href || '';
            setLinkUrl(previousUrl);
            setShowLinkDialog(true);
          }}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition lg:justify-center ${
            editor.isActive('link')
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'border-border/80 hover:bg-muted text-foreground border'
          }`}
          title="Chèn / Sửa liên kết (Link)"
        >
          <LinkIcon className="size-3.5" />
          <span className="hidden sm:inline">Link</span>
        </button>

        {/* Nút Chèn Ảnh */}
        <button
          type="button"
          onClick={() => {
            setImageUrl('');
            setImageAlt('');
            setDialogError('');
            setShowImageDialog(true);
          }}
          className="border-border/80 hover:bg-muted text-foreground flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition lg:justify-center"
          title="Chèn ảnh vào bài viết"
        >
          <ImagePlus className="text-primary size-3.5" />
          <span>Ảnh</span>
        </button>

        {/* Nút Chèn Video */}
        <button
          type="button"
          onClick={() => {
            setVideoSrc('');
            setVideoTitle('');
            setDialogError('');
            setShowVideoDialog(true);
          }}
          className="border-border/80 hover:bg-muted text-foreground flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition lg:justify-center"
          title="Chèn video (YouTube, Vimeo, MP4)"
        >
          <VideoIcon className="size-3.5 text-amber-500" />
          <span>Video</span>
        </button>

        {/* Nút Chèn Audio */}
        <button
          type="button"
          onClick={() => {
            setAudioSrc('');
            setAudioTitle('');
            setAudioDesc('');
            setDialogError('');
            setShowAudioDialog(true);
          }}
          className="border-border/80 hover:bg-muted text-foreground flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition lg:justify-center"
          title="Chèn audio / podcast"
        >
          <Headphones className="size-3.5 text-sky-500" />
          <span>Audio</span>
        </button>

        {/* Xóa định dạng */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1.5 text-xs transition lg:col-span-2 lg:mx-auto"
          title="Xóa toàn bộ định dạng đoạn văn đã chọn"
        >
          <RemoveFormatting className="size-4" />
        </button>
      </div>

      {/* ========================================================
          MODALS / DIALOGS PHỤ TRỢ CHO TOOLBAR
          ======================================================== */}

      {/* DIALOG CHÈN ẢNH */}
      {showImageDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs sm:p-6">
          <div className="border-border bg-card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ImagePlus className="text-primary size-5" /> Chèn hình ảnh
              </h3>
              <button
                type="button"
                onClick={() => setShowImageDialog(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tabs Upload / URL */}
            <div className="border-border bg-muted/50 mb-5 grid grid-cols-2 rounded-xl border p-1">
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  imageTab === 'upload'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tải từ máy tính
              </button>
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  imageTab === 'url'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Nhập link URL
              </button>
            </div>

            {dialogError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-lg border p-3 text-sm">
                {dialogError}
              </div>
            )}

            <div className="space-y-4">
              {imageTab === 'upload' ? (
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Chọn tệp ảnh (PNG, JPG, WebP, SVG, GIF, tối đa 8 MB)
                  </label>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImageFile}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => imageFileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60"
                    >
                      <Upload className="size-5" />
                      {isUploadingImage ? 'Đang tải ảnh lên...' : 'Chọn file ảnh từ máy'}
                    </button>
                  </div>
                  {imageUrl && (
                    <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                      Đã tải: {imageUrl}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Đường dẫn ảnh (URL)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... hoặc /images/posts/..."
                    className="border-input bg-background h-11 w-full rounded-lg border px-3 font-mono text-sm"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Chú thích / Mô tả ảnh (Alt text)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="VD: Sơ đồ kiến trúc microservices"
                  className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Căn lề bố cục ảnh
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setImageAlign('left')}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 text-sm transition ${
                      imageAlign === 'left'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <AlignLeft className="size-3.5" /> Căn trái
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageAlign('center')}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 text-sm transition ${
                      imageAlign === 'center'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <AlignCenter className="size-3.5" /> Căn giữa
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageAlign('right')}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 text-sm transition ${
                      imageAlign === 'right'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <AlignRight className="size-3.5" /> Căn phải
                  </button>
                </div>
              </div>
            </div>

            <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowImageDialog(false)}
                className="border-border hover:bg-muted h-10 rounded-lg border px-4 text-sm font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                disabled={!imageUrl || isUploadingImage}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg px-5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Chèn ảnh vào bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG CHÈN VIDEO */}
      {showVideoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="border-border bg-card w-full max-w-md rounded-xl border p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <VideoIcon className="size-5 text-amber-500" /> Chèn video vào bài viết
              </h3>
              <button
                type="button"
                onClick={() => setShowVideoDialog(false)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            {dialogError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive mb-3 rounded-lg border p-2.5 text-xs">
                {dialogError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Đường dẫn Video <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  value={videoSrc}
                  onChange={(e) => setVideoSrc(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... hoặc Vimeo, file MP4"
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-xs"
                  autoFocus
                />
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Hỗ trợ link YouTube, YouTube Shorts, Vimeo hoặc video MP4 trực tiếp.
                </p>
              </div>

              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Tiêu đề / Chú thích video
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="VD: Hướng dẫn cài đặt Docker trên Ubuntu"
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="border-border mt-5 flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => setShowVideoDialog(false)}
                className="hover:bg-muted rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleInsertVideo}
                disabled={!videoSrc.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Chèn video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG CHÈN AUDIO / PODCAST */}
      {showAudioDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="border-border bg-card w-full max-w-md rounded-xl border p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Headphones className="size-5 text-sky-500" /> Chèn Audio / Podcast
              </h3>
              <button
                type="button"
                onClick={() => setShowAudioDialog(false)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tabs Upload / URL */}
            <div className="border-border bg-muted/40 mb-4 flex rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setAudioTab('upload')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  audioTab === 'upload'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tải từ máy tính
              </button>
              <button
                type="button"
                onClick={() => setAudioTab('url')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  audioTab === 'url'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Nhập link audio
              </button>
            </div>

            {dialogError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive mb-3 rounded-lg border p-2.5 text-xs">
                {dialogError}
              </div>
            )}

            <div className="space-y-3">
              {audioTab === 'upload' ? (
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-medium">
                    Chọn tệp âm thanh (MP3, WAV, OGG, M4A, AAC, tối đa 50 MB)
                  </label>
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                    onChange={handleUploadAudioFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    disabled={isUploadingAudio}
                    className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-xs font-medium transition"
                  >
                    <Upload className="size-4" />
                    {isUploadingAudio ? 'Đang tải tệp âm thanh lên...' : 'Chọn file audio từ máy'}
                  </button>
                  {audioSrc && (
                    <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                      Đã tải: {audioSrc}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-medium">
                    Đường dẫn tệp Audio
                  </label>
                  <input
                    type="text"
                    value={audioSrc}
                    onChange={(e) => setAudioSrc(e.target.value)}
                    placeholder="/audio/... hoặc https://..."
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Tiêu đề bản ghi âm / Podcast
                </label>
                <input
                  type="text"
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  placeholder="VD: Podcast Tập 1 - Tổng quan về AI Agents"
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Mô tả ngắn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={audioDesc}
                  onChange={(e) => setAudioDesc(e.target.value)}
                  placeholder="VD: Thời lượng 15 phút, thảo luận cùng chuyên gia"
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="border-border mt-5 flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => setShowAudioDialog(false)}
                className="hover:bg-muted rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleInsertAudio}
                disabled={!audioSrc || isUploadingAudio}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Chèn audio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG CHÈN / SỬA LINK */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="border-border bg-card w-full max-w-sm rounded-xl border p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <LinkIcon className="text-primary size-4" /> Liên kết (URL)
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkDialog(false)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com hoặc /duong-dan"
                className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetLink();
                }}
              />
            </div>

            <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
              {editor.isActive('link') ? (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkDialog(false);
                  }}
                  className="hover:bg-destructive/10 text-destructive flex items-center gap-1 rounded px-2 py-1 text-xs"
                >
                  <Unlink className="size-3.5" /> Bỏ link
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkDialog(false)}
                  className="hover:bg-muted rounded px-2.5 py-1 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSetLink}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1 text-xs font-medium"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
