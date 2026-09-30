import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || 'hatoan13@gmail.com').toLowerCase().trim();
  const password = process.argv[3] || 'Toantoan1310@';
  const name = process.argv[4] || 'Admin';

  console.log(`Bắt đầu tạo/cập nhật tài khoản Admin: ${email}...`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      password: hashedPassword,
      name,
      lockedAt: null,
      lockReason: null,
      emailVerified: new Date(),
    },
    create: {
      email,
      name,
      role: Role.ADMIN,
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Đã tạo/cập nhật Admin thành công!`);
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Name: ${user.name}`);
  console.log(`- Role: ${user.role}`);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi tạo Admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
