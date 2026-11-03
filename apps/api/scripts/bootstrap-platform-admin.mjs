import "dotenv/config";
import { PrismaClient, PlatformRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required.");
  }

  if (password.length < 12) {
    throw new Error("Platform admin password must be at least 12 characters.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: { platformRole: PlatformRole.ADMIN },
    });

    console.log(`Existing user promoted to platform admin: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: "Platform Admin",
      email,
      password: hashedPassword,
      platformRole: PlatformRole.ADMIN,
    },
  });

  console.log(`Platform admin created successfully: ${email}`);
}

main()
  .catch((error) => {
    console.error("Platform admin bootstrap failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
