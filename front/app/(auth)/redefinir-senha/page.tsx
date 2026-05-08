"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(() =>
    token ? "" : "Link inválido ou expirado.",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao redefinir senha.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-14 h-14 text-green-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Senha redefinida!
        </h2>
        <p className="text-sm text-gray-500">
          Sua senha foi alterada com sucesso. Redirecionando para o login...
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-green-600 font-medium hover:underline"
        >
          Ir para o login →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nova senha
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p className="text-xs text-gray-400 mt-1">Mínimo de 6 caracteres</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar nova senha
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !token}
        className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-2">
          MinhaNutri Online
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Criar nova senha
        </p>
        <Suspense
          fallback={
            <p className="text-center text-sm text-gray-400">Carregando...</p>
          }
        >
          <RedefinirSenhaForm />
        </Suspense>
      </div>
    </div>
  );
}
