import { siteConfig } from '@/config/site';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold tracking-tight">{siteConfig.name}</h1>
      <p className="text-base opacity-70">{siteConfig.description}</p>
      <p className="font-mono text-sm opacity-50">
        Phase 0 hoàn tất — bước tiếp theo: P1 Design System (xem docs/PLAN.md).
      </p>
    </main>
  );
}
