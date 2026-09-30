import { PostEditor } from '@/components/admin/post-editor';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo bài viết mới - Admin',
};

export default function NewPostPage() {
  return <PostEditor />;
}
