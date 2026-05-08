import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../lib/prisma";

// GET /progress/entries?limit=50&from=2026-01-01&to=2026-12-31
export async function getEntries(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const { limit, from, to } = req.query as {
    limit?: string;
    from?: string;
    to?: string;
  };

  const entries = await prisma.progressEntry.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            recordedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { recordedAt: "desc" },
    take: limit ? Math.min(parseInt(limit, 10), 500) : 200,
  });

  res.json(entries);
}

// POST /progress/entries
export async function createEntry(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const {
    recordedAt,
    weightKg,
    waistCm,
    bodyFatPct,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    notes,
  } = req.body as {
    recordedAt: string;
    weightKg?: number;
    waistCm?: number;
    bodyFatPct?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    notes?: string;
  };

  if (!recordedAt) {
    res.status(400).json({ message: "recordedAt é obrigatório" });
    return;
  }

  const parsedDate = new Date(recordedAt);
  if (isNaN(parsedDate.getTime())) {
    res.status(400).json({ message: "recordedAt inválido" });
    return;
  }

  const entry = await prisma.progressEntry.create({
    data: {
      userId,
      recordedAt: parsedDate,
      weightKg: weightKg ?? null,
      waistCm: waistCm ?? null,
      bodyFatPct: bodyFatPct ?? null,
      bloodPressureSystolic: bloodPressureSystolic ?? null,
      bloodPressureDiastolic: bloodPressureDiastolic ?? null,
      notes: notes ?? null,
    },
  });

  res.status(201).json(entry);
}

// DELETE /progress/entries/:id
export async function deleteEntry(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const existing = await prisma.progressEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ message: "Registro não encontrado" });
    return;
  }

  await prisma.progressEntry.delete({ where: { id } });
  res.status(204).send();
}

// GET /progress/stats
export async function getStats(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;

  const [profile, entries] = await Promise.all([
    prisma.nutritionalProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, goal: true },
    }),
    prisma.progressEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: "asc" },
      select: { recordedAt: true, weightKg: true },
    }),
  ]);

  const weightEntries = entries.filter((e) => e.weightKg !== null) as {
    recordedAt: Date;
    weightKg: number;
  }[];

  if (weightEntries.length === 0 && !profile?.weightKg) {
    res.json({
      totalLost: null,
      currentWeight: null,
      currentBMI: null,
      progressPct: null,
      weeklyAvgLoss: null,
      totalEntries: 0,
    });
    return;
  }

  // Peso inicial: primeira entry com peso ou peso do perfil
  const initialWeight =
    weightEntries.length > 0
      ? weightEntries[0].weightKg
      : (profile?.weightKg ?? null);

  // Peso atual: última entry com peso ou peso do perfil
  const currentWeight =
    weightEntries.length > 0
      ? weightEntries[weightEntries.length - 1].weightKg
      : (profile?.weightKg ?? null);

  const totalLost =
    initialWeight !== null && currentWeight !== null
      ? Math.max(0, initialWeight - currentWeight)
      : null;

  // IMC atual
  const heightM = profile?.heightCm ? profile.heightCm / 100 : null;
  const currentBMI =
    currentWeight !== null && heightM !== null
      ? Math.round((currentWeight / (heightM * heightM)) * 10) / 10
      : null;

  // Meta de perda: 10% do peso inicial como padrão para LOSE_WEIGHT/CONTROL_GLYCEMIA
  // Para outros goals, usamos 5%
  const goalLossPct =
    profile?.goal === "LOSE_WEIGHT" || profile?.goal === "CONTROL_GLYCEMIA"
      ? 0.1
      : 0.05;
  const targetLoss =
    initialWeight !== null ? initialWeight * goalLossPct : null;

  const progressPct =
    totalLost !== null && targetLoss !== null && targetLoss > 0
      ? Math.min(100, Math.round((totalLost / targetLoss) * 100))
      : null;

  // Média de perda semanal (últimas 4 semanas)
  let weeklyAvgLoss: number | null = null;
  if (weightEntries.length >= 2) {
    const last = weightEntries[weightEntries.length - 1];
    const fourWeeksAgo = new Date(last.recordedAt);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentEntries = weightEntries.filter(
      (e) => e.recordedAt >= fourWeeksAgo,
    );
    if (recentEntries.length >= 2) {
      const first = recentEntries[0];
      const diff = first.weightKg - last.weightKg;
      const weeks =
        (last.recordedAt.getTime() - first.recordedAt.getTime()) /
        (7 * 24 * 3600 * 1000);
      weeklyAvgLoss = weeks > 0 ? Math.round((diff / weeks) * 100) / 100 : null;
    }
  }

  res.json({
    totalLost: totalLost !== null ? Math.round(totalLost * 10) / 10 : null,
    currentWeight:
      currentWeight !== null ? Math.round(currentWeight * 10) / 10 : null,
    currentBMI,
    progressPct,
    weeklyAvgLoss,
    totalEntries: entries.length,
  });
}
