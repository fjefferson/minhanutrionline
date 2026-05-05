"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "error";

export default function ConfirmarEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token, setAuth } = useAuthStore();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const success = searchParams.get("success");
    const tkn = searchParams.get("token");

    if (success === "1") {
      // Veio do redirect do backend após verificar com sucesso
      setState("success");
      // Atualiza o store se o usuário já estiver logado
      if (token) {
        api
          .get("/auth/me")
          .then((r) => setAuth(r.data, token))
          .catch(() => {});
      }
      return;
    }

    if (!tkn) {
      setState("error");
      setMessage("Link inválido.");
      return;
    }

    // Verifica o token via GET direto para o backend (o backend faz redirect)
    // Como o backend redireciona, chamamos via window.location para seguir o redirect
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/verify-email?token=${tkn}`;
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verificando seu e-mail...</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            E-mail confirmado!
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Sua conta está ativa. Você já pode acessar todas as ferramentas da
            plataforma.
          </p>
          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Ir para o dashboard
            </button>
          ) : (
            <Link
              href="/login"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Entrar na minha conta
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-10 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {message || "Este link expirou ou já foi utilizado."} Solicite um novo
          link de confirmação.
        </p>
        <Link
          href="/login"
          className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition text-sm"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
