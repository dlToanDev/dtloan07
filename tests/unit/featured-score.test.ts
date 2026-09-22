import { describe, expect, it } from 'vitest';
import { calculateFeaturedScore, postFrontmatterSchema } from '@/types/post';

describe('Công thức tính điểm bài viết nổi bật', () => {
  it('tính đúng điểm theo quy tắc: lượt xem=1đ, like=2đ, comment=3đ, share=2đ', () => {
    const post = {
      views: 1000, // 1000 * 1 = 1000
      likes: 50, // 50 * 2 = 100
      comments: 20, // 20 * 3 = 60
      shares: 10, // 10 * 2 = 20
    };

    const score = calculateFeaturedScore(post);
    expect(score).toBe(1180);
  });

  it('xử lý an toàn khi các trường bị undefined/null', () => {
    const post = {};
    const score = calculateFeaturedScore(post);
    expect(score).toBe(0);
  });

  it('xếp hạng đúng bài viết nổi bật dựa trên điểm số', () => {
    const postA = { views: 500, likes: 10, comments: 5, shares: 2 }; // 500 + 20 + 15 + 4 = 539
    const postB = { views: 200, likes: 100, comments: 50, shares: 30 }; // 200 + 200 + 150 + 60 = 610

    expect(calculateFeaturedScore(postB)).toBeGreaterThan(calculateFeaturedScore(postA));
  });

  it('validate schema frontmatter có chứa trường views mặc định', () => {
    const validData = {
      title: 'Tiêu đề bài viết hợp lệ cho việc kiểm thử tính điểm nổi bật',
      description:
        'Mô tả bài viết đáp ứng đầy đủ độ dài yêu cầu từ năm mươi đến một trăm sáu mươi ký tự.',
      publishedAt: '2026-09-18',
      category: 'lap-trinh',
      tags: ['vitest', 'testing'],
      views: 250,
      likes: 30,
      comments: 5,
      shares: 10,
    };

    const parsed = postFrontmatterSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.views).toBe(250);
      expect(parsed.data.likes).toBe(30);
    }
  });

  it('chấp nhận description dài tùy ý mà không bị giới hạn 160 ký tự', () => {
    const longDesc =
      'Đây là một mô tả rất dài được viết tự do mà không bị chặn ở 160 ký tự nữa. '.repeat(5);
    const data = {
      title: 'Bài viết kiểm tra mô tả dài tùy ý',
      description: longDesc,
      publishedAt: '2026-09-18',
      tags: ['test'],
    };

    const parsed = postFrontmatterSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description.length).toBeGreaterThan(200);
    }
  });

  it('chấp nhận ảnh cover từ link ngoài (Google, CDN, https) hoặc nội bộ', () => {
    const externalCoverData = {
      title: 'Bài viết có ảnh cover từ Google hoặc link ngoài',
      description: 'Mô tả ngắn gọn.',
      publishedAt: '2026-09-18',
      tags: ['test'],
      cover: 'https://images.unsplash.com/photo-123456789.jpg',
    };

    const parsed = postFrontmatterSchema.safeParse(externalCoverData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cover).toBe('https://images.unsplash.com/photo-123456789.jpg');
    }
  });
});
