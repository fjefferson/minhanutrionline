"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import OnboardingModal from "@/components/OnboardingModal";
import api from "@/lib/api";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, setAuth, token, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [resentEmail, setResentEmail] = useState(false);
  const [resending, setResending] = useState(false);

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

  // Usuário autenticado mas e-mail não confirmado → bloquear com overlay
  const emailNotVerified =
    user?.role === "USER" && user?.emailVerified === false;

  const handleResend = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: user.email });
      setResentEmail(true);
    } catch {
      // silencioso
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {emailNotVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-800 flex-1">
              <strong>Confirme seu e-mail</strong> para liberar o acesso
              completo à plataforma. Verifique sua caixa de entrada ou pasta de
              spam.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {resentEmail ? (
                <span className="text-xs text-green-700 font-semibold">
                  ✓ E-mail enviado!
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold hover:text-amber-900 transition disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`}
                  />
                  {resending ? "Enviando..." : "Reenviar"}
                </button>
              )}
              <Link
                href="/login"
                className="text-xs text-amber-600 hover:underline"
              >
                Sair
              </Link>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
      {showOnboarding && <OnboardingModal />}
    </div>
  );
}
