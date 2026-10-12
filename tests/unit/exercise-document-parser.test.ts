import { describe, it, expect } from 'vitest';
import { parseExerciseDocument } from '@/lib/courses/exercise-document-parser';

describe('Bộ phân tích đề bài từ tài liệu Word / MDX (Exercise Document Parser)', () => {
  it('1. Phân tích đề thi Trắc nghiệm với Đoạn văn, Audio, Video và Đáp án', () => {
    const rawDoc = `
# Đề kiểm tra tiếng Anh chuyên ngành DevOps
Chủ đề: Tiếng Anh Chuyên Ngành
Độ khó: TRUNG_BÌNH
Audio: https://example.com/audio/devops-listen.mp3
Video: https://www.youtube.com/watch?v=demo1234567

### Đoạn văn đọc hiểu
Kubernetes is an open-source container orchestration system for automating software deployment, scaling, and management. Google originally designed Kubernetes, but the Cloud Native Computing Foundation now maintains the project.

Câu 1: Kubernetes ban đầu được phát triển bởi tổ chức nào?
A. Microsoft
B. Google*
C. Amazon Web Services
D. Apple
Giải thích: Đoạn văn nêu rõ "Google originally designed Kubernetes".

Câu 2: Dự án Kubernetes hiện do đơn vị nào duy trì?
[ ] A. Docker Inc
[x] B. Cloud Native Computing Foundation
[ ] C. Apache Software Foundation
[ ] D. Linux Foundation
Giải thích: "the Cloud Native Computing Foundation now maintains the project".
`;

    const parsed = parseExerciseDocument(rawDoc, 'test.docx');

    expect(parsed.type).toBe('QUIZ');
    expect(parsed.title).toBe('Đề kiểm tra tiếng Anh chuyên ngành DevOps');
    expect(parsed.category).toBe('Tiếng Anh Chuyên Ngành');
    expect(parsed.difficulty).toBe('MEDIUM');
    expect(parsed.audioUrl).toBe('https://example.com/audio/devops-listen.mp3');
    expect(parsed.videoUrl).toBe('https://www.youtube.com/watch?v=demo1234567');
    expect(parsed.passage).toContain('Kubernetes is an open-source');

    expect(parsed.questions).toHaveLength(2);

    // Câu 1
    const q1 = parsed.questions[0]!;
    expect(q1.prompt).toContain('Kubernetes ban đầu được phát triển bởi tổ chức nào?');
    expect(q1.options).toHaveLength(4);
    const correct1 = q1.options?.find((o) => o.isCorrect);
    expect(correct1?.text).toBe('Google');
    expect(q1.explanation).toContain('Google originally designed Kubernetes');

    // Câu 2
    const q2 = parsed.questions[1]!;
    expect(q2.prompt).toContain('Dự án Kubernetes hiện do đơn vị nào duy trì?');
    expect(q2.options).toHaveLength(4);
    const correct2 = q2.options?.find((o) => o.isCorrect);
    expect(correct2?.text).toBe('Cloud Native Computing Foundation');
  });

  it('2. Phân tích đề Lập trình với Starter Code, Test Cases và Video hướng dẫn', () => {
    const rawDoc = `
---
title: "Tìm số nguyên tố lớn nhất nhỏ hơn N"
category: "Thuật toán cơ bản"
difficulty: "EASY"
type: "CODE"
videoUrl: "https://youtube.com/watch?v=primes"
---

### Đề bài
Cho số nguyên dương $N$. Hãy tìm số nguyên tố lớn nhất nhỏ hơn hoặc bằng $N$.

### Starter Code
\`\`\`python
import sys

def max_prime(n: int) -> int:
    # Viết code tại đây
    pass
\`\`\`

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
\`\`\`

### Test case 1 (Mẫu)
Input:
10
Output:
7

### Test case 2 (Mẫu)
Input:
20
Output:
19

### Test case 3
Input:
2
Output:
2
`;

    const parsed = parseExerciseDocument(rawDoc, 'prime.md');

    expect(parsed.type).toBe('CODE');
    expect(parsed.title).toBe('Tìm số nguyên tố lớn nhất nhỏ hơn N');
    expect(parsed.category).toBe('Thuật toán cơ bản');
    expect(parsed.difficulty).toBe('EASY');
    expect(parsed.videoUrl).toBe('https://youtube.com/watch?v=primes');

    expect(parsed.starterCode.python).toContain('def max_prime(n: int) -> int:');
    expect(parsed.starterCode.cpp).toContain('#include <iostream>');
    expect(parsed.languages).toContain('python');
    expect(parsed.languages).toContain('cpp');

    expect(parsed.testCases).toHaveLength(3);
    expect(parsed.testCases[0]?.input).toBe('10');
    expect(parsed.testCases[0]?.expectedOutput).toBe('7');
    expect(parsed.testCases[0]?.isSample).toBe(true);

    expect(parsed.testCases[1]?.input).toBe('20');
    expect(parsed.testCases[1]?.expectedOutput).toBe('19');

    expect(parsed.testCases[2]?.input).toBe('2');
    expect(parsed.testCases[2]?.expectedOutput).toBe('2');
  });

  it('3. Tự động nhận diện đề trắc nghiệm khi có "Đáp án: C"', () => {
    const rawDoc = `
Tiêu đề: Luyện đề Trắc nghiệm Kiến trúc Hệ thống
Mức độ: Nâng cao

Câu 1: CAP theorem khẳng định một hệ thống phân tán chỉ có thể đảm bảo tối đa mấy yếu tố cùng lúc?
A. 1 yếu tố
B. 2 yếu tố
C. 3 yếu tố
D. Vô số
Đáp án: B
Giải thích: Hệ thống phân tán chỉ có thể chọn 2 trong 3: Consistency, Availability, Partition tolerance.
`;

    const parsed = parseExerciseDocument(rawDoc);
    expect(parsed.type).toBe('QUIZ');
    expect(parsed.title).toBe('Luyện đề Trắc nghiệm Kiến trúc Hệ thống');
    expect(parsed.difficulty).toBe('HARD');
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0]?.options?.find((o) => o.isCorrect)?.text).toBe('2 yếu tố');
  });
});
