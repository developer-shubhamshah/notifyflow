import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      platformRole: true,
    },
  });

  console.log(user);
} finally {
  await prisma.$disconnect();
}
