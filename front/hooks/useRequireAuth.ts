"use client";

import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PLAN_HIERARCHY = { BASIC: 1, PLUS: 2, PREMIUM: 3 } as const;

export function useRequireAuth(minPlan?: "BASIC" | "PLUS" | "PREMIUM") {
  const { isAuthenticated, planType, hasActivePlan } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (minPlan && hasActivePlan()) {
      const current = planType();
      const currentLevel = current
        ? (PLAN_HIERARCHY[current as keyof typeof PLAN_HIERARCHY] ?? 0)
        : 0;
      if (currentLevel < PLAN_HIERARCHY[minPlan]) {
        router.push("/planos");
      }
    }
  }, [isAuthenticated, router, minPlan, hasActivePlan, planType]);
}
