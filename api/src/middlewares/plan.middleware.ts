import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../lib/prisma";
import { PlanType } from "../types";

const planHierarchy: Record<PlanType, number> = {
  BASIC: 1,
  PLUS: 2,
  PREMIUM: 3,
};

export const requirePlan = (minimumPlan: PlanType) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Não autenticado" });
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.userId,
        status: "ACTIVE",
      },
      include: { plan: true },
    });

    if (!subscription) {
      res.status(403).json({ message: "Assinatura ativa necessária" });
      return;
    }

    const userPlanLevel =
      planHierarchy[subscription.plan.type as PlanType] ?? 0;
    const requiredLevel = planHierarchy[minimumPlan];

    if (userPlanLevel < requiredLevel) {
      res.status(403).json({
        message: `Esta funcionalidade requer o plano ${minimumPlan} ou superior`,
      });
      return;
    }

    next();
  };
};
