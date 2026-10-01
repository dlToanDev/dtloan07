import { PrismaClient } from '@prisma/client';

async function runBenchmark() {
  const remoteUrl = process.env.DATABASE_URL;
  const localUrl = 'postgresql://postgres@localhost:5435/blog_local';

  console.log('=====================================================');
  console.log('🚀 SO SÁNH HIỆU NĂNG TRUY VẤN: LOCAL VS SUPABASE TOKYO');
  console.log('=====================================================');

  // 1. Local Postgres
  console.log('\n[1] Đang test PostgreSQL Local (Cổng 5435 trên máy)...');
  const localPrisma = new PrismaClient({
    datasources: { db: { url: localUrl } },
  });
  await localPrisma.$connect();

  const localTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await localPrisma.user.findFirst();
    localTimes.push(performance.now() - t0);
  }
  const localAvg = localTimes.reduce((a, b) => a + b) / localTimes.length;
  console.log(
    `⏱️  Các lượt truy vấn Local : ${localTimes.map((t) => t.toFixed(2) + 'ms').join(' | ')}`,
  );
  console.log(`✅ Trung bình Local       : ${localAvg.toFixed(2)} ms / query`);
  await localPrisma.$disconnect();

  // 2. Remote Supabase (Tokyo)
  console.log('\n[2] Đang test Supabase Remote (Tokyo, Nhật Bản)...');
  const remotePrisma = new PrismaClient({
    datasources: { db: { url: remoteUrl } },
  });
  await remotePrisma.$connect();

  const remoteTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await remotePrisma.user.findFirst();
    remoteTimes.push(performance.now() - t0);
  }
  const remoteAvg = remoteTimes.reduce((a, b) => a + b) / remoteTimes.length;
  console.log(
    `⏱️  Các lượt truy vấn Tokyo : ${remoteTimes.map((t) => t.toFixed(2) + 'ms').join(' | ')}`,
  );
  console.log(`⚠️  Trung bình Tokyo       : ${remoteAvg.toFixed(2)} ms / query`);
  await remotePrisma.$disconnect();

  const speedup = (remoteAvg / localAvg).toFixed(0);
  console.log('\n=====================================================');
  console.log(`🔥 KẾT LUẬN: Database Local nhanh hơn gấp ~${speedup} LẦN!`);
  console.log('=====================================================');
}

runBenchmark().catch(console.error);
