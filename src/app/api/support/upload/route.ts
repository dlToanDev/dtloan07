import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rateLimit = checkRateLimit(`upload-support:${ip}`, 10, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Bạn đã tải lên quá nhiều tệp. Vui lòng thử lại sau 1 phút.' },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy file tải lên.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Chỉ chấp nhận file hình ảnh an toàn (PNG, JPG, WEBP, GIF).' },
        { status: 400 },
      );
    }

    // Giới hạn 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Kích thước ảnh tối đa là 5MB.' },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Thư mục lưu trữ công khai
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'support');
    await fs.mkdir(uploadDir, { recursive: true });

    const rawExt = path.extname(file.name || '').toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.png';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const filename = `support_${Date.now()}_${randomHex}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/support/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Lỗi khi tải ảnh hỗ trợ:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi tải ảnh.' },
      { status: 500 },
    );
  }
}
