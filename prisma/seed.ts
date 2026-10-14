import { hashPassword } from "@/lib/auth/passwordHash";
import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || "admin123");

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      name: "Administrador",
      passwordHash,
      perfil: "ADM",
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao executar o seed do banco:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
