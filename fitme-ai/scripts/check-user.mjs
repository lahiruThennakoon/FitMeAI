import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const users = await prisma.user.findMany({
    where: { email: { contains: "lahiru", mode: "insensitive" } },
    select: { id: true, email: true, emailVerified: true, createdAt: true },
  });
  console.log("users:", JSON.stringify(users, null, 2));
  for (const u of users) {
    const accounts = await prisma.account.findMany({
      where: { userId: u.id },
      select: { providerId: true },
    });
    console.log(`accounts for ${u.email}:`, JSON.stringify(accounts));
  }
  console.log("total users:", await prisma.user.count());
} catch (e) {
  console.error("DB_ERROR:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
