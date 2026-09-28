import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isUserPro } from '@/lib/membership-db';
import { CommunityPostForm } from '@/components/community/community-post-form';

export const dynamic = 'force-dynamic';

export default async function NewCommunityPostPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const isPro = await isUserPro(userId);
  const isAdmin = session?.user?.role === 'ADMIN';

  if (!isPro && !isAdmin) redirect('/pro');
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/account/posts" className="text-muted-foreground text-sm hover:underline">
          ← Bài viết của tôi
        </Link>
        <h2 className="mt-1 text-xl font-bold">Viết bài mới</h2>
      </div>
      <CommunityPostForm />
    </div>
  );
}
