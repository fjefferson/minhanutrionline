import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendConsultationConfirmedEmail } from "../services/sendpulse.service";

// Brazil = UTC-3, so UTC = Brazil + 3
const BRAZIL_OFFSET_H = 3;

// Default values (used when no config row exists yet)
const DEFAULT_GRACE_DAYS = 15;
const DEFAULT_GAP_DAYS = 30;
const DEFAULT_BIZ_HOURS = [8, 9, 10, 11, 14, 15, 16, 17]; // sem almoço 12-13
const DEFAULT_BIZ_DAYS = [1, 2, 3, 4, 5]; // Seg-Sex
const DEFAULT_CANCEL_DAYS = 5; // antecedência mínima para cancelamento

/** Loads the singleton config row, creating defaults if absent */
async function getConfig() {
  return prisma.consultationConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      graceDays: DEFAULT_GRACE_DAYS,
      gapDays: DEFAULT_GAP_DAYS,
      cancelDays: DEFAULT_CANCEL_DAYS,
      bizHours: DEFAULT_BIZ_HOURS,
      bizDays: DEFAULT_BIZ_DAYS,
    },
    update: {},
  });
}

/** Is a given UTC date on a non-business day (uses config.bizDays)? */
function isBizDay(utcDate: Date, bizDays: number[]): boolean {
  // utcDate is UTC midnight of the Brazil calendar date (built from "YYYY-MM-DDT00:00:00.000Z")
  // getUTCDay() returns the correct day-of-week for that Brazil date directly
  return bizDays.includes(utcDate.getUTCDay());
}

function brazilHourToUTC(brazilHour: number): number {
  return brazilHour + BRAZIL_OFFSET_H;
}

function utcToBrazilHour(utcDate: Date): number {
  return utcDate.getUTCHours() - BRAZIL_OFFSET_H;
}

/** Return a Date at the given Brazil calendar date + Brazil hour, stored as UTC */
function buildScheduledAt(date: string, hourBrazil: number): Date {
  const utcHour = brazilHourToUTC(hourBrazil);
  // date is "YYYY-MM-DD" — build as UTC midnight then add utcHour
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d;
}

/** Return the Brazil calendar date string "YYYY-MM-DD" from a UTC Date */
function toBrazilDateStr(utcDate: Date): string {
  const bz = new Date(utcDate.getTime() - BRAZIL_OFFSET_H * 3600_000);
  return bz.toISOString().slice(0, 10);
}

/** Is a given UTC date on a weekend in Brazil? */
function isBrazilWeekend(utcDate: Date): boolean {
  const bz = new Date(utcDate.getTime() - BRAZIL_OFFSET_H * 3600_000);
  const dow = bz.getUTCDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}

/** Start of Brazil "today" expressed as UTC midnight equivalent */
function brazilTodayUTCMidnight(): Date {
  const now = new Date();
  const bzNow = new Date(now.getTime() - BRAZIL_OFFSET_H * 3600_000);
  const str = bzNow.toISOString().slice(0, 10);
  return new Date(`${str}T00:00:00.000Z`);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ─── User endpoints ──────────────────────────────────────────────────────────

/**
 * GET /consultations/eligibility
 * Returns { canBook, earliestDate, reason }
 */
export const getEligibility = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

  const config = await getConfig();

  const regDate = new Date(
    new Date(user.createdAt.getTime() - BRAZIL_OFFSET_H * 3600_000)
      .toISOString()
      .slice(0, 10) + "T00:00:00.000Z",
  );
  const graceDate = addDays(regDate, config.graceDays);

  // Last non-cancelled consultation
  const last = await prisma.consultation.findFirst({
    where: { userId, status: { not: "CANCELLED" } },
    orderBy: { scheduledAt: "desc" },
  });

  let earliestDate = graceDate;
  let reason: string = "carencia";

  if (last) {
    const lastDateStr = toBrazilDateStr(last.scheduledAt);
    const lastDate = new Date(`${lastDateStr}T00:00:00.000Z`);
    const gapDate = addDays(lastDate, config.gapDays);
    if (gapDate.getTime() > earliestDate.getTime()) {
      earliestDate = gapDate;
      reason = "intervalo";
    }
  }

  // canBook: true only when the user is already past both grace and gap periods
  const todayDateStr = toBrazilDateStr(brazilTodayUTCMidnight());
  const earliestDateStr = earliestDate.toISOString().slice(0, 10);
  return res.json({
    canBook: earliestDateStr <= todayDateStr,
    earliestDate: earliestDateStr,
    reason,
  });
};

/**
 * GET /consultations/available-slots?date=YYYY-MM-DD
 * Returns { slots: number[] } — available Brazil hours for that day
 */
export const getAvailableSlots = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { date } = req.query as { date?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ message: "Parâmetro date inválido (YYYY-MM-DD)" });
  }

  const dayStart = new Date(`${date}T00:00:00.000Z`);

  const config = await getConfig();

  if (!isBizDay(dayStart, config.bizDays)) {
    return res.json({ slots: [] });
  }

  const bizHours = [...config.bizHours].sort((a, b) => a - b);

  if (bizHours.length === 0) return res.json({ slots: [] });

  const minHour = bizHours[0];
  const maxHour = bizHours[bizHours.length - 1];
  const startUTC = buildScheduledAt(date, minHour);
  const endUTC = buildScheduledAt(date, maxHour);

  // Check if entire day is blocked
  const dayBlocked = await prisma.agendaBlock.findFirst({
    where: { blockedAt: new Date(`${date}T00:00:00.000Z`), allDay: true },
  });
  if (dayBlocked) return res.json({ slots: [], blockedAllDay: true });

  const [booked, hourBlocks] = await Promise.all([
    prisma.consultation.findMany({
      where: {
        scheduledAt: { gte: startUTC, lte: endUTC },
        status: { not: "CANCELLED" },
      },
      select: { scheduledAt: true },
    }),
    prisma.agendaBlock.findMany({
      where: {
        blockedAt: { gte: startUTC, lte: endUTC },
        allDay: false,
      },
      select: { blockedAt: true },
    }),
  ]);

  const bookedUTCHours = new Set([
    ...booked.map((c) => c.scheduledAt.getUTCHours()),
    ...hourBlocks.map((b) => b.blockedAt.getUTCHours()),
  ]);

  const slots = bizHours.filter((h) => !bookedUTCHours.has(brazilHourToUTC(h)));

  return res.json({ slots });
};

/**
 * GET /consultations
 * Returns user's consultations sorted by date desc
 */
export const listMyConsultations = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;

  const consultations = await prisma.consultation.findMany({
    where: { userId },
    orderBy: { scheduledAt: "desc" },
  });

  return res.json(consultations);
};

/**
 * POST /consultations
 * Body: { date: "YYYY-MM-DD", hour: number }
 */
export const bookConsultation = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;
  const { date, hour } = req.body as { date?: string; hour?: number };

  if (!date || typeof hour !== "number") {
    return res.status(400).json({ message: "date e hour são obrigatórios" });
  }

  const config = await getConfig();

  if (!config.bizHours.includes(hour)) {
    return res
      .status(400)
      .json({ message: "Horário fora do horário comercial" });
  }

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  if (!isBizDay(dayStart, config.bizDays)) {
    return res
      .status(400)
      .json({ message: "Este dia não está disponível para agendamentos" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

  const regDate = new Date(
    new Date(user.createdAt.getTime() - BRAZIL_OFFSET_H * 3600_000)
      .toISOString()
      .slice(0, 10) + "T00:00:00.000Z",
  );
  const graceDate = addDays(regDate, config.graceDays);

  const last = await prisma.consultation.findFirst({
    where: { userId, status: { not: "CANCELLED" } },
    orderBy: { scheduledAt: "desc" },
  });

  let earliestDate = graceDate;

  if (last) {
    const lastDateStr = toBrazilDateStr(last.scheduledAt);
    const lastDate = new Date(`${lastDateStr}T00:00:00.000Z`);
    const gapDate = addDays(lastDate, config.gapDays);
    if (gapDate.getTime() > earliestDate.getTime()) {
      earliestDate = gapDate;
    }
  }

  const requestedDay = new Date(`${date}T00:00:00.000Z`);
  if (requestedDay.getTime() < earliestDate.getTime()) {
    return res.status(400).json({
      message: `Você só pode agendar a partir de ${earliestDate.toISOString().slice(0, 10)}`,
    });
  }

  // Check for agenda blocks (all-day OR hour-level)
  const allDayBlock = await prisma.agendaBlock.findFirst({
    where: { blockedAt: new Date(`${date}T00:00:00.000Z`), allDay: true },
  });
  if (allDayBlock) {
    return res
      .status(409)
      .json({ message: "Este dia está bloqueado para consultas" });
  }

  const hourBlock = await prisma.agendaBlock.findFirst({
    where: { blockedAt: buildScheduledAt(date, hour), allDay: false },
  });
  if (hourBlock) {
    return res.status(409).json({ message: "Este horário está bloqueado" });
  }

  // Check slot availability
  const scheduledAt = buildScheduledAt(date, hour);

  const conflict = await prisma.consultation.findFirst({
    where: { scheduledAt, status: { not: "CANCELLED" } },
  });

  if (conflict) {
    return res.status(409).json({ message: "Este horário já está ocupado" });
  }

  const consultation = await prisma.consultation.create({
    data: { userId, scheduledAt },
  });

  return res.status(201).json(consultation);
};

/**
 * DELETE /consultations/:id
 * Cancel own consultation
 */
export const cancelConsultation = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;
  const id = req.params["id"] as string;

  const consultation = await prisma.consultation.findUnique({ where: { id } });

  if (!consultation || consultation.userId !== userId) {
    return res.status(404).json({ message: "Consulta não encontrada" });
  }

  if (
    consultation.status === "CANCELLED" ||
    consultation.status === "COMPLETED"
  ) {
    return res
      .status(400)
      .json({ message: "Esta consulta não pode ser cancelada" });
  }

  if (consultation.scheduledAt <= new Date()) {
    return res
      .status(400)
      .json({ message: "Não é possível cancelar uma consulta já passada" });
  }

  const config = await getConfig();
  const minCancelDate = new Date(
    new Date().getTime() + config.cancelDays * 86_400_000,
  );
  if (consultation.scheduledAt < minCancelDate) {
    return res.status(400).json({
      message: `Cancelamentos devem ser feitos com pelo menos ${config.cancelDays} dias de antecedência`,
    });
  }

  const updated = await prisma.consultation.update({
    where: { id },
    data: { status: "CANCELLED", cancelReason: "Cancelado pelo paciente" },
  });

  return res.json(updated);
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * GET /admin/consultations?status=&from=&to=
 */
export const adminListConsultations = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { status, from, to } = req.query as {
    status?: string;
    from?: string;
    to?: string;
  };

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (from || to) {
    where.scheduledAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const consultations = await prisma.consultation.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return res.json(consultations);
};

/**
 * PUT /admin/consultations/:id
 * Body: { meetingLink?, notes?, status?, date?, hour?, cancelReason? }
 */
export const adminUpdateConsultation = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const id = req.params["id"] as string;
  const { meetingLink, notes, status, date, hour, cancelReason } = req.body as {
    meetingLink?: string;
    notes?: string;
    status?: string;
    date?: string;
    hour?: number;
    cancelReason?: string;
  };

  const consultation = await prisma.consultation.findUnique({ where: { id } });
  if (!consultation) {
    return res.status(404).json({ message: "Consulta não encontrada" });
  }

  const data: Record<string, unknown> = {};

  if (meetingLink !== undefined) data.meetingLink = meetingLink;
  if (notes !== undefined) data.notes = notes;
  if (cancelReason !== undefined) data.cancelReason = cancelReason;
  if (status !== undefined) data.status = status;

  // Reschedule
  if (date && typeof hour === "number") {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const cfg = await getConfig();
    if (!isBizDay(dayStart, cfg.bizDays)) {
      return res
        .status(400)
        .json({ message: "Este dia não está disponível para agendamentos" });
    }
    if (!cfg.bizHours.includes(hour)) {
      return res
        .status(400)
        .json({ message: "Horário fora do horário comercial" });
    }

    const newScheduledAt = buildScheduledAt(date, hour);

    // Check slot (ignoring self)
    const conflict = await prisma.consultation.findFirst({
      where: {
        scheduledAt: newScheduledAt,
        status: { not: "CANCELLED" },
        id: { not: id },
      },
    });
    if (conflict) {
      return res.status(409).json({ message: "Este horário já está ocupado" });
    }

    data.scheduledAt = newScheduledAt;
  }

  const wasConfirmed =
    consultation.status !== "CONFIRMED" && status === "CONFIRMED";

  const updated = await prisma.consultation.update({ where: { id }, data });

  // Notifica paciente ao confirmar consulta
  if (wasConfirmed) {
    prisma.user
      .findUnique({
        where: { id: consultation.userId },
        select: { name: true, email: true },
      })
      .then((patient) => {
        if (patient) {
          sendConsultationConfirmedEmail(
            patient,
            updated.scheduledAt,
            updated.meetingLink ?? null,
          );
        }
      })
      .catch(() => {});
  }

  return res.json(updated);
};

// ─── Admin: Agenda Blocks ─────────────────────────────────────────────────────

/**
 * GET /admin/agenda-blocks?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Lists all blocks in a date range
 */
export const adminListAgendaBlocks = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { from, to } = req.query as { from?: string; to?: string };

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.blockedAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }

  const blocks = await prisma.agendaBlock.findMany({
    where,
    orderBy: { blockedAt: "asc" },
  });

  return res.json(blocks);
};

/**
 * POST /admin/agenda-blocks
 * Body: { date: "YYYY-MM-DD", hour?: number, allDay?: boolean, reason?: string }
 * If allDay=true or no hour: blocks the entire day
 * If hour is provided: blocks that specific Brazil hour
 */
export const adminCreateAgendaBlock = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { date, hour, allDay, reason } = req.body as {
    date?: string;
    hour?: number;
    allDay?: boolean;
    reason?: string;
  };

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "date inválido (YYYY-MM-DD)" });
  }

  const isAllDay = allDay === true || hour === undefined;

  let blockedAt: Date;
  if (isAllDay) {
    blockedAt = new Date(`${date}T00:00:00.000Z`);
  } else {
    blockedAt = buildScheduledAt(date, hour!);
  }

  // Prevent duplicate
  const existing = await prisma.agendaBlock.findFirst({
    where: { blockedAt, allDay: isAllDay },
  });
  if (existing) {
    return res.status(409).json({ message: "Este bloqueio já existe" });
  }

  const block = await prisma.agendaBlock.create({
    data: { blockedAt, allDay: isAllDay, reason },
  });

  return res.status(201).json(block);
};

/**
 * DELETE /admin/agenda-blocks/:id
 */
export const adminDeleteAgendaBlock = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const id = req.params["id"] as string;

  const block = await prisma.agendaBlock.findUnique({ where: { id } });
  if (!block) {
    return res.status(404).json({ message: "Bloqueio não encontrado" });
  }

  await prisma.agendaBlock.delete({ where: { id } });
  return res.json({ message: "Bloqueio removido" });
};

// ─── Admin: Consultation Config ───────────────────────────────────────────────

/**
 * GET /admin/consultation-config
 */
export const adminGetConsultationConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const config = await getConfig();
  return res.json(config);
};

/**
 * PUT /admin/consultation-config
 * Body: { graceDays?, gapDays?, cancelDays?, bizHours?, bizDays? }
 */
export const adminUpdateConsultationConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { graceDays, gapDays, cancelDays, bizHours, bizDays } = req.body as {
    graceDays?: number;
    gapDays?: number;
    cancelDays?: number;
    bizHours?: number[];
    bizDays?: number[];
  };

  if (
    graceDays !== undefined &&
    (typeof graceDays !== "number" || graceDays < 0)
  ) {
    return res.status(400).json({ message: "graceDays inválido" });
  }
  if (gapDays !== undefined && (typeof gapDays !== "number" || gapDays < 0)) {
    return res.status(400).json({ message: "gapDays inválido" });
  }
  if (
    cancelDays !== undefined &&
    (typeof cancelDays !== "number" || cancelDays < 0)
  ) {
    return res.status(400).json({ message: "cancelDays inválido" });
  }
  if (bizHours !== undefined) {
    if (!Array.isArray(bizHours) || bizHours.some((h) => h < 0 || h > 23)) {
      return res.status(400).json({ message: "bizHours inválido" });
    }
  }
  if (bizDays !== undefined) {
    if (!Array.isArray(bizDays) || bizDays.some((d) => d < 0 || d > 6)) {
      return res
        .status(400)
        .json({ message: "bizDays inválido (0=Dom, 6=Sáb)" });
    }
  }

  const config = await prisma.consultationConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      graceDays: graceDays ?? DEFAULT_GRACE_DAYS,
      gapDays: gapDays ?? DEFAULT_GAP_DAYS,
      cancelDays: cancelDays ?? DEFAULT_CANCEL_DAYS,
      bizHours: bizHours ?? DEFAULT_BIZ_HOURS,
      bizDays: bizDays ?? DEFAULT_BIZ_DAYS,
    },
    update: {
      ...(graceDays !== undefined ? { graceDays } : {}),
      ...(gapDays !== undefined ? { gapDays } : {}),
      ...(cancelDays !== undefined ? { cancelDays } : {}),
      ...(bizHours !== undefined ? { bizHours } : {}),
      ...(bizDays !== undefined ? { bizDays } : {}),
    },
  });

  return res.json(config);
};

/**
 * GET /consultations/config  (public — for frontend to know business hours)
 */
export const getPublicConsultationConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const config = await getConfig();
  return res.json({
    graceDays: config.graceDays,
    gapDays: config.gapDays,
    cancelDays: config.cancelDays,
    bizHours: [...config.bizHours].sort((a, b) => a - b),
    bizDays: [...config.bizDays].sort((a, b) => a - b),
  });
};

/**
 * GET /consultations/blocked-dates?month=YYYY-MM  (public)
 * Returns all all-day blocked date strings for a given month
 */
export const getBlockedDates = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { month } = req.query as { month?: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res
      .status(400)
      .json({ message: "Parâmetro month inválido (YYYY-MM)" });
  }

  const [year, mon] = month.split("-").map(Number);
  const from = new Date(`${month}-01T00:00:00.000Z`);
  // last day of month
  const to = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

  const blocks = await prisma.agendaBlock.findMany({
    where: {
      allDay: true,
      blockedAt: { gte: from, lte: to },
    },
    select: { blockedAt: true },
  });

  // Return as "YYYY-MM-DD" strings (UTC midnight = the Brazil date)
  const dates = blocks.map((b) => b.blockedAt.toISOString().slice(0, 10));
  return res.json({ dates });
};
