import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
  console.log('🧹 Đang dọn dẹp toàn bộ dữ liệu trong Database...');

  // Lấy danh sách tất cả các bảng trong public schema trừ bảng migrations
  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
  `);

  // Truncate tất cả các bảng với CASCADE
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
  }

  console.log(`✅ Đã xóa sạch dữ liệu của ${tables.length} bảng.`);

  // Tạo tài khoản Admin duy nhất
  const adminEmail = 'hatoan13@gmail.com';
  const hashedPassword = bcrypt.hashSync('Toantoan1310@', 10);
  const proUntil = new Date('2099-12-31T23:59:59.999Z');

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin',
      role: Role.ADMIN,
      password: hashedPassword,
      emailVerified: new Date(),
      proUntil,
      balanceVnd: 0,
      balanceUsd: 0,
    },
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Reset Database thành công mỹ mãn!');
  console.log(`👉 Email Admin: ${admin.email}`);
  console.log('👉 Mật khẩu: Toantoan1310@');
  console.log(`👉 Quyền hạn: ${admin.role}`);
  console.log(
    `👉 Số dư ví: ${admin.balanceVnd.toLocaleString('vi-VN')} VND / ${admin.balanceUsd} USD`,
  );
  console.log(`👉 Tài khoản Pro đến: ${admin.proUntil?.toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

reset()
  .catch((err) => {
    console.error('❌ Lỗi khi reset database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
