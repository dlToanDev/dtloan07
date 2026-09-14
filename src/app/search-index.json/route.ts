import { getSearchIndex } from '@/lib/mdx';

/**
 * Index tìm kiếm sinh lúc build, client tải một lần rồi search hoàn toàn
 * phía trình duyệt — không cần server, không tốn request mỗi lần gõ.
 */
export const dynamic = 'force-static';

export async function GET() {
  const index = await getSearchIndex();

  return Response.json(index, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
