import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function getAdminStats(req: Request, res: Response) {
  const [totalUsers, activeSubscriptions, openChats, totalReports] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.chatSession.count({ where: { status: "OPEN" } }),
      prisma.symptomReport.count(),
    ]);

  res.json({ totalUsers, activeSubscriptions, openChats, totalReports });
}

export async function getAdminSubscriptions(req: Request, res: Response) {
  const subs = await prisma.subscription.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { name: true, type: true, priceInCents: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(subs);
}

export async function activateSubscription(req: Request, res: Response) {
  const id = req.params["id"] as string;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub = await prisma.subscription.update({
    where: { id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    include: { user: { select: { name: true, email: true } }, plan: true },
  });

  res.json(sub);
}

export async function cancelSubscription(req: Request, res: Response) {
  const id = req.params["id"] as string;

  const sub = await prisma.subscription.update({
    where: { id },
    data: { status: "CANCELED" },
    include: { user: { select: { name: true, email: true } }, plan: true },
  });

  res.json(sub);
}

export async function getPlans(req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { priceInCents: "asc" },
  });
  res.json(plans);
}

export async function getPublicPlans(req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      priceInCents: true,
      features: true,
    },
    orderBy: { priceInCents: "asc" },
  });
  res.json(plans);
}

export async function updatePlan(req: Request, res: Response) {
  const id = req.params["id"] as string;
  const { name, description, priceInCents, active, features } = req.body as {
    name?: string;
    description?: string;
    priceInCents?: number;
    active?: boolean;
    features?: string[];
  };

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(priceInCents !== undefined && { priceInCents: Number(priceInCents) }),
      ...(active !== undefined && { active }),
      ...(features !== undefined && { features }),
    },
  });

  res.json(plan);
}

const GLP1_SLUG = "glp-1";

export async function getKnowledge(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { slug: GLP1_SLUG },
  });
  if (!product) {
    res.status(404).json({ message: "Produto não encontrado" });
    return;
  }

  const items = await prisma.knowledgeItem.findMany({
    where: { productId: product.id },
    include: { symptoms: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Normaliza para o formato que o front espera: symptoms: [{ symptom: { name, slug } }]
  const normalized = items.map((item) => ({
    ...item,
    symptoms: item.symptoms.map((s) => ({
      symptom: { name: s.name, slug: s.slug },
    })),
  }));

  res.json(normalized);
}

export async function createKnowledge(req: Request, res: Response) {
  const {
    title,
    content,
    symptoms: symptomSlugs,
  } = req.body as {
    title: string;
    content: string;
    symptoms: string[];
  };

  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ message: "title e content são obrigatórios" });
    return;
  }

  const product = await prisma.product.findUnique({
    where: { slug: GLP1_SLUG },
  });
  if (!product) {
    res.status(404).json({ message: "Produto não encontrado" });
    return;
  }

  const symptomRecords = symptomSlugs?.length
    ? await prisma.symptom.findMany({
        where: { productId: product.id, slug: { in: symptomSlugs } },
      })
    : [];

  const item = await prisma.knowledgeItem.create({
    data: {
      productId: product.id,
      title,
      content,
      symptoms: { connect: symptomRecords.map((s) => ({ id: s.id })) },
    },
    include: { symptoms: { select: { name: true, slug: true } } },
  });

  res.status(201).json(item);
}

export async function updateKnowledge(req: Request, res: Response) {
  const id = req.params["id"] as string;
  const {
    title,
    content,
    symptoms: symptomSlugs,
  } = req.body as {
    title?: string;
    content?: string;
    symptoms?: string[];
  };

  const existing = await prisma.knowledgeItem.findUnique({
    where: { id },
    include: { symptoms: true },
  });
  if (!existing) {
    res.status(404).json({ message: "Item não encontrado" });
    return;
  }

  const symptomRecords = symptomSlugs
    ? await prisma.symptom.findMany({
        where: { productId: existing.productId, slug: { in: symptomSlugs } },
      })
    : null;

  const item = await prisma.knowledgeItem.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(symptomRecords && {
        symptoms: {
          set: symptomRecords.map((s) => ({ id: s.id })),
        },
      }),
    },
    include: { symptoms: { select: { name: true, slug: true } } },
  });

  res.json(item);
}

export async function deleteKnowledge(req: Request, res: Response) {
  const id = req.params["id"] as string;

  const existing = await prisma.knowledgeItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Item não encontrado" });
    return;
  }

  await prisma.knowledgeItem.delete({ where: { id } });
  res.status(204).send();
}

// ─── Symptoms ────────────────────────────────────────────────────────────────

const PRODUCT_SLUG = "glp-1";

export async function getSymptoms(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
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

export async function createSymptom(req: Request, res: Response) {
  const { name, slug } = req.body as { name: string; slug: string };

  if (!name?.trim() || !slug?.trim()) {
    res.status(400).json({ message: "name e slug são obrigatórios" });
    return;
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

  const product = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
  });
  if (!product) {
    res.status(404).json({ message: "Produto não encontrado" });
    return;
  }

  const existing = await prisma.symptom.findUnique({
    where: { productId_slug: { productId: product.id, slug: cleanSlug } },
  });
  if (existing) {
    res.status(409).json({ message: "Já existe um sintoma com este slug" });
    return;
  }

  const symptom = await prisma.symptom.create({
    data: { name: name.trim(), slug: cleanSlug, productId: product.id },
  });
  res.status(201).json(symptom);
}

export async function updateSymptom(req: Request, res: Response) {
  const id = req.params["id"] as string;
  const { name, slug } = req.body as { name?: string; slug?: string };

  const existing = await prisma.symptom.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Sintoma não encontrado" });
    return;
  }

  const symptom = await prisma.symptom.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(slug !== undefined && {
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      }),
    },
  });
  res.json(symptom);
}

export async function deleteSymptom(req: Request, res: Response) {
  const id = req.params["id"] as string;

  const existing = await prisma.symptom.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Sintoma não encontrado" });
    return;
  }

  await prisma.symptom.delete({ where: { id } });
  res.status(204).send();
}

// ── Chat (admin) ──────────────────────────────────────────────────────────────

export async function getAdminChatSessions(req: Request, res: Response) {
  const sessions = await prisma.chatSession.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(sessions);
}

export async function closeAdminChatSession(req: Request, res: Response) {
  const id = req.params["id"] as string;

  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) {
    res.status(404).json({ message: "Sessão não encontrada" });
    return;
  }

  const updated = await prisma.chatSession.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  res.json(updated);
}

// GET /admin/glp1/reviews — lista relatórios com revisão solicitada
export async function getGlp1Reviews(req: Request, res: Response) {
  const { status } = req.query as { status?: string };

  const where: Record<string, unknown> = { reviewRequested: true };
  if (status === "pending") where["reviewResolvedAt"] = null;
  if (status === "resolved") where["reviewResolvedAt"] = { not: null };

  const reports = await prisma.symptomReport.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      symptoms: {
        include: { symptom: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { reviewRequestedAt: "desc" },
  });

  res.json(reports);
}

// PATCH /admin/glp1/reviews/:id/resolve — marca revisão como resolvida
export async function resolveGlp1Review(req: Request, res: Response) {
  const id = req.params["id"] as string;
  const { reviewResponse } = req.body as { reviewResponse?: string };

  const report = await prisma.symptomReport.findUnique({ where: { id } });
  if (!report) {
    res.status(404).json({ message: "Relatório não encontrado" });
    return;
  }

  if (!reviewResponse?.trim()) {
    res
      .status(400)
      .json({ message: "A resposta da nutricionista é obrigatória." });
    return;
  }

  const updated = await prisma.symptomReport.update({
    where: { id },
    data: {
      reviewResolvedAt: new Date(),
      reviewResponse: reviewResponse.trim(),
    },
  });

  res.json(updated);
}

// ─── Pacientes / Anamnese ─────────────────────────────────────────────────────

export async function getAdminUsers(req: Request, res: Response) {
  const q = ((req.query.q as string | undefined) ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      nutritionalProfile: {
        select: {
          id: true,
          gender: true,
          heightCm: true,
          weightKg: true,
          goal: true,
          birthDate: true,
        },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  res.json(users);
}

export async function getAdminUserProfile(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const profile = await prisma.nutritionalProfile.findUnique({
    where: { userId: id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!profile) {
    res.status(404).json({ message: "Perfil não encontrado" });
    return;
  }

  res.json(profile);
}
