import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../lib/prisma";
import { generateNutritionalGuidance } from "../services/openai.service";

const GLP1_SLUG = "glp-1";

export async function getSymptoms(req: AuthenticatedRequest, res: Response) {
  const product = await prisma.product.findUnique({
    where: { slug: GLP1_SLUG },
  });
  if (!product) {
    res.status(404).json({ message: "Produto não encontrado" });
    return;
  }

  const symptoms = await prisma.symptom.findMany({
    where: { productId: product.id },
    orderBy: { name: "asc" },
  });

  res.json(symptoms);
}

export async function createReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const {
    symptomSlugs,
    symptoms: symptomsField,
    extraNotes,
  } = req.body as {
    symptomSlugs?: string[];
    symptoms?: string[];
    extraNotes?: string;
  };

  const slugs = symptomSlugs ?? symptomsField ?? [];

  if (!Array.isArray(slugs)) {
    res
      .status(400)
      .json({ message: "symptoms é obrigatório e deve ser um array" });
    return;
  }

  const product = await prisma.product.findUnique({
    where: { slug: GLP1_SLUG },
  });
  if (!product) {
    res.status(404).json({ message: "Produto não encontrado" });
    return;
  }

  // Busca sintomas pelo slug
  const symptoms = await prisma.symptom.findMany({
    where: { productId: product.id, slug: { in: slugs } },
  });

  // Busca itens da base de conhecimento relacionados aos sintomas relatados
  const knowledgeItems = await prisma.knowledgeItem.findMany({
    where: {
      productId: product.id,
      active: true,
      symptoms: {
        some: { id: { in: symptoms.map((s) => s.id) } },
      },
    },
    take: 8,
  });

  // Monta contexto RAG
  const knowledgeContext = knowledgeItems
    .map((k) => `# ${k.title}\n${k.content}`)
    .join("\n\n");

  // Busca perfil nutricional do usuário
  const profile = await prisma.nutritionalProfile.findUnique({
    where: { userId },
  });

  // Gera resposta da IA
  const aiResponse = await generateNutritionalGuidance({
    symptoms: symptoms.map((s) => s.name),
    extraNotes: extraNotes ?? "",
    knowledgeContext,
    profile,
  });

  // Salva no banco
  const report = await prisma.symptomReport.create({
    data: {
      userId,
      productId: product.id,
      extraNotes: extraNotes ?? null,
      aiResponse,
      symptoms: {
        create: symptoms.map((s) => ({ symptomId: s.id })),
      },
    },
    include: {
      symptoms: { include: { symptom: true } },
    },
  });

  res.status(201).json(report);
}

export async function getReports(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;

  const product = await prisma.product.findUnique({
    where: { slug: GLP1_SLUG },
  });
  if (!product) {
    res.status(404).json({ message: "Produto não encontrado" });
    return;
  }

  const reports = await prisma.symptomReport.findMany({
    where: { userId, productId: product.id },
    include: {
      symptoms: {
        include: { symptom: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json(reports);
}

// PATCH /glp1/report/:id/helpful — avalia se a resposta foi útil
export async function rateReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };
  const { helpful } = req.body as { helpful: boolean };

  const report = await prisma.symptomReport.findUnique({ where: { id } });
  if (!report || report.userId !== userId) {
    res.status(404).json({ message: "Consulta não encontrada" });
    return;
  }

  const updated = await prisma.symptomReport.update({
    where: { id },
    data: { helpful },
  });

  res.json(updated);
}

// POST /glp1/report/:id/review — solicita revisão humana (1x por dia)
export async function requestReview(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const report = await prisma.symptomReport.findUnique({ where: { id } });
  if (!report || report.userId !== userId) {
    res.status(404).json({ message: "Consulta não encontrada" });
    return;
  }
  if (report.reviewRequested) {
    res
      .status(400)
      .json({ message: "Revisão já solicitada para esta consulta." });
    return;
  }

  // Verifica se já solicitou revisão hoje
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayReview = await prisma.symptomReport.findFirst({
    where: {
      userId,
      reviewRequested: true,
      reviewRequestedAt: { gte: startOfDay },
    },
  });
  if (todayReview) {
    res.status(429).json({
      message: "Você já solicitou uma revisão hoje. Tente novamente amanhã.",
    });
    return;
  }

  const updated = await prisma.symptomReport.update({
    where: { id },
    data: { reviewRequested: true, reviewRequestedAt: new Date() },
  });

  res.json(updated);
}
