import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  findOrCreateCustomer,
  createAsaasSubscription,
  getAsaasSubscriptionPaymentStatus,
  cancelAsaasSubscription,
  updateAsaasSubscriptionValue,
} from "../services/asaas.service";

const PLAN_HIERARCHY: Record<string, number> = {
  BASIC: 1,
  PLUS: 2,
  PREMIUM: 3,
};
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendWelcomeEmail } from "../services/sendpulse.service";
import { ASAAS_WEBHOOK_TOKEN } from "../config/env";

// POST /subscriptions/checkout
export async function checkout(req: Request, res: Response) {
  const { planType, cpfCnpj } = req.body as {
    planType: string;
    cpfCnpj?: string;
  };
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
      cpfCnpj,
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
  let sub = await prisma.subscription.findUnique({
    where: { userId: user.userId },
    include: {
      plan: true,
      scheduledDowngrade: { select: { id: true, name: true, type: true } },
    },
  });

  // Se tem um upgrade pendente, verifica pagamento do novo ID no Asaas e ativa se confirmado
  if (sub?.pendingMpSubscriptionId) {
    try {
      const upgradeStatus = await getAsaasSubscriptionPaymentStatus(
        sub.pendingMpSubscriptionId,
      );
      if (upgradeStatus === "ACTIVE") {
        const now = new Date();

        // Cancela a assinatura antiga no Asaas (já que confirmou a nova)
        if (sub.mpSubscriptionId) {
          try {
            await cancelAsaasSubscription(sub.mpSubscriptionId);
          } catch (e) {
            console.error(
              "Erro ao cancelar sub antiga após upgrade via poll:",
              e,
            );
          }
        }

        const targetPlanId = sub.pendingPlanId ?? sub.planId;
        const targetPlan = await prisma.plan.findUnique({
          where: { id: targetPlanId },
          select: { priceInCents: true },
        });

        sub = await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: new Date(
              now.getTime() + 30 * 24 * 60 * 60 * 1000,
            ),
            mpSubscriptionId: sub.pendingMpSubscriptionId,
            pendingMpSubscriptionId: null,
            ...(sub.pendingPlanId
              ? { planId: sub.pendingPlanId, pendingPlanId: null }
              : {}),
          },
          include: {
            plan: true,
            scheduledDowngrade: {
              select: { id: true, name: true, type: true },
            },
          },
        });

        if (targetPlan && sub.mpSubscriptionId) {
          updateAsaasSubscriptionValue(
            sub.mpSubscriptionId,
            targetPlan.priceInCents / 100,
          ).catch((err) => console.warn(err?.message));
        }
      }
    } catch (err) {
      console.warn("Erro ao checar status de upgrade pendente", err);
    }
  }

  // Se a própria assinatura principal estiver pendente (checkout inicial), verifica
  if (sub?.status === "PENDING" && sub.mpSubscriptionId) {
    try {
      const asaasStatus = await getAsaasSubscriptionPaymentStatus(
        sub.mpSubscriptionId,
      );
      if (asaasStatus === "ACTIVE") {
        const now = new Date();

        // Busca o plano alvo para saber o preço cheio (necessário no upgrade)
        const targetPlanId = sub.pendingPlanId ?? sub.planId;
        const targetPlan = await prisma.plan.findUnique({
          where: { id: targetPlanId },
          select: { priceInCents: true },
        });

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

        // Se foi criada com valor proporcional (upgrade), corrige o valor recorrente no Asaas
        if (targetPlan && sub.mpSubscriptionId) {
          updateAsaasSubscriptionValue(
            sub.mpSubscriptionId,
            targetPlan.priceInCents / 100,
          ).catch((err) =>
            console.warn(
              "Aviso: não foi possível atualizar valor recorrente no Asaas:",
              err?.message,
            ),
          );
        }

        {
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

const planHierarchyLocal = PLAN_HIERARCHY;

// POST /subscriptions/downgrade
export async function downgradeSubscription(req: Request, res: Response) {
  const { planType } = req.body as { planType: string };
  const user = (req as AuthenticatedRequest).user!;

  const validTypes = ["BASIC", "PLUS", "PREMIUM"];
  if (!validTypes.includes(planType)) {
    res.status(400).json({ message: "Plano inválido" });
    return;
  }

  const [sub, newPlan] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: { plan: true },
    }),
    prisma.plan.findFirst({
      where: { type: planType as "BASIC" | "PLUS" | "PREMIUM", active: true },
    }),
  ]);

  if (!sub || sub.status !== "ACTIVE") {
    res.status(400).json({ message: "Nenhuma assinatura ativa" });
    return;
  }

  if (sub.cancelScheduledAt) {
    res.status(400).json({
      message:
        "Você já tem um cancelamento agendado. Não é possível agendar downgrade.",
    });
    return;
  }

  if (!newPlan) {
    res.status(404).json({ message: "Plano não encontrado" });
    return;
  }

  const currentLevel = planHierarchyLocal[sub.plan.type] ?? 0;
  const newLevel = planHierarchyLocal[planType] ?? 0;

  if (newLevel >= currentLevel) {
    res.status(400).json({
      message: "Para subir de plano use o endpoint de upgrade",
    });
    return;
  }

  if (sub.scheduledDowngradePlanId === newPlan.id) {
    res
      .status(400)
      .json({ message: "Downgrade para este plano já está agendado" });
    return;
  }

  try {
    // Atualiza imediatamente o valor recorrente no Asaas (próxima cobrança)
    if (sub.mpSubscriptionId) {
      await updateAsaasSubscriptionValue(
        sub.mpSubscriptionId,
        newPlan.priceInCents / 100,
      );
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { scheduledDowngradePlanId: newPlan.id },
    });

    res.json({
      message: "Downgrade agendado com sucesso",
      effectiveAt: sub.currentPeriodEnd,
      newPlan: { name: newPlan.name, type: newPlan.type },
    });
  } catch (err: any) {
    console.error("Downgrade error:", err?.response?.data ?? err?.message);
    res.status(502).json({
      message: "Erro ao processar downgrade",
      debug: err?.response?.data?.errors?.[0]?.description ?? err?.message,
    });
  }
}

// DELETE /subscriptions/downgrade
export async function cancelDowngrade(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).user!;

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.userId },
    include: { plan: true, scheduledDowngrade: true },
  });

  if (!sub || !sub.scheduledDowngradePlanId) {
    res.status(400).json({ message: "Nenhum downgrade agendado" });
    return;
  }

  try {
    // Reverte o valor no Asaas para o plano atual
    if (sub.mpSubscriptionId) {
      await updateAsaasSubscriptionValue(
        sub.mpSubscriptionId,
        sub.plan.priceInCents / 100,
      );
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { scheduledDowngradePlanId: null },
    });

    res.json({
      message: "Downgrade cancelado. Seu plano atual permanece ativo.",
    });
  } catch (err: any) {
    console.error(
      "Cancel downgrade error:",
      err?.response?.data ?? err?.message,
    );
    res.status(502).json({
      message: "Erro ao cancelar downgrade",
      debug: err?.response?.data?.errors?.[0]?.description ?? err?.message,
    });
  }
}

// POST /subscriptions/test-apply-downgrade  ← apenas para testes locais
export async function testApplyDowngrade(req: Request, res: Response) {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ message: "Não disponível em produção" });
    return;
  }

  const user = (req as AuthenticatedRequest).user!;
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.userId },
    include: { scheduledDowngrade: true },
  });

  if (!sub?.scheduledDowngradePlanId) {
    res
      .status(400)
      .json({ message: "Nenhum downgrade agendado para este usuário" });
    return;
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      planId: sub.scheduledDowngradePlanId,
      scheduledDowngradePlanId: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  res.json({
    message: "Downgrade aplicado (simulação de webhook)",
    newPlanId: sub.scheduledDowngradePlanId,
  });
}

// POST /subscriptions/upgrade
export async function upgradeSubscription(req: Request, res: Response) {
  const { planType, cpfCnpj } = req.body as {
    planType: string;
    cpfCnpj?: string;
  };
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
        5.0, // O Asaas exige valor mínimo de R$ 5,00 para criar a cobrança
        Math.round((charge - credit) * 100) / 100,
      );

      firstPaymentAmountBRL = firstPayment;
      proratedInfo = { daysRemaining, credit, charge, firstPayment };
    }
  }

  try {
    // Não cancela a assinatura atual no Asaas aqui (só cancela quando pagar o upgrade)

    // 2. Cria nova assinatura no Asaas com o novo plano (1ª cobrança com desconto proporcional)
    const customerId = await findOrCreateCustomer(
      user.email,
      dbUser?.name ?? user.email,
      cpfCnpj,
    );
    const asaasSub = await createAsaasSubscription({
      customerId,
      planName: newPlan.name,
      amountBRL: newPlan.priceInCents / 100,
      externalReference: `${user.userId}-${newPlan.type}`,
      firstPaymentAmountBRL,
    });

    // 3. Atualiza DB: salva nova sub ID como pendente, plano pendente, zera cancelamento agendado, mantém status ACTIVE
    try {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          pendingMpSubscriptionId: asaasSub.id,
          pendingPlanId: newPlan.id,
          cancelScheduledAt: null,
        },
      });
    } catch (dbErr) {
      // ROLLBACK: Se der erro no nosso banco, cancela a assinatura gerada no Asaas para não cobrar o cliente à toa
      await cancelAsaasSubscription(asaasSub.id).catch((e) =>
        console.error("Erro ao fazer rollback no asaas:", e.message),
      );
      throw dbErr; // Joga o erro para o catch externo
    }

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
  // Valida token de segurança configurado na plataforma Asaas
  if (ASAAS_WEBHOOK_TOKEN) {
    const incomingToken = req.headers["asaas-access-token"];
    if (incomingToken !== ASAAS_WEBHOOK_TOKEN) {
      res.sendStatus(401);
      return;
    }
  }

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
      // Busca a assinatura onde o ID do Asaas bate com o principal OU com o pendente (upgrade)
      const sub = await prisma.subscription.findFirst({
        where: {
          OR: [
            { mpSubscriptionId: asaasSubId },
            { pendingMpSubscriptionId: asaasSubId },
          ],
        },
        include: { user: { select: { name: true, email: true } } },
      });

      if (sub) {
        const now = new Date();
        const isUpgradeConfirm =
          sub.pendingMpSubscriptionId === asaasSubId && status === "ACTIVE";

        // Se for uma confirmação de upgrade, cancela a assinatura antiga no Asaas
        if (isUpgradeConfirm && sub.mpSubscriptionId) {
          try {
            await cancelAsaasSubscription(sub.mpSubscriptionId);
          } catch (e) {
            console.error(
              "Erro ao cancelar assinatura antiga após upgrade:",
              e,
            );
          }
        }

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
            // Se foi pago o upgrade, consolida o mpSubscriptionId
            ...(isUpgradeConfirm
              ? { mpSubscriptionId: asaasSubId, pendingMpSubscriptionId: null }
              : {}),
            ...(status === "ACTIVE" &&
            !sub.pendingPlanId &&
            sub.scheduledDowngradePlanId
              ? {
                  planId: sub.scheduledDowngradePlanId,
                  scheduledDowngradePlanId: null,
                }
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
