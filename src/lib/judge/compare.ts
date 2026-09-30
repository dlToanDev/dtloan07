/** Chuẩn hóa output để so: bỏ \r, khoảng trắng cuối mỗi dòng và các dòng trống ở cuối. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
