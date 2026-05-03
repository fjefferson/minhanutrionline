/**
 * Script para ativar manualmente uma assinatura no banco (uso em desenvolvimento)
 * Uso: npx ts-node --transpile-only prisma/activate-plan.ts <email> <BASIC|PLUS|PREMIUM>
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const [email, planType] = process.argv.slice(2);

  if (!email || !["BASIC", "PLUS", "PREMIUM"].includes(planType)) {
    console.error(
      "Uso: npx ts-node --transpile-only prisma/activate-plan.ts <email> <BASIC|PLUS|PREMIUM>",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const plan = await prisma.plan.findFirst({
    where: { type: planType as "BASIC" | "PLUS" | "PREMIUM", active: true },
  });
  if (!plan) {
    console.error(`Plano não encontrado: ${planType}`);
    process.exit(1);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    create: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    include: { plan: true },
  });

  console.log(`✓ Assinatura ativada!`);
  console.log(`  Usuário : ${user.name} <${user.email}>`);
  console.log(`  Plano   : ${sub.plan.name}`);
  console.log(`  Status  : ${sub.status}`);
  console.log(`  Expira  : ${periodEnd.toLocaleDateString("pt-BR")}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
