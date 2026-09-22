'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CourseStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

export async function createCourse(formData: FormData) {
  await requireAdmin();

  const title = formData.get('title') as string;
  let slug = formData.get('slug') as string;
  const description = formData.get('description') as string;
  const priceVnd = parseInt((formData.get('priceVnd') as string) || '0', 10);
  const compareAtVndRaw = formData.get('compareAtVnd') as string;
  const compareAtVnd = compareAtVndRaw ? parseInt(compareAtVndRaw, 10) : null;
  const level = (formData.get('level') as string) || 'Cơ bản đến Nâng cao';
  const duration = (formData.get('duration') as string) || null;
  const learnUrl = (formData.get('learnUrl') as string) || null;
  const status = (formData.get('status') as CourseStatus) || 'DRAFT';

  if (!title) {
    throw new Error('Tiêu đề khóa học là bắt buộc.');
  }

  if (!slug) {
    slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  await db.course.create({
    data: {
      title,
      slug,
      description: description || '',
      priceVnd,
      compareAtVnd,
      level,
      duration,
      learnUrl,
      status,
    },
  });

  revalidatePath('/admin/courses');
}

export async function updateCourse(id: string, formData: FormData) {
  await requireAdmin();

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;
  const priceVnd = parseInt((formData.get('priceVnd') as string) || '0', 10);
  const compareAtVndRaw = formData.get('compareAtVnd') as string;
  const compareAtVnd = compareAtVndRaw ? parseInt(compareAtVndRaw, 10) : null;
  const level = (formData.get('level') as string) || 'Cơ bản đến Nâng cao';
  const duration = (formData.get('duration') as string) || null;
  const learnUrl = (formData.get('learnUrl') as string) || null;
  const status = (formData.get('status') as CourseStatus) || 'DRAFT';

  await db.course.update({
    where: { id },
    data: {
      title,
      slug,
      description: description || '',
      priceVnd,
      compareAtVnd,
      level,
      duration,
      learnUrl,
      status,
    },
  });

  revalidatePath('/admin/courses');
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  await db.course.delete({ where: { id } });
  revalidatePath('/admin/courses');
}

export async function toggleCourseStatus(id: string, currentStatus: CourseStatus) {
  await requireAdmin();
  const nextStatus: CourseStatus = currentStatus === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
  await db.course.update({
    where: { id },
    data: { status: nextStatus },
  });
  revalidatePath('/admin/courses');
}
