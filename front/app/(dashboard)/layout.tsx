"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Sidebar from "@/components/layout/Sidebar";
import api from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, setAuth, token } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    // Atualiza dados do usuário (incluindo subscription) a cada mount
    api
      .get("/auth/me")
      .then((r) => {
        if (token) setAuth(r.data, token);
      })
      .catch(() => {});
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 pt-14 md:pt-0 p-4 sm:p-6 md:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
