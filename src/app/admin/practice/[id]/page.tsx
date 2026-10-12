import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getPracticeExerciseForEdit,
  getQuizQuestionBank,
  getLearningMaterialsBank,
} from '@/server/actions/practice';
import { PracticeExerciseEditor } from '@/components/admin/practice/practice-exercise-editor';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const exercise = await getPracticeExerciseForEdit(id);
  if (!exercise) return { title: 'Không tìm thấy bài tập - Admin' };
  return {
    title: `Soạn & Chỉnh sửa: ${exercise.title} - Admin`,
  };
}

export default async function AdminPracticeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exercise, bankQuestions, materials] = await Promise.all([
    getPracticeExerciseForEdit(id),
    getQuizQuestionBank(id),
    getLearningMaterialsBank(),
  ]);

  if (!exercise) {
    notFound();
  }

  return (
    <PracticeExerciseEditor
      initial={exercise}
      bankQuestions={bankQuestions}
      materials={materials}
    />
  );
}
