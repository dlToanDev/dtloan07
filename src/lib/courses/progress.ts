export type LessonState = 'completed' | 'available' | 'locked';

/**
 * Trạng thái từng bài theo thứ tự: bài đầu luôn mở; bài sau chỉ mở khi bài ngay trước đã hoàn
 * thành. `bypass` (admin) mở tất cả nhưng vẫn giữ dấu "đã hoàn thành".
 */
export function lessonStates(
  lessonIds: string[],
  completed: ReadonlySet<string>,
  bypass = false,
): Map<string, LessonState> {
  const states = new Map<string, LessonState>();
  lessonIds.forEach((id, index) => {
    if (completed.has(id)) states.set(id, 'completed');
    else if (bypass || index === 0 || completed.has(lessonIds[index - 1]!))
      states.set(id, 'available');
    else states.set(id, 'locked');
  });
  return states;
}

/** Bài hoàn thành khi mọi bài tập đều từng có bài nộp đúng. Bài không có bài tập: false. */
export function allExercisesSolved(exerciseIds: string[], solved: ReadonlySet<string>): boolean {
  return exerciseIds.length > 0 && exerciseIds.every((id) => solved.has(id));
}

/** Bài tiếp theo nên học: bài mở đầu tiên chưa hoàn thành, hoặc bài cuối nếu đã xong hết. */
export function nextLessonId(
  lessonIds: string[],
  states: Map<string, LessonState>,
): string | undefined {
  return lessonIds.find((id) => states.get(id) === 'available') ?? lessonIds[lessonIds.length - 1];
}
