import { Container } from '@/components/layout/container';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { getPracticeExercises } from '@/server/actions/practice';
import { getViewer } from '@/lib/courses/access';
import { PracticeFilterList } from '@/components/courses/practice-filter-list';
import Link from 'next/link';
import { Sparkles, Settings, ArrowLeft, BookOpen } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Kho Luyện Đề & Bài Tập Thực Hành Miễn Phí',
  description:
    'Luyện tập lập trình trực tuyến và giải đề trắc nghiệm (TOEIC, TOPIK, Thuật toán) với đầy đủ kho học liệu đa phương tiện gồm âm thanh, video và đoạn văn ngữ liệu. 100% miễn phí cho tất cả khách và học viên.',
  pathname: '/courses/practice',
});

export const revalidate = 60;

export default async function PracticeHubPage() {
  const [exercises, viewer] = await Promise.all([getPracticeExercises(), getViewer()]);

  return (
    <Container className="space-y-8 py-8 sm:py-10">
      {/* HEADER HERO */}
      <div className="via-background relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-sky-500/10 p-6 shadow-xs sm:p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/courses"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Quay lại Khóa học</span>
          </Link>

          {viewer?.isAdmin && (
            <Link
              href="/admin/practice"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-500/20 dark:text-indigo-400"
            >
              <Settings className="size-3.5" />
              <span>Quản lý kho bài tập (Admin)</span>
            </Link>
          )}
        </div>

        <div className="mt-4 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="size-3.5" />
            <span>Kho Học Liệu & Bài Tập Thực Hành 100% Miễn Phí</span>
          </div>

          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            Luyện Đề & Thực Hành Trực Tuyến
          </h1>

          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm md:text-base">
            Hệ thống bài tập lập trình (chấm test cases tự động) và đề thi trắc nghiệm kèm{' '}
            <strong className="text-foreground font-semibold">kho học liệu đa phương tiện</strong>{' '}
            bao gồm đoạn văn bản đọc hiểu, tệp âm thanh nghe và video hướng dẫn trực quan. Bất kỳ ai
            cũng có thể vào làm bài và kiểm tra kết quả ngay lập tức!
          </p>
        </div>
      </div>

      {/* DANH SÁCH & BỘ LỌC BÀI TẬP */}
      <PracticeFilterList initialExercises={exercises} isAdmin={viewer?.isAdmin} />
    </Container>
  );
}
