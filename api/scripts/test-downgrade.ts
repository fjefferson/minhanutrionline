/**
 * Script de teste do fluxo completo de downgrade
 * Uso: npx ts-node scripts/test-downgrade.ts [--apply | --cancel | --status]
 *
 *   --status  (padrão) mostra plano atual e downgrade agendado
 *   --apply   simula o webhook de renovação → aplica o downgrade agendado
 *   --cancel  cancela o downgrade agendado (sem chamar Asaas)
 */

import { prisma } from "../src/lib/prisma";

const USER_EMAIL = "oliveirjefferson@gmail.com";

async function getSubscription() {
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    include: {
      subscription: {
        include: {
          plan: true,
          scheduledDowngrade: true,
        },
      },
    },
  });

  if (!user) throw new Error(`Usuário não encontrado: ${USER_EMAIL}`);
  if (!user.subscription) throw new Error("Usuário não possui assinatura");
  return user.subscription;
}

async function status() {
  const sub = await getSubscription();
  console.log("\n── Assinatura atual ─────────────────────────────");
  console.log(`   Plano:         ${sub.plan.name} (${sub.plan.type})`);
  console.log(`   Status:        ${sub.status}`);
  console.log(
    `   Período atual: ${sub.currentPeriodStart?.toLocaleDateString("pt-BR")} → ${sub.currentPeriodEnd?.toLocaleDateString("pt-BR")}`,
  );
  if (sub.scheduledDowngrade) {
    console.log(
      `   ⚙ Downgrade agendado → ${sub.scheduledDowngrade.name} (${sub.scheduledDowngrade.type})`,
    );
    console.log(
      `     Efetivo em: ${sub.currentPeriodEnd?.toLocaleDateString("pt-BR")}`,
    );
  } else {
    console.log("   Nenhum downgrade agendado");
  }
  console.log("─────────────────────────────────────────────────\n");
}

async function applyDowngrade() {
  const sub = await getSubscription();

  if (!sub.scheduledDowngradePlanId) {
    console.error("❌ Nenhum downgrade agendado. Agende primeiro via app/web.");
    process.exit(1);
  }

  const now = new Date();
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      planId: sub.scheduledDowngradePlanId,
      scheduledDowngradePlanId: null,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
    include: { plan: true },
  });

  console.log(`\n✅ Downgrade aplicado com sucesso!`);
  console.log(`   Plano anterior: ${sub.plan.name}`);
  console.log(`   Plano agora:    ${updated.plan.name} (${updated.plan.type})`);
  console.log(
    `   Novo período:   ${now.toLocaleDateString("pt-BR")} → ${updated.currentPeriodEnd?.toLocaleDateString("pt-BR")}\n`,
  );
}

async function cancelDowngrade() {
  const sub = await getSubscription();

  if (!sub.scheduledDowngradePlanId) {
    console.error("❌ Nenhum downgrade agendado para cancelar.");
    process.exit(1);
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { scheduledDowngradePlanId: null },
  });

  console.log(
    `\n✅ Downgrade cancelado. Plano ${sub.plan.name} permanece ativo.\n`,
  );
}

const arg = process.argv[2] ?? "--status";

(async () => {
  try {
    if (arg === "--apply") await applyDowngrade();
    else if (arg === "--cancel") await cancelDowngrade();
    else await status();
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
