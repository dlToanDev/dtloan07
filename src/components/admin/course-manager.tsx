'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Course, CourseStatus } from '@prisma/client';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
} from '@/server/actions/course';
import { Plus, Edit2, Trash2, GraduationCap, Video, ExternalLink, Loader2 } from 'lucide-react';

interface CourseManagerProps {
  initialCourses: Course[];
}

export function CourseManager({ initialCourses }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceVnd, setPriceVnd] = useState(0);
  const [compareAtVnd, setCompareAtVnd] = useState<number | ''>('');
  const [level, setLevel] = useState('Cơ bản đến Nâng cao');
  const [duration, setDuration] = useState('');
  const [learnUrl, setLearnUrl] = useState('');
  const [status, setStatus] = useState<CourseStatus>('DRAFT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setPriceVnd(0);
    setCompareAtVnd('');
    setLevel('Cơ bản đến Nâng cao');
    setDuration('');
    setLearnUrl('');
    setStatus('DRAFT');
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditingCourse(c);
    setTitle(c.title);
    setSlug(c.slug);
    setDescription(c.description);
    setPriceVnd(c.priceVnd);
    setCompareAtVnd(c.compareAtVnd ?? '');
    setLevel(c.level);
    setDuration(c.duration || '');
    setLearnUrl(c.learnUrl || '');
    setStatus(c.status);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('description', description);
    formData.append('priceVnd', priceVnd.toString());
    formData.append('compareAtVnd', compareAtVnd.toString());
    formData.append('level', level);
    formData.append('duration', duration);
    formData.append('learnUrl', learnUrl);
    formData.append('status', status);

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
        setEditingCourse(null);
      } else {
        await createCourse(formData);
        setIsCreateOpen(false);
      }
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu khóa học.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa khóa học "${name}"?`)) return;
    await deleteCourse(id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggle = async (c: Course) => {
    await toggleCourseStatus(c.id, c.status);
    const nextStatus: CourseStatus = c.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    setCourses((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, status: nextStatus } : item)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground font-semibold">Danh mục Khóa học & Lộ trình đào tạo</h3>
          <p className="text-muted-foreground text-xs">
            Quản lý các khóa học lập trình, quản trị server, video bài giảng và link học tập.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Thêm Khóa Học Mới
        </Button>
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3">Khóa học</th>
                <th className="px-4 py-3">Trình độ & Thời lượng</th>
                <th className="px-4 py-3 text-right">Học phí</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Link học</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-10 text-center">
                    Chưa có khóa học nào. Hãy bấm &quot;Thêm Khóa Học Mới&quot; để tạo.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40 transition">
                    <td className="max-w-sm px-4 py-3">
                      <div className="text-foreground flex items-center gap-2 font-semibold">
                        <GraduationCap className="text-primary size-4 shrink-0" />
                        <span>{c.title}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                        /courses/{c.slug}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium">{c.level}</div>
                      <div className="text-muted-foreground">{c.duration || 'Lộ trình chuẩn'}</div>
                    </td>

                    <td className="px-4 py-3 text-right font-bold">
                      {c.priceVnd === 0 ? (
                        <span className="text-emerald-500">Miễn phí</span>
                      ) : (
                        <span>{c.priceVnd.toLocaleString('vi-VN')} đ</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(c)}
                        className={`rounded border px-2.5 py-0.5 text-xs transition ${
                          c.status === 'ACTIVE'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {c.status}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {c.learnUrl ? (
                        <a
                          href={c.learnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                        >
                          <Video className="size-3.5" /> Mở link <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs italic">Chưa gắn</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          className="size-8 p-0"
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id, c.title)}
                          className="size-8 p-0 text-rose-500 hover:bg-rose-500/10"
                          title="Xóa"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Sửa Khóa học */}
      <Dialog
        open={isCreateOpen || editingCourse !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCourse(null);
        }}
        title={editingCourse ? `Chỉnh sửa: ${editingCourse.title}` : 'Thêm Khóa Học Mới'}
        description="Thông tin khóa học, giá bán và đường dẫn học tập"
        className="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold">Tiêu đề khóa học *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Khóa học DevOps & Quản trị VPS Linux từ số 0"
              required
              className="mt-1 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Slug đường dẫn</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="devops-linux (tự sinh nếu trống)"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Trình độ</label>
              <Input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="VD: Cơ bản đến Nâng cao"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Học phí (VND) - 0 = Miễn phí</label>
              <Input
                type="number"
                value={priceVnd}
                onChange={(e) => setPriceVnd(Number(e.target.value))}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Thời lượng</label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="VD: 15 giờ video, 30 bài học"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">
              Link học / Video / Tài liệu (Unlisted Youtube, Drive, LMS)
            </label>
            <Input
              value={learnUrl}
              onChange={(e) => setLearnUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold">Mô tả khóa học</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tóm tắt nội dung và kết quả đạt được sau khóa học..."
              className="border-border bg-background mt-1 w-full rounded-md border p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CourseStatus)}
              className="border-border bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="DRAFT">DRAFT (Bản nháp)</option>
              <option value="ACTIVE">ACTIVE (Đang mở bán/học)</option>
              <option value="UPCOMING">UPCOMING (Sắp ra mắt)</option>
              <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
            </select>
          </div>

          <div className="border-border flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingCourse(null);
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                'Lưu Khóa Học'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
