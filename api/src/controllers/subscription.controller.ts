import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  findOrCreateCustomer,
  createAsaasSubscription,
  getAsaasSubscriptionPaymentStatus,
  cancelAsaasSubscription,
} from "../services/asaas.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendWelcomeEmail } from "../services/sendpulse.service";

// POST /subscriptions/checkout
export async function checkout(req: Request, res: Response) {
  const { planType } = req.body as { planType: string };
  const user = (req as AuthenticatedRequest).user!;

  const validTypes = ["BASIC", "PLUS", "PREMIUM"];
  if (!validTypes.includes(planType)) {
    res.status(400).json({ message: "Plano invalido" });
    return;
  }

  const [plan, dbUser] = await Promise.all([
    prisma.plan.findFirst({
      where: { type: planType as "BASIC" | "PLUS" | "PREMIUM", active: true },
    }),
    prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    }),
  ]);

  if (!plan) {
    res.status(404).json({ message: "Plano nao encontrado" });
    return;
  }

  try {
    const customerId = await findOrCreateCustomer(
      user.email,
      dbUser?.name ?? user.email,
    );
    const asaasSub = await createAsaasSubscription({
      customerId,
      planName: plan.name,
      amountBRL: plan.priceInCents / 100,
      externalReference: `${user.userId}-${plan.type}`,
    });

    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.userId },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { userId: user.userId },
        data: {
          mpSubscriptionId: asaasSub.id,
          pendingPlanId: plan.id,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.userId,
          planId: plan.id,
          mpSubscriptionId: asaasSub.id,
          status: "PENDING",
        },
      });
    }

    res.json({ init_point: asaasSub.paymentUrl });
  } catch (err: any) {
    console.error("Asaas checkout error:", err?.response?.data ?? err?.message);
    res.status(502).json({
      message: "Erro ao criar assinatura no Asaas",
      debug: err?.response?.data?.errors?.[0]?.description ?? err?.message,
    });
  }
}

// GET /subscriptions/me
export async function getMySubscription(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).user!;
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.userId },
    include: { plan: true },
  });

  // Se pendente, verifica pagamento no Asaas e ativa se confirmado
  if (sub?.status === "PENDING" && sub.mpSubscriptionId) {
    try {
      const asaasStatus = await getAsaasSubscriptionPaymentStatus(
        sub.mpSubscriptionId,
      );
      if (asaasStatus === "ACTIVE") {
        const now = new Date();
        const updated = await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: new Date(
              now.getTime() + 30 * 24 * 60 * 60 * 1000,
            ),
            ...(sub.pendingPlanId
              ? { planId: sub.pendingPlanId, pendingPlanId: null }
              : {}),
          },
          include: { plan: true },
        });
        if (sub.user || true) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true, email: true },
          });
          if (dbUser)
            sendWelcomeEmail({ name: dbUser.name, email: dbUser.email }).catch(
              () => {},
            );
        }
        res.json(updated);
        return;
      }
    } catch {
      // ignora erro de verificação — retorna status atual
    }
  }

  // Se cancelamento agendado e período expirou → efetiva o cancelamento
  if (
    sub?.cancelScheduledAt &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd < new Date()
  ) {
    const expired = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "CANCELED" },
      include: { plan: true },
    });
    res.json(expired);
    return;
  }

  res.json(sub ?? null);
}

// POST /subscriptions/upgrade
export async function upgradeSubscription(req: Request, res: Response) {
  const { planType } = req.body as { planType: string };
  const user = (req as AuthenticatedRequest).user!;

  const validTypes = ["BASIC", "PLUS", "PREMIUM"];
  if (!validTypes.includes(planType)) {
    res.status(400).json({ message: "Plano inválido" });
    return;
  }

  const [sub, newPlan, dbUser] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: { plan: true },
    }),
    prisma.plan.findFirst({
      where: { type: planType as "BASIC" | "PLUS" | "PREMIUM", active: true },
    }),
    prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    }),
  ]);

  if (!sub || sub.status === "CANCELED") {
    res
      .status(400)
      .json({ message: "Nenhuma assinatura ativa para fazer upgrade" });
    return;
  }

  if (!newPlan) {
    res.status(404).json({ message: "Plano não encontrado" });
    return;
  }

  // Não permitir "upgrade" para o mesmo plano
  if (sub.planId === newPlan.id) {
    res.status(400).json({ message: "Você já está neste plano" });
    return;
  }

  // --- Cálculo de prorateamento ---
  // Quanto já foi pago × dias restantes do ciclo atual
  let firstPaymentAmountBRL: number | undefined;
  let proratedInfo:
    | {
        daysRemaining: number;
        credit: number;
        charge: number;
        firstPayment: number;
      }
    | undefined;

  if (sub.currentPeriodStart) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUsed = Math.max(
      0,
      Math.floor((Date.now() - sub.currentPeriodStart.getTime()) / msPerDay),
    );
    const daysRemaining = Math.max(0, 30 - daysUsed);

    if (daysRemaining > 0) {
      const oldDailyRate = sub.plan.priceInCents / 100 / 30;
      const newDailyRate = newPlan.priceInCents / 100 / 30;
      const credit = Math.round(daysRemaining * oldDailyRate * 100) / 100;
      const charge = Math.round(daysRemaining * newDailyRate * 100) / 100;
      const firstPayment = Math.max(
        0.01,
        Math.round((charge - credit) * 100) / 100,
      );

      firstPaymentAmountBRL = firstPayment;
      proratedInfo = { daysRemaining, credit, charge, firstPayment };
    }
  }

  try {
    // 1. Cancela assinatura atual no Asaas
    if (sub.mpSubscriptionId) {
      await cancelAsaasSubscription(sub.mpSubscriptionId);
    }

    // 2. Cria nova assinatura no Asaas com o novo plano (1ª cobrança com desconto proporcional)
    const customerId = await findOrCreateCustomer(
      user.email,
      dbUser?.name ?? user.email,
    );
    const asaasSub = await createAsaasSubscription({
      customerId,
      planName: newPlan.name,
      amountBRL: newPlan.priceInCents / 100,
      externalReference: `${user.userId}-${newPlan.type}`,
      firstPaymentAmountBRL,
    });

    // 3. Atualiza DB: nova sub ID, plano pendente, zera cancelamento agendado
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        mpSubscriptionId: asaasSub.id,
        pendingPlanId: newPlan.id,
        status: "PENDING",
        cancelScheduledAt: null,
      },
    });

    res.json({ init_point: asaasSub.paymentUrl, proratedInfo });
  } catch (err: any) {
    console.error("Upgrade error:", err?.response?.data ?? err?.message);
    res.status(502).json({
      message: "Erro ao processar upgrade",
      debug: err?.response?.data?.errors?.[0]?.description ?? err?.message,
    });
  }
}

// DELETE /subscriptions/me
export async function cancelSubscription(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).user!;

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.userId },
  });

  if (!sub || sub.status === "CANCELED" || sub.cancelScheduledAt) {
    res.status(400).json({
      message: "Assinatura já cancelada ou com cancelamento agendado",
    });
    return;
  }

  try {
    if (sub.mpSubscriptionId) {
      await cancelAsaasSubscription(sub.mpSubscriptionId);
    }

    // Acesso mantido até o fim do período (30 dias a partir da última cobrança ou agora)
    const accessUntil =
      sub.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelScheduledAt: new Date(),
        currentPeriodEnd: accessUntil,
        // status permanece ACTIVE — acesso só encerra ao fim do período
      },
    });
    res.json({
      message:
        "Cancelamento agendado. Seu acesso permanece ativo até o fim do período.",
    });
  } catch (err: any) {
    console.error(
      "Cancel subscription error:",
      err?.response?.data ?? err?.message,
    );
    res.status(502).json({
      message: "Erro ao cancelar assinatura",
      debug: err?.response?.data?.errors?.[0]?.description ?? err?.message,
    });
  }
}

// POST /webhooks/asaas (public)
export async function asaasWebhook(req: Request, res: Response) {
  const body = req.body as {
    event: string;
    payment?: { subscription?: string; status?: string };
  };

  const eventStatusMap: Record<string, "ACTIVE" | "CANCELED" | "PAST_DUE"> = {
    PAYMENT_CONFIRMED: "ACTIVE",
    PAYMENT_RECEIVED: "ACTIVE",
    PAYMENT_OVERDUE: "PAST_DUE",
    // SUBSCRIPTION_DELETED não seta CANCELED diretamente — acesso continua até currentPeriodEnd
  };

  const status = eventStatusMap[body.event] ?? null;
  const asaasSubId = body.payment?.subscription;

  if (status && asaasSubId) {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { mpSubscriptionId: asaasSubId },
        include: { user: { select: { name: true, email: true } } },
      });

      if (sub) {
        const now = new Date();
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status,
            ...(status === "ACTIVE"
              ? {
                  currentPeriodStart: now,
                  currentPeriodEnd: new Date(
                    now.getTime() + 30 * 24 * 60 * 60 * 1000,
                  ),
                }
              : {}),
            ...(status === "ACTIVE" && sub.pendingPlanId
              ? { planId: sub.pendingPlanId, pendingPlanId: null }
              : {}),
          },
        });

        if (status === "ACTIVE" && sub.user) {
          sendWelcomeEmail({ name: sub.user.name, email: sub.user.email });
        }
      }
    } catch (err) {
      console.error("Asaas webhook error:", err);
    }
  }

  res.sendStatus(200);
}
