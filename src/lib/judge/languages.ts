/**
 * Ngôn ngữ chấm được. Khóa (cpp, python…) lưu trong Exercise.languages và Submission.language.
 * `extraTimeMs`: thời gian khởi động cộng thêm vào giới hạn (Piston đo thời gian thực, gồm cả lúc
 * khởi động trình thông dịch / máy ảo Java) — giống cách Codeforces nới giờ cho Java, Python.
 */
export const LANGUAGES = {
  cpp: { label: 'C++', piston: 'c++', file: 'main.cpp', extraTimeMs: 0 },
  c: { label: 'C', piston: 'c', file: 'main.c', extraTimeMs: 0 },
  python: { label: 'Python 3', piston: 'python', file: 'main.py', extraTimeMs: 500 },
  javascript: {
    label: 'JavaScript (Node)',
    piston: 'javascript',
    file: 'main.js',
    extraTimeMs: 500,
  },
  // Java bắt buộc lớp public tên Main nằm trong Main.java.
  // Java biên dịch ngay lúc chạy (~2–3 s CPU) nên được cộng nhiều thời gian khởi động hơn.
  java: { label: 'Java', piston: 'java', file: 'Main.java', extraTimeMs: 3000 },
} as const;

export type LanguageKey = keyof typeof LANGUAGES;

export const LANGUAGE_KEYS = Object.keys(LANGUAGES) as LanguageKey[];

export function isLanguageKey(value: string): value is LanguageKey {
  return Object.hasOwn(LANGUAGES, value);
}

/** Code mặc định khi bài tập chưa có code mẫu cho ngôn ngữ đó. */
export const DEFAULT_STARTER: Record<LanguageKey, string> = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  python: '# Đọc input: input()\n',
  javascript:
    "const input = require('fs').readFileSync(0, 'utf8');\n// const [a, b] = input.trim().split(/\\s+/).map(Number);\n",
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
};

/** Giới hạn thời gian admin đặt được cho mỗi test. */
export const MAX_TIME_LIMIT_MS = 3000;
/** Trần gửi sang Piston — khớp PISTON_RUN_TIMEOUT / PISTON_RUN_CPU_TIME trong deploy/piston. */
export const MAX_RUN_TIMEOUT_MS = 10_000;
export const MAX_RUN_CPU_MS = 10_000;
export const MAX_MEMORY_LIMIT_MB = 512;
export const MAX_CODE_BYTES = 64 * 1024;
