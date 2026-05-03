import { prisma } from "../src/lib/prisma";

const FEATURES: Record<string, string[]> = {
  BASIC: [
    "Formulário de sintomas ilimitado",
    "Orientações personalizadas por IA",
    "Histórico de consultas",
    "Base de conhecimento GLP-1",
  ],
  PLUS: [
    "Tudo do Basic",
    "Chat ao vivo com a nutricionista",
    "Respostas em até 24h",
    "Acompanhamento contínuo",
  ],
  PREMIUM: [
    "Tudo do Plus",
    "Consulta de 1h com a nutricionista",
    "Atendimento prioritário",
    "Plano alimentar personalizado",
  ],
};

async function main() {
  const plans = await prisma.plan.findMany();
  for (const p of plans) {
    const features = FEATURES[p.type] ?? [];
    await prisma.plan.update({ where: { id: p.id }, data: { features } });
    console.log(`✓ ${p.type}: ${features.length} features`);
  }
  await prisma.$disconnect();
}

main().catch(console.error);
