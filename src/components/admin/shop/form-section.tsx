import type { ReactNode } from 'react';

/** Một thẻ nội dung trong form sản phẩm: tiêu đề, một dòng hướng dẫn và các trường. */
export function FormSection({
  title,
  hint,
  id,
  children,
}: {
  title: string;
  hint?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-border bg-card scroll-mt-24 rounded-xl border p-5">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-muted-foreground mt-0.5 text-sm">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}
