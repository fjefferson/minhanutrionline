import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../lib/prisma";

// GET /glp1/dosage-history
export async function getDosageHistory(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user!.userId;

  const logs = await prisma.glp1DosageLog.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
  });

  res.json(logs);
}

// POST /glp1/dosage-change
export async function createDosageChange(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user!.userId;
  const {
    medication,
    doseMg,
    startDate,
    changeReason,
    prescribedBy,
    nextChangePlanned,
    toleranceNotes,
  } = req.body as {
    medication: string;
    doseMg?: number | null;
    startDate: string;
    changeReason?: string;
    prescribedBy?: string;
    nextChangePlanned?: string;
    toleranceNotes?: string;
  };

  if (!medication || !startDate) {
    res
      .status(400)
      .json({ message: "medication e startDate são obrigatórios" });
    return;
  }

  const parsedStart = new Date(startDate);
  if (isNaN(parsedStart.getTime())) {
    res.status(400).json({ message: "startDate inválido" });
    return;
  }

  // Marca endDate do log anterior ativo (sem endDate) com a data de início da nova dose
  await prisma.glp1DosageLog.updateMany({
    where: { userId, endDate: null },
    data: { endDate: parsedStart },
  });

  const log = await prisma.glp1DosageLog.create({
    data: {
      userId,
      medication,
      doseMg: doseMg ?? null,
      startDate: parsedStart,
      changeReason: changeReason ?? null,
      prescribedBy: prescribedBy ?? null,
      nextChangePlanned: nextChangePlanned ? new Date(nextChangePlanned) : null,
      toleranceNotes: toleranceNotes ?? null,
    },
  });

  res.status(201).json(log);
}

// PATCH /glp1/dosage-change/:id
export async function updateDosageChange(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };
  const {
    medication,
    doseMg,
    startDate,
    endDate,
    changeReason,
    prescribedBy,
    nextChangePlanned,
    toleranceNotes,
  } = req.body as {
    medication?: string;
    doseMg?: number | null;
    startDate?: string;
    endDate?: string | null;
    changeReason?: string | null;
    prescribedBy?: string | null;
    nextChangePlanned?: string | null;
    toleranceNotes?: string | null;
  };

  const existing = await prisma.glp1DosageLog.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ message: "Registro não encontrado" });
    return;
  }

  const data: Record<string, unknown> = {};
  if (medication !== undefined) data.medication = medication;
  if ("doseMg" in req.body) data.doseMg = doseMg ?? null;
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if ("endDate" in req.body) data.endDate = endDate ? new Date(endDate) : null;
  if ("changeReason" in req.body) data.changeReason = changeReason ?? null;
  if ("prescribedBy" in req.body) data.prescribedBy = prescribedBy ?? null;
  if ("nextChangePlanned" in req.body)
    data.nextChangePlanned = nextChangePlanned
      ? new Date(nextChangePlanned)
      : null;
  if ("toleranceNotes" in req.body)
    data.toleranceNotes = toleranceNotes ?? null;

  const updated = await prisma.glp1DosageLog.update({ where: { id }, data });
  res.json(updated);
}

// DELETE /glp1/dosage-change/:id
export async function deleteDosageChange(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const existing = await prisma.glp1DosageLog.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ message: "Registro não encontrado" });
    return;
  }

  await prisma.glp1DosageLog.delete({ where: { id } });
  res.status(204).send();
}
