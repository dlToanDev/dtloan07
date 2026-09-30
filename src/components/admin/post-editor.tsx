'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS, getCategoryLabel } from '@/config/blog';
import { cn, slugifyPostTitle } from '@/lib/utils';
import {
  createPost,
  importPostFile,
  uploadCoverImage,
  uploadPostAudio,
  uploadPostImage,
} from '@/server/actions/post';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Code,
  FileText,
  FileUp,
  Globe,
  Headphones,
  Eye,
  Loader2,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { RichTextEditor } from '@/components/admin/rich-text-editor';

type Category = string;

const DEFAULT_POST_CONTENT = `Mở bài: mô tả ngắn gọn vấn đề người đọc đang gặp và kết quả họ sẽ đạt được sau bài viết.

## Vấn đề cần giải quyết

Giải thích bối cảnh, triệu chứng hoặc nhu cầu thực tế. Nêu rõ bài viết dành cho ai và áp dụng trong trường hợp nào.

<Callout type="info" title="Kết quả sau bài viết">
  Người đọc sẽ biết cách hoàn thành mục tiêu chính và tự kiểm tra kết quả.
</Callout>

## Chuẩn bị

- Công cụ hoặc tài khoản cần có
- Phiên bản phần mềm đang sử dụng
- Kiến thức nền cần biết

## Các bước thực hiện

### Bước 1: Thiết lập ban đầu

Mô tả mục tiêu của bước này trước khi đưa lệnh hoặc mã nguồn.

<Terminal title="bash">

\`\`\`bash
# Thay lệnh mẫu bằng lệnh thực tế
echo "Bắt đầu thiết lập"
\`\`\`

</Terminal>

### Bước 2: Cấu hình chính

Giải thích từng thay đổi quan trọng và lý do cần cấu hình như vậy.

\`\`\`yaml title="config.yml" showLineNumbers
# Thay bằng cấu hình thực tế
enabled: true
\`\`\`

### Bước 3: Chạy và kiểm tra

Hướng dẫn cách chạy, kết quả mong đợi và dấu hiệu cho thấy cấu hình đã hoạt động.

## Lỗi thường gặp

<Callout type="warning" title="Lưu ý">
  Ghi lại lỗi phổ biến nhất, nguyên nhân và cách khắc phục nhanh.
</Callout>

## Checklist hoàn tất

- [ ] Chức năng chính hoạt động
- [ ] Không có lỗi trong log
- [ ] Đã kiểm tra bảo mật và quyền truy cập
- [ ] Đã sao lưu cấu hình cần thiết

## Kết luận

Tóm tắt kết quả, nhắc lại điểm quan trọng và gợi ý bước tiếp theo cho người đọc.`;

interface EditorState {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  category: Category;
  categories: string[];
  tags: string;
  cover: string;
  draft: boolean;
  featured: boolean;
  content: string;
}

const initialState: EditorState = {
  title: '',
  slug: '',
  description: '',
  publishedAt: new Date().toISOString().slice(0, 10),
  category: 'lap-trinh',
  categories: ['lap-trinh'],
  tags: '',
  cover: '',
  draft: false,
  featured: false,
  content: DEFAULT_POST_CONTENT,
};

export function PostEditor() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const contentFileRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const contentSectionRef = useRef<HTMLElement>(null);
  const contentSelectionRef = useRef({ start: 0, end: 0 });
  const [post, setPost] = useState<EditorState>(initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown' | 'preview'>('wysiwyg');
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isAddingAudio, setIsAddingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [audioDesc, setAudioDesc] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const contentAudioFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [availableCategories, setAvailableCategories] = useState<Record<string, string>>({
    ...CATEGORY_LABELS,
  });
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadCoverImage(formData);

      if (result.success && result.url) {
        update('cover', result.url);
        setNotice('Đã tải ảnh cover từ máy tính lên thành công.');
      } else {
        setError(result.error || 'Không thể tải ảnh lên.');
      }
    } catch {
      setError('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setIsUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  const rememberContentSelection = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    contentSelectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  };

  const insertAtContentSelection = (
    markdown: string,
    selection = { ...contentSelectionRef.current },
  ) => {
    let nextCursor = selection.start + markdown.length;

    setPost((current) => {
      const start = Math.min(selection.start, current.content.length);
      const end = Math.min(Math.max(selection.end, start), current.content.length);
      nextCursor = start + markdown.length;
      return {
        ...current,
        content: `${current.content.slice(0, start)}${markdown}${current.content.slice(end)}`,
      };
    });

    requestAnimationFrame(() => {
      const textarea = contentTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      contentSelectionRef.current = { start: nextCursor, end: nextCursor };
    });
  };

  const insertContentImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Tệp đã chọn không phải là ảnh.');
      return;
    }

    const selection = { ...contentSelectionRef.current };
    setIsUploadingContentImage(true);
    setError('');
    setNotice('');

    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadPostImage(formData);

      if (!result.success || !result.url) {
        setError(result.error || 'Không thể tải ảnh nội dung lên.');
        return;
      }

      const alt = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/[\[\]]/g, '')
        .trim();
      const markdown = `\n\n![${alt || 'Ảnh minh họa'}](${result.url})\n\n`;
      insertAtContentSelection(markdown, selection);

      setNotice(`Đã tải và chèn ảnh “${file.name}” vào nội dung.`);
    } catch {
      setError('Lỗi kết nối khi tải ảnh nội dung lên.');
    } finally {
      setIsUploadingContentImage(false);
      if (contentFileRef.current) contentFileRef.current.value = '';
    }
  };

  const handleContentImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await insertContentImage(file);
  };

  const handleInsertVideo = () => {
    const source = videoUrl.trim();
    const title = videoTitle.trim() || 'Video minh họa';

    if (!source) {
      setError('Vui lòng nhập đường dẫn video.');
      return;
    }

    if (!source.startsWith('/')) {
      try {
        const parsed = new URL(source);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
      } catch {
        setError('Link video không hợp lệ. Hãy dùng URL YouTube, Vimeo hoặc video trực tiếp.');
        return;
      }
    }

    const markdown = `\n\n<Video src={${JSON.stringify(source)}} title={${JSON.stringify(title)}} />\n\n`;
    insertAtContentSelection(markdown);
    setVideoUrl('');
    setVideoTitle('');
    setIsAddingVideo(false);
    setError('');
    setNotice(`Đã chèn video “${title}” vào nội dung.`);
  };

  const handleInsertAudio = () => {
    const source = audioUrl.trim();
    const title = audioTitle.trim() || 'Bản ghi âm / Podcast';
    const desc = audioDesc.trim();

    if (!source) {
      setError('Vui lòng nhập đường dẫn audio.');
      return;
    }

    let markdown = `\n\n<Audio src={${JSON.stringify(source)}} title={${JSON.stringify(title)}}`;
    if (desc) {
      markdown += ` description={${JSON.stringify(desc)}}`;
    }
    markdown += ' />\n\n';

    insertAtContentSelection(markdown);
    setAudioUrl('');
    setAudioTitle('');
    setAudioDesc('');
    setIsAddingAudio(false);
    setError('');
    setNotice(`Đã chèn audio “${title}” vào nội dung.`);
  };

  const handleContentAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    setError('');
    setNotice('');

    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadPostAudio(formData);

      if (!result.success || !result.url) {
        setError(result.error || 'Không thể tải file âm thanh lên.');
        return;
      }

      setAudioUrl(result.url);
      if (!audioTitle) {
        setAudioTitle(
          file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .trim(),
        );
      }
      setNotice(`Đã tải audio “${file.name}”. Hãy bấm “Chèn” để hoàn tất.`);
    } catch {
      setError('Lỗi kết nối khi tải audio lên.');
    } finally {
      setIsUploadingAudio(false);
      if (contentAudioFileRef.current) contentAudioFileRef.current.value = '';
    }
  };

  const update = <Key extends keyof EditorState>(key: Key, value: EditorState[Key]) => {
    setPost((current) => ({ ...current, [key]: value }));
  };

  const openPreview = () => {
    setEditorMode('preview');
    requestAnimationFrame(() => {
      contentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleCategory = (slug: string) => {
    setPost((current) => {
      const exists = current.categories.includes(slug);
      let newCategories: string[];
      if (exists) {
        newCategories = current.categories.filter((c) => c !== slug);
      } else {
        newCategories = [...current.categories, slug];
      }
      return {
        ...current,
        categories: newCategories,
        category: newCategories[0] || '',
      };
    });
  };

  const handleAddCustomCategory = () => {
    const slug = (newCatSlug || slugifyPostTitle(newCatLabel))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    const label = newCatLabel.trim() || getCategoryLabel(slug);
    if (!slug) return;

    setAvailableCategories((prev) => ({
      ...prev,
      [slug]: label,
    }));

    setPost((current) => {
      const newCategories = current.categories.includes(slug)
        ? current.categories
        : [...current.categories, slug];
      return {
        ...current,
        categories: newCategories,
        category: newCategories[0] || slug,
      };
    });

    setNewCatSlug('');
    setNewCatLabel('');
    setIsAddingCategory(false);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Hãy chọn file Markdown hoặc Word trước.');
      fileRef.current?.focus();
      return;
    }

    setError('');
    setNotice('');
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.set('file', selectedFile);
      const result = await importPostFile(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const cats =
        result.post.categories && result.post.categories.length > 0
          ? result.post.categories
          : result.post.category
            ? [result.post.category]
            : ['lap-trinh'];

      setAvailableCategories((prev) => {
        const updated = { ...prev };
        for (const c of cats) {
          if (!updated[c]) {
            updated[c] = getCategoryLabel(c);
          }
        }
        return updated;
      });

      setPost({
        ...result.post,
        categories: cats,
        category: cats[0] || 'lap-trinh',
      });
      setNotice(
        `Đã đọc ${selectedFile.name}. Hãy kiểm tra lại tiêu đề, mô tả, tag và nội dung trước khi lưu.`,
      );
    } catch {
      setError('Không thể tải file lên. Vui lòng thử lại.');
    } finally {
      setIsImporting(false);
    }
  };

  const savePost = async (draftOverride?: boolean) => {
    setError('');
    setNotice('');

    if (post.categories.length === 0) {
      setError('Vui lòng chọn ít nhất 1 chuyên mục cho bài viết.');
      return;
    }

    if (!post.title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }

    if (!post.content.trim() || post.content.trim().length < 20) {
      setError('Vui lòng nhập nội dung bài viết (tối thiểu 20 ký tự).');
      return;
    }

    const effectiveDraft = draftOverride !== undefined ? draftOverride : post.draft;
    setIsSaving(true);

    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(post)) {
        if (key === 'categories') {
          formData.set('categories', post.categories.join(','));
        } else if (key === 'draft') {
          formData.set('draft', String(effectiveDraft));
        } else {
          formData.set(key, String(value));
        }
      }

      const result = await createPost(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/admin/posts?created=${encodeURIComponent(result.slug)}`);
      router.refresh();
    } catch {
      setError('Không thể lưu bài viết. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await savePost();
  };

  return (
    <div className="space-y-6">
      <div className="border-border flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
            <Link
              href="/admin/posts"
              className="hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-3.5" /> Bài viết
            </Link>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="text-primary size-6" /> Tạo bài viết mới
          </h1>
          <p className="text-muted-foreground text-sm">
            Soạn trực tiếp hoặc nhập nội dung từ Markdown và Word.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={openPreview}>
            <Eye className="size-4" />
            Xem trước
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => savePost(true)}
          >
            <Save className="size-4" />
            Lưu nháp
          </Button>
          <Button
            type="button"
            variant="primary"
            className="bg-emerald-600 font-medium text-white hover:bg-emerald-700"
            disabled={isSaving}
            onClick={() => savePost(false)}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
            Xuất bản ngay
          </Button>
        </div>
      </div>

      <section className="border-primary/40 bg-primary/5 rounded-xl border border-dashed p-5">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <FileUp className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Nhập nội dung từ file</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Hỗ trợ .md, .markdown, .mdx và Word .docx, tối đa 5 MB. File chỉ điền dữ liệu vào
              trình soạn thảo, chưa tự xuất bản.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.mdx,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="bg-background file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImport}
                disabled={isImporting}
                className="shrink-0"
              >
                {isImporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {isImporting ? 'Đang đọc file…' : 'Nhập vào trình soạn thảo'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {notice}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="border-border bg-card rounded-xl border p-5 shadow-xs">
          <h2 className="mb-4 font-semibold">Thông tin bài viết</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium">
                Tiêu đề <span className="text-destructive">*</span>
              </label>
              <Input
                id="post-title"
                value={post.title}
                onChange={(event) => update('title', event.target.value)}
                maxLength={120}
                required
                placeholder="VD: Triển khai Next.js lên VPS với Docker"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="post-slug" className="mb-1.5 block text-sm font-medium">
                  Slug URL
                </label>
                <Input
                  id="post-slug"
                  value={post.slug}
                  onChange={(event) => update('slug', event.target.value)}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="Tự sinh từ tiêu đề nếu để trống"
                  className="font-mono"
                />
              </div>
              <div>
                <label htmlFor="post-date" className="mb-1.5 block text-sm font-medium">
                  Ngày đăng <span className="text-destructive">*</span>
                </label>
                <Input
                  id="post-date"
                  type="date"
                  value={post.publishedAt}
                  onChange={(event) => update('publishedAt', event.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="post-description" className="block text-sm font-medium">
                  Mô tả tóm tắt (SEO) <span className="text-destructive">*</span>
                </label>
                <span className="text-muted-foreground text-xs">
                  {post.description.length} ký tự
                </span>
              </div>
              <textarea
                id="post-description"
                value={post.description}
                onChange={(event) => update('description', event.target.value)}
                required
                rows={3}
                placeholder="Tóm tắt nội dung bài viết. (Gợi ý: ~150-160 ký tự đầu thường hiển thị trọn vẹn trên Google)."
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-lg border px-3 py-2.5 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  Chuyên mục <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    (Có thể chọn 1 hoặc nhiều • Đã chọn {post.categories.length})
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  <Plus className="size-3.5" />
                  {isAddingCategory ? 'Đóng form thêm' : 'Thêm chuyên mục mới'}
                </button>
              </div>

              {/* Form thêm chuyên mục mới nhanh */}
              {isAddingCategory && (
                <div className="border-primary/30 bg-primary/5 mb-3 space-y-2 rounded-lg border p-3">
                  <div className="text-primary text-xs font-semibold">Tạo chuyên mục mới</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Tên hiển thị (vd: Trí tuệ nhân tạo)"
                      value={newCatLabel}
                      onChange={(e) => {
                        setNewCatLabel(e.target.value);
                        if (!newCatSlug || newCatSlug === slugifyPostTitle(newCatLabel)) {
                          setNewCatSlug(slugifyPostTitle(e.target.value));
                        }
                      }}
                      className="bg-background h-8 text-xs"
                    />
                    <Input
                      placeholder="Slug (vd: ai-ml, devops...)"
                      value={newCatSlug}
                      onChange={(e) =>
                        setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      className="bg-background h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCatSlug('');
                        setNewCatLabel('');
                      }}
                      className="h-7 text-xs"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomCategory}
                      disabled={!newCatSlug.trim()}
                      className="h-7 text-xs"
                    >
                      Thêm & Chọn
                    </Button>
                  </div>
                </div>
              )}

              {/* Danh sách các chuyên mục dạng Chip / Tag đa chọn */}
              <div className="border-input bg-background/50 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg border p-3">
                {Object.entries(availableCategories).map(([slug, label]) => {
                  const isSelected = post.categories.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleCategory(slug)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/70 hover:text-foreground',
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-3.5 stroke-[2.5]" />
                      ) : (
                        <span className="size-3.5 rounded-full border border-current opacity-40" />
                      )}
                      <span>{label}</span>
                      <span
                        className={cn(
                          'font-mono text-[10px] opacity-70',
                          isSelected ? 'text-primary-foreground' : 'text-muted-foreground',
                        )}
                      >
                        ({slug})
                      </span>
                    </button>
                  );
                })}
              </div>
              {post.categories.length === 0 ? (
                <p className="text-destructive mt-1.5 text-xs">
                  Vui lòng chọn ít nhất 1 chuyên mục.
                </p>
              ) : (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Chuyên mục đầu tiên (
                  <strong>
                    {post.categories[0]
                      ? availableCategories[post.categories[0]] || post.categories[0]
                      : ''}
                  </strong>
                  ) sẽ là chuyên mục chính hiển thị trên URL và metadata.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="post-tags" className="mb-1.5 block text-sm font-medium">
                Tags <span className="text-destructive">*</span>
              </label>
              <Input
                id="post-tags"
                value={post.tags}
                onChange={(event) => update('tags', event.target.value)}
                required
                placeholder="nextjs, docker, vps (tối đa 6)"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="post-cover" className="block text-sm font-medium">
                  Ảnh cover bài viết
                </label>
                <span className="text-muted-foreground text-xs">
                  (Dán link Google/URL hoặc tải file từ máy tính)
                </span>
              </div>

              <div className="flex gap-2">
                <Input
                  id="post-cover"
                  value={post.cover}
                  onChange={(event) => update('cover', event.target.value)}
                  placeholder="https://... hoặc /images/posts/ten-anh.webp"
                  className="flex-1 font-mono text-xs sm:text-sm"
                />

                <input
                  type="file"
                  ref={coverFileRef}
                  onChange={handleCoverUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => coverFileRef.current?.click()}
                  loading={isUploadingCover}
                  loadingText="Đang tải..."
                  className="shrink-0 gap-1.5 text-xs"
                >
                  <Upload className="size-3.5" />
                  Tải ảnh từ máy
                </Button>
              </div>

              {/* Xem trước ảnh cover */}
              {post.cover && (
                <div className="border-border/80 bg-muted group relative mt-3 aspect-[16/9] max-w-sm overflow-hidden rounded-xl border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.cover}
                    alt="Xem trước ảnh cover"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => update('cover', '')}
                      className="bg-destructive text-destructive-foreground inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md transition hover:opacity-90"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="size-3.5" /> Xóa ảnh
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-border bg-muted/30 flex flex-wrap gap-5 rounded-lg border px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={post.featured}
                  onChange={(event) => update('featured', event.target.checked)}
                  className="accent-primary size-4"
                />
                Đánh dấu bài nổi bật
              </label>
            </div>
          </div>
        </section>

        <section
          ref={contentSectionRef}
          className="border-border bg-card scroll-mt-20 rounded-xl border p-5 shadow-xs"
        >
          {/* Header với Tabs chuyển đổi chế độ Word / Markdown / Xem trước */}
          <div className="border-border mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Nội dung bài viết</h2>
                <span className="text-muted-foreground text-xs">
                  ({post.content.trim().split(/\s+/).filter(Boolean).length} từ)
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {editorMode === 'wysiwyg'
                  ? 'Soạn thảo trực quan kiểu Word: định dạng chữ, màu sắc, canh lề, chèn ảnh, video, audio.'
                  : editorMode === 'markdown'
                    ? 'Soạn thảo mã nguồn Markdown / MDX: hỗ trợ thẻ Markdown và MDX components.'
                    : 'Xem bài viết ở chế độ chỉ đọc trước khi lưu hoặc xuất bản.'}
              </p>
            </div>

            <div className="border-border bg-muted/60 grid grid-cols-3 rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setEditorMode('wysiwyg')}
                className={cn(
                  'flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-all',
                  editorMode === 'wysiwyg'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <FileText className="text-primary size-3.5" />
                <span>Soạn thảo</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('markdown')}
                className={cn(
                  'flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-all',
                  editorMode === 'markdown'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Code className="size-3.5" />
                <span>Markdown</span>
              </button>
              <button
                type="button"
                onClick={openPreview}
                className={cn(
                  'flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-all',
                  editorMode === 'preview'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Eye className="text-primary size-3.5" />
                <span>Xem trước</span>
              </button>
            </div>
          </div>

          {/* CHẾ ĐỘ 1: VĂN BẢN TRỰC QUAN WORD (WYSIWYG) */}
          <div className={editorMode === 'wysiwyg' ? 'space-y-2' : 'hidden'}>
            <RichTextEditor
              value={post.content}
              onChange={(val) => update('content', val)}
              onError={(err) => setError(err)}
            />
          </div>

          {/* CHẾ ĐỘ 2: MÃ NGUỒN MARKDOWN / MDX */}
          <div className={editorMode === 'markdown' ? 'block' : 'hidden'}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Dùng ## cho đề mục, ``` cho code block và có thể dùng component MDX của blog.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  ref={contentFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif"
                  onChange={handleContentImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={isUploadingContentImage}
                  loadingText="Đang tải…"
                  onMouseDown={rememberContentSelection}
                  onClick={() => contentFileRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  Chèn ảnh
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={rememberContentSelection}
                  onClick={() => {
                    setIsAddingVideo((current) => !current);
                    setIsAddingAudio(false);
                  }}
                >
                  <VideoIcon className="size-4" />
                  Chèn video
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={rememberContentSelection}
                  onClick={() => {
                    setIsAddingAudio((current) => !current);
                    setIsAddingVideo(false);
                  }}
                >
                  <Headphones className="size-4" />
                  Chèn audio
                </Button>
              </div>
            </div>

            {/* Form chèn video cho Markdown mode */}
            {isAddingVideo && (
              <div className="border-border bg-muted/30 mb-3 rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Chèn video vào bài viết</h3>
                    <p className="text-muted-foreground text-xs">
                      Hỗ trợ YouTube, Vimeo, link MP4/WebM hoặc đường dẫn video nội bộ.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingVideo(false)}
                    className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    aria-label="Đóng phần chèn video"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)_auto]">
                  <Input
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleInsertVideo();
                      }
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                    className="font-mono text-xs"
                    autoFocus
                  />
                  <Input
                    value={videoTitle}
                    onChange={(event) => setVideoTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleInsertVideo();
                      }
                    }}
                    placeholder="Tiêu đề/chú thích video"
                  />
                  <Button type="button" size="sm" onClick={handleInsertVideo}>
                    <VideoIcon className="size-4" /> Chèn
                  </Button>
                </div>
              </div>
            )}

            {/* Form chèn audio cho Markdown mode */}
            {isAddingAudio && (
              <div className="border-border bg-muted/30 mb-3 rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Chèn audio / podcast vào bài viết</h3>
                    <p className="text-muted-foreground text-xs">
                      Tải tệp âm thanh từ máy tính hoặc nhập đường dẫn file audio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingAudio(false)}
                    className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    aria-label="Đóng phần chèn audio"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={audioUrl}
                      onChange={(event) => setAudioUrl(event.target.value)}
                      placeholder="/audio/... hoặc https://..."
                      className="flex-1 font-mono text-xs"
                    />
                    <input
                      ref={contentAudioFileRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a"
                      onChange={handleContentAudioUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isUploadingAudio}
                      onClick={() => contentAudioFileRef.current?.click()}
                      className="shrink-0"
                    >
                      <Upload className="size-3.5" /> Tải từ máy
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Input
                      value={audioTitle}
                      onChange={(event) => setAudioTitle(event.target.value)}
                      placeholder="Tiêu đề podcast / audio"
                      className="text-xs"
                    />
                    <Input
                      value={audioDesc}
                      onChange={(event) => setAudioDesc(event.target.value)}
                      placeholder="Mô tả audio (tùy chọn)"
                      className="text-xs"
                    />
                    <Button type="button" size="sm" onClick={handleInsertAudio}>
                      <Headphones className="size-4" /> Chèn
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-primary/20 bg-primary/5 text-muted-foreground mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
              <ImagePlus className="text-primary mt-0.5 size-4 shrink-0" />
              <span>
                Đặt con trỏ tại vị trí cần chèn rồi bấm <strong>Chèn ảnh</strong> hoặc{' '}
                <strong>Chèn video/audio</strong>. Bạn cũng có thể dán ảnh từ clipboard hoặc kéo ảnh
                thả trực tiếp vào ô nội dung.
              </span>
            </div>

            <textarea
              ref={contentTextareaRef}
              value={post.content}
              onChange={(event) => {
                update('content', event.target.value);
                rememberContentSelection();
              }}
              onSelect={rememberContentSelection}
              onClick={rememberContentSelection}
              onKeyUp={rememberContentSelection}
              onPaste={(event) => {
                const image = Array.from(event.clipboardData.files).find((file) =>
                  file.type.startsWith('image/'),
                );
                if (!image) return;
                event.preventDefault();
                rememberContentSelection();
                void insertContentImage(image);
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('Files')) event.preventDefault();
              }}
              onDrop={(event) => {
                const image = Array.from(event.dataTransfer.files).find((file) =>
                  file.type.startsWith('image/'),
                );
                if (!image) return;
                event.preventDefault();
                rememberContentSelection();
                void insertContentImage(image);
              }}
              rows={24}
              spellCheck
              placeholder={'Mở bài…\n\n## Bối cảnh\n\nNội dung bài viết…'}
              className={cn(
                'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[32rem] w-full resize-y rounded-lg border px-4 py-3 font-mono text-sm leading-6 focus-visible:ring-2 focus-visible:outline-none',
                isUploadingContentImage && 'border-primary/50',
              )}
            />
          </div>

          {/* CHẾ ĐỘ 3: XEM TRƯỚC BÀI VIẾT */}
          {editorMode === 'preview' && (
            <div className="bg-background border-border rounded-lg border px-4 py-8 sm:px-8 lg:px-12">
              <article className="mx-auto max-w-4xl">
                <header className="flex flex-col items-center text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {post.categories.map((category) => (
                      <span
                        key={category}
                        className="bg-secondary text-secondary-foreground rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase"
                      >
                        {availableCategories[category] || getCategoryLabel(category)}
                      </span>
                    ))}
                    {post.featured && (
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Bài viết nổi bật
                      </span>
                    )}
                  </div>

                  <h1
                    className={cn(
                      'mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl',
                      !post.title.trim() && 'text-muted-foreground',
                    )}
                  >
                    {post.title.trim() || 'Tiêu đề bài viết sẽ hiển thị tại đây'}
                  </h1>

                  <p
                    className={cn(
                      'mt-4 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg',
                      post.description.trim()
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/60',
                    )}
                  >
                    {post.description.trim() || 'Mô tả tóm tắt của bài viết sẽ hiển thị tại đây.'}
                  </p>

                  <div className="text-muted-foreground mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span>
                      {post.publishedAt
                        ? new Date(`${post.publishedAt}T00:00:00`).toLocaleDateString('vi-VN')
                        : 'Chưa chọn ngày đăng'}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{post.content.trim().split(/\s+/).filter(Boolean).length} từ</span>
                  </div>

                  {post.tags.trim() && (
                    <div className="border-border/60 mt-5 flex w-full flex-wrap items-center justify-center gap-2 border-y py-3">
                      {post.tags
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="border-border text-muted-foreground rounded-md border px-2 py-0.5 text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}

                  {post.cover && (
                    <figure className="border-border bg-muted relative mt-8 aspect-video w-full overflow-hidden rounded-lg border shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.cover}
                        alt={post.title || 'Ảnh cover bài viết'}
                        className="size-full object-cover"
                      />
                    </figure>
                  )}
                </header>

                <div className="border-border/60 mx-auto mt-10 max-w-3xl border-t pt-8">
                  <RichTextEditor
                    readOnly
                    value={post.content}
                    onChange={() => undefined}
                    onError={(err) => setError(err)}
                  />
                </div>
              </article>
            </div>
          )}
        </section>

        <div className="border-border bg-background/95 sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-xl border p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {post.draft
              ? 'Trạng thái hiện tại: Bản nháp (chỉ hiển thị trong quản trị).'
              : 'Trạng thái hiện tại: Xuất bản công khai lên website.'}
          </p>
          <div className="flex gap-2">
            <Link
              href="/admin/posts"
              className="border-border hover:bg-muted inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium"
            >
              Hủy
            </Link>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => savePost(true)}
            >
              <Save className="size-4" />
              Lưu bản nháp
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-emerald-600 font-medium text-white hover:bg-emerald-700"
              disabled={isSaving}
              onClick={() => savePost(false)}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Globe className="size-4" />
              )}
              Xuất bản ngay
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
