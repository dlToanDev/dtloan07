import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getSignedDownloadUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    licenseId: string;
  }>;
}

/**
 * GET /api/download/[licenseId]
 * Tải file sản phẩm số bảo mật với các lớp xác thực:
 * 1. Kiểm tra quyền sở hữu (Session đăng nhập hoặc Guest Token/Key/Email)
 * 2. Kiểm tra trạng thái thu hồi (revokedAt)
 * 3. Kiểm tra ngày hết hạn (expiresAt)
 * 4. Kiểm tra giới hạn lượt tải (downloadCount < maxDownloads)
 * 5. Ghi nhận nhật ký tải (IP, User-Agent) + tăng downloadCount
 * 6. Sinh Cloudflare R2 Signed URL (TTL 15 phút) và chuyển hướng
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { licenseId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const providedKey = searchParams.get('key');
    const providedEmail = searchParams.get('email');
    const requestedFileId = searchParams.get('fileId');

    // 1. Lấy thông tin phiên đăng nhập
    const session = await auth();
    const currentUserId = session?.user?.id;
    const currentUserEmail = session?.user?.email?.toLowerCase();
    const isAdmin = session?.user?.role === 'ADMIN';

    // 2. Tìm kiếm thông tin bản quyền và file đính kèm
    const license = await db.license.findUnique({
      where: { id: licenseId },
      include: {
        product: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'Không tìm thấy giấy phép bản quyền hợp lệ.' },
        { status: 404 },
      );
    }

    // 3. XÁC THỰC QUYỀN TRUY CẬP (Authorization check - Chống User A truy cập License User B)
    let isAuthorized = false;

    if (isAdmin) {
      isAuthorized = true;
    } else if (currentUserId && license.userId && currentUserId === license.userId) {
      isAuthorized = true;
    } else if (currentUserEmail && currentUserEmail === license.email.toLowerCase()) {
      isAuthorized = true;
    } else if (providedKey && providedKey.trim().toUpperCase() === license.key.toUpperCase()) {
      isAuthorized = true;
    } else if (
      providedEmail &&
      providedEmail.trim().toLowerCase() === license.email.toLowerCase()
    ) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error:
            'Bạn không có quyền tải tệp từ giấy phép này. Vui lòng đăng nhập đúng tài khoản hoặc cung cấp email/mã bản quyền hợp lệ.',
        },
        { status: 403 },
      );
    }

    // 4. KIỂM TRA THU HỒI BẢN QUYỀN (Refund / Chargeback)
    if (license.revokedAt) {
      return NextResponse.json(
        {
          error: `Giấy phép bản quyền này đã bị thu hồi vào ngày ${new Date(license.revokedAt).toLocaleDateString('vi-VN')}. Vui lòng liên hệ hỗ trợ nếu có nhầm lẫn.`,
        },
        { status: 403 },
      );
    }

    // 5. KIỂM TRA HẾT HẠN
    if (license.expiresAt && new Date() > license.expiresAt) {
      return NextResponse.json(
        {
          error: `Giấy phép này đã hết hạn vào ngày ${new Date(license.expiresAt).toLocaleDateString('vi-VN')}.`,
        },
        { status: 403 },
      );
    }

    // 6. KIỂM TRA GIỚI HẠN SỐ LƯỢT TẢI
    if (license.downloadCount >= license.maxDownloads) {
      return NextResponse.json(
        {
          error: `Bạn đã sử dụng hết ${license.maxDownloads}/${license.maxDownloads} lượt tải cho phép. Vui lòng liên hệ hỗ trợ để được cấp thêm.`,
        },
        { status: 403 },
      );
    }

    // 7. XÁC ĐỊNH FILE SẢN PHẨM CẦN TẢI
    const availableFiles = license.product.files;
    if (!availableFiles || availableFiles.length === 0) {
      return NextResponse.json(
        { error: 'Sản phẩm này hiện chưa có file đính kèm để tải về.' },
        { status: 404 },
      );
    }

    const targetFile = requestedFileId
      ? availableFiles.find((f) => f.id === requestedFileId) || availableFiles[0]
      : availableFiles[0];

    if (!targetFile) {
      return NextResponse.json(
        { error: 'Không tìm thấy tệp đính kèm tương ứng.' },
        { status: 404 },
      );
    }

    // 8. GHI NHẬN NHẬT KÝ TẢI VÀ TĂNG DOWNLOAD COUNT
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp =
      forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    await db.$transaction([
      db.license.update({
        where: { id: license.id },
        data: { downloadCount: { increment: 1 } },
      }),
      db.downloadLog.create({
        data: {
          licenseId: license.id,
          ip: clientIp,
          userAgent: userAgent.slice(0, 500),
        },
      }),
    ]);

    // 9. TẠO SIGNED URL VỚI THỜI HẠN 15 PHÚT (TTL 900 giây)
    const downloadFilename = `${license.product.slug}-v${targetFile.version || license.product.version || '1.0.0'}.zip`;
    const signedUrl = await getSignedDownloadUrl({
      storageKey: targetFile.storageKey,
      filename: downloadFilename,
      expiresInSeconds: 900, // 15 phút
    });

    // Nếu gọi bằng AJAX/API JSON
    if (req.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({
        success: true,
        downloadUrl: signedUrl,
        remainingDownloads: license.maxDownloads - (license.downloadCount + 1),
        expiresInSeconds: 900,
      });
    }

    // Mặc định chuyển hướng 302 trực tiếp sang signed URL tải file
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (error) {
    console.error('Lỗi khi tạo liên kết tải file:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ trong quá trình cấp liên kết tải.' },
      { status: 500 },
    );
  }
}
