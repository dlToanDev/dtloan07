import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  getAdminPracticeBankList,
  getLearningMaterialsBank,
  getQuizQuestionBank,
} from '@/server/actions/practice';
import { AdminPracticeManager } from '@/components/admin/practice/admin-practice-manager';

export const metadata: Metadata = { title: 'Quản lý Kho Bài Tập & Đề Thi - Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminPracticePage() {
  const [exercises, materials, bankQuestions] = await Promise.all([
    getAdminPracticeBankList(),
    getLearningMaterialsBank(),
    getQuizQuestionBank(),
  ]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/courses"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition"
            >
              <ArrowLeft className="size-3.5" /> Khóa học
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-foreground text-xs font-semibold">Kho bài tập luyện đề</span>
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Quản lý Kho Bài Tập, Ngữ Liệu & Đề Thi
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Quản lý đề thi, kho học liệu đa phương tiện (âm thanh, video, bài đọc) và ngân hàng câu
            hỏi trắc nghiệm dùng chung.
          </p>
        </div>
      </div>

      <AdminPracticeManager
        initialExercises={exercises}
        materials={materials}
        bankQuestions={bankQuestions}
      />
    </div>
  );
}
