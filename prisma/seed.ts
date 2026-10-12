import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'hatoan13@gmail.com';
  const hashedPassword = await bcrypt.hash('Toantoan1310@', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin',
      role: Role.ADMIN,
      password: hashedPassword,
      emailVerified: new Date(),
      lockedAt: null,
      lockReason: null,
      proUntil: new Date('2099-12-31T23:59:59.999Z'),
      balanceVnd: 0,
      balanceUsd: 0,
    },
    create: {
      email: adminEmail,
      name: 'Admin',
      role: Role.ADMIN,
      password: hashedPassword,
      emailVerified: new Date(),
      proUntil: new Date('2099-12-31T23:59:59.999Z'),
      balanceVnd: 0,
      balanceUsd: 0,
    },
  });

  console.log(`✅ Admin duy nhất: ${admin.email}`);
  console.log('✅ Số dư: 0 VND / 0 USD');
  console.log(`✅ Pro đến: ${admin.proUntil?.toISOString()}`);
}

main()
  .catch((error) => {
    console.error('❌ Không thể seed admin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
