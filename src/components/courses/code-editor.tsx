'use client';

import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { useTheme } from 'next-themes';
import type { LanguageKey } from '@/lib/judge/languages';

const EXTENSIONS: Record<LanguageKey, () => ReturnType<typeof cpp>> = {
  cpp,
  c: cpp,
  python,
  javascript: () => javascript(),
  java,
};

/** Trình soạn code (CodeMirror): tô màu cú pháp, tự thụt lề, theo giao diện sáng / tối. */
export function CodeEditor({
  value,
  onChange,
  language,
  minHeight = '280px',
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  language: LanguageKey;
  minHeight?: string;
  readOnly?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      extensions={[EXTENSIONS[language]()]}
      minHeight={minHeight}
      basicSetup={{ tabSize: 4, foldGutter: false, highlightActiveLine: !readOnly }}
      className="border-border overflow-hidden rounded-lg border text-sm [&_.cm-editor]:outline-none"
    />
  );
}
