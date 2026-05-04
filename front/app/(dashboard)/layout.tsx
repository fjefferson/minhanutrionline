"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import OnboardingModal from "@/components/OnboardingModal";
import api from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, setAuth, token, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    // Atualiza dados do usuário (incluindo subscription e onboardingDone) a cada mount
    api
      .get("/auth/me")
      .then((r) => {
        if (token) setAuth(r.data, token);
      })
      .catch(() => {});
  }, []);

  if (!mounted) return null;

  const showOnboarding = user?.role === "USER" && !user?.onboardingDone;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
      {showOnboarding && <OnboardingModal />}
    </div>
  );
}
