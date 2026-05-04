import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createMpSubscription,
  getMpSubscription,
} from "../services/mp.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendWelcomeEmail } from "../services/sendpulse.service";

const PLAN_PRICE: Record<string, number> = {
  BASIC: 19.9,
  PLUS: 49.9,
  PREMIUM: 149.9,
};

// POST /subscriptions/checkout
export async function checkout(req: Request, res: Response) {
  const { planType } = req.body as { planType: string };
  const user = (req as AuthenticatedRequest).user!;

  if (!(planType in PLAN_PRICE)) {
    res.status(400).json({ message: "Plano invalido" });
    return;
  }

  const plan = await prisma.plan.findFirst({
    where: { type: planType as "BASIC" | "PLUS" | "PREMIUM", active: true },
  });

  if (!plan) {
    res.status(404).json({ message: "Plano nao encontrado" });
    return;
  }

  try {
    const mpSub = await createMpSubscription({
      payerEmail: user.email,
      planName: plan.name,
      amountBRL: PLAN_PRICE[planType],
    });

    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.userId },
    });

    if (existingSub) {
      // Usuário já tem assinatura — guarda o novo plano como pendente
      // O planId atual NÃO é alterado até que o pagamento seja confirmado pelo webhook
      await prisma.subscription.update({
        where: { userId: user.userId },
        data: {
          pendingPlanId: plan.id,
          mpSubscriptionId: mpSub.id,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.userId,
          planId: plan.id,
          mpSubscriptionId: mpSub.id,
          status: "PENDING",
        },
      });
    }

    res.json({ init_point: mpSub.init_point });
  } catch (err) {
    console.error("MP checkout error:", err);
    res
      .status(502)
      .json({ message: "Erro ao criar assinatura no Mercado Pago" });
  }
}

// GET /subscriptions/me
export async function getMySubscription(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).user!;
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.userId },
    include: { plan: true },
  });
  res.json(sub ?? null);
}

// POST /webhooks/mp (public)
export async function mpWebhook(req: Request, res: Response) {
  const { type, data } = req.body as { type: string; data?: { id?: string } };

  if (type === "subscription_preapproval" && data?.id) {
    try {
      const mpSub = await getMpSubscription(data.id);
      const statusMap: Record<string, "ACTIVE" | "CANCELED" | "PAST_DUE"> = {
        authorized: "ACTIVE",
        cancelled: "CANCELED",
        paused: "PAST_DUE",
      };
      const status = statusMap[mpSub.status ?? ""] ?? null;
      if (status) {
        const sub = await prisma.subscription.findFirst({
          where: { mpSubscriptionId: data.id },
          include: { user: { select: { name: true, email: true } } },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status,
              mpPayerId: String(mpSub.payer_id ?? ""),
              // Ao confirmar pagamento, promove o plano pendente para plano ativo
              ...(status === "ACTIVE" && sub.pendingPlanId
                ? { planId: sub.pendingPlanId, pendingPlanId: null }
                : {}),
            },
          });

          // Dispara e-mail de boas-vindas na primeira ativação
          if (status === "ACTIVE" && sub.user) {
            sendWelcomeEmail({ name: sub.user.name, email: sub.user.email });
          }
        }
      }
    } catch (err) {
      console.error("Webhook error:", err);
    }
  }

  res.sendStatus(200);
}
