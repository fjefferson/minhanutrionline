import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  // Product
  const product = await prisma.product.upsert({
    where: { slug: "glp-1" },
    update: {},
    create: {
      slug: "glp-1",
      name: "GLP-1 / Canetas Emagrecedoras",
      description: "Suporte nutricional para usuários de medicamentos GLP-1",
      active: true,
    },
  });

  console.log("Product:", product.slug);

  // Plans
  const plans = [
    {
      type: "BASIC" as const,
      name: "GLP-1 Basic",
      description: "Suporte nutricional educativo com tecnologia",
      priceInCents: 1490,
      features: [
        "Controle de sintomas e efeitos colaterais",
        "Acesso ao conteúdo educativo",
      ],
    },
    {
      type: "PLUS" as const,
      name: "GLP-1 Plus",
      description: "Acompanhamento com suporte nutricional",
      priceInCents: 4990,
      features: [
        "Tudo do plano Basic",
        "Chat direto com a nutricionista",
        "Respostas em até 24h úteis",
        "Acompanhamento personalizado",
        "Ajustes de cardápio sob demanda",
      ],
    },
    {
      type: "PREMIUM" as const,
      name: "GLP-1 Premium",
      description: "Tudo do Plus + plano alimentar personalizado",
      priceInCents: 14990,
      features: [
        "Tudo do plano Plus",
        "Plano alimentar 100% personalizado",
        "Consulta de retorno mensal",
        "Prioridade no atendimento",
        "Suporte para reajuste de dose",
        "Relatório de evolução mensal",
      ],
    },
  ];

  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { productId_type: { productId: product.id, type: p.type } },
      update: {
        name: p.name,
        description: p.description,
        priceInCents: p.priceInCents,
        features: p.features,
        active: true,
      },
      create: { ...p, productId: product.id, active: true },
    });
    console.log("Plan:", plan.type, plan.priceInCents);
  }

  // Symptoms
  const symptoms = [
    { slug: "nausea", name: "Náusea" },
    { slug: "vomito", name: "Vômito" },
    { slug: "sem-apetite", name: "Falta de apetite" },
    { slug: "fadiga", name: "Fadiga / Cansaço" },
    { slug: "diarreia", name: "Diarreia" },
    { slug: "constipacao", name: "Constipação" },
    { slug: "dor-abdominal", name: "Dor abdominal" },
    { slug: "refluxo", name: "Refluxo / Azia" },
    { slug: "dor-cabeca", name: "Dor de cabeça" },
    { slug: "tontura", name: "Tontura" },
    { slug: "queda-cabelo", name: "Queda de cabelo" },
    { slug: "ansiedade", name: "Ansiedade" },
  ];

  for (const s of symptoms) {
    const symptom = await prisma.symptom.upsert({
      where: { productId_slug: { productId: product.id, slug: s.slug } },
      update: { name: s.name },
      create: { ...s, productId: product.id },
    });
    console.log("Symptom:", symptom.slug);
  }

  await seedAdmin();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

async function seedAdmin() {
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];

  if (!email || !password) {
    console.warn(
      "⚠️  ADMIN_EMAIL ou ADMIN_PASSWORD não definidos no .env — admin não criado.",
    );
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { emailVerified: true },
    create: {
      name: "Elane Oliveira",
      email,
      password: hash,
      role: "ADMIN",
      onboardingDone: true,
      emailVerified: true,
    },
  });
  console.log("Admin:", admin.email);
}
