"use client";

import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useRequireAuth(minPlan?: "BASIC" | "PLUS" | "PREMIUM") {
  const { isAuthenticated, planType, hasActivePlan } = useAuthStore();
  const router = useRouter();

  const planHierarchy = { BASIC: 1, PLUS: 2, PREMIUM: 3 };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (minPlan && hasActivePlan()) {
      const current = planType();
      const currentLevel = current
        ? (planHierarchy[current as keyof typeof planHierarchy] ?? 0)
        : 0;
      if (currentLevel < planHierarchy[minPlan]) {
        router.push("/planos");
      }
    }
  }, [isAuthenticated, router, minPlan, hasActivePlan, planType]);
}
