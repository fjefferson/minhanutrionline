"use client";

import { useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function VerificarEmailPage() {
  const { user } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    setError("");
    setSent(false);
    try {
      await api.post("/auth/resend-verification", { email: user.email });
      setSent(true);
    } catch {
      setError("Não foi possível reenviar. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-10 text-center">
        {/* Ícone */}
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-green-600" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Confirme seu e-mail
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Enviamos um link de confirmação para
        </p>
        {user?.email && (
          <p className="text-gray-900 font-semibold text-sm mb-6">
            {user.email}
          </p>
        )}
        <p className="text-gray-400 text-xs leading-relaxed mb-8">
          Verifique sua caixa de entrada e a pasta de spam. Clique no link para
          ativar sua conta e liberar o acesso completo.
        </p>

        {/* Ação */}
        {sent ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-medium text-sm mb-6">
            <CheckCircle className="w-4 h-4" />
            Novo link enviado!
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-2 mx-auto text-sm text-green-700 font-semibold hover:text-green-800 transition disabled:opacity-50 mb-6"
          >
            <RefreshCw
              className={`w-4 h-4 ${resending ? "animate-spin" : ""}`}
            />
            {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
          </button>
        )}

        {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

        <p className="text-xs text-gray-400">
          E-mail errado?{" "}
          <Link href="/register" className="text-green-600 hover:underline">
            Crie uma nova conta
          </Link>
          {" · "}
          <Link href="/login" className="text-green-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
