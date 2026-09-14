/**
 * Tạo file MDX mới với frontmatter hợp lệ sẵn.
 *
 *   pnpm new:post "Tối ưu Nginx cho Next.js" --category server --tags nginx,vps
 *
 * Chạy bằng `node --experimental-strip-types`, không cần tsx.
 */
import { writeFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';

const CATEGORIES = ['server', 'lap-trinh', 'devops', 'database'] as const;

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const title = process.argv[2];

  if (!title || title.startsWith('--')) {
    console.error('Cách dùng: pnpm new:post "<Tiêu đề>" [--category server] [--tags a,b]');
    process.exit(1);
  }

  const category = getFlag('category') ?? 'lap-trinh';
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    console.error(
      `❌ category không hợp lệ: "${category}". Chọn một trong: ${CATEGORIES.join(', ')}`,
    );
    process.exit(1);
  }

  const tags = (getFlag('tags') ?? category)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(title);
  const fileName = `${today.slice(0, 7)}-${slug}.mdx`;
  const dir = path.join(process.cwd(), 'content', 'posts');
  const filePath = path.join(dir, fileName);

  await mkdir(dir, { recursive: true });

  try {
    await access(filePath);
    console.error(`❌ File đã tồn tại: content/posts/${fileName}`);
    process.exit(1);
  } catch {
    // Chưa có file — đúng như mong đợi.
  }

  // description để trống có chủ đích: build sẽ fail cho tới khi được điền,
  // nên không thể lỡ publish bài thiếu meta description.
  const template = `---
title: '${title.replace(/'/g, "\\'")}'
description: 'TODO: viết mô tả 50–160 ký tự, đây là đoạn hiện trên Google.'
publishedAt: '${today}'
category: '${category}'
tags: [${tags.map((tag) => `'${tag}'`).join(', ')}]
draft: true
---

Mở bài: nêu vấn đề cụ thể mà bài này giải quyết.

## Bối cảnh

## Cách làm

\`\`\`bash title="terminal" showLineNumbers
echo "thay bằng lệnh thật"
\`\`\`

<Callout type="warning" title="Lưu ý">
  Cảnh báo cái bẫy mà người đọc dễ mắc.
</Callout>

## Kết
`;

  await writeFile(filePath, template, 'utf8');
  console.log(`✅ Đã tạo content/posts/${fileName}`);
  console.log(`   URL: /blog/${slug}`);
  console.log(`   Nhớ điền description và bỏ draft: true trước khi publish.`);
}

await main();
