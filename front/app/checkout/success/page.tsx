"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

export default function CheckoutSuccessPage() {
  const { setAuth, user, token } = useAuthStore();

  // Refresh user data to pick up new subscription
  useEffect(() => {
    if (!token) return;
    api
      .get("/auth/me")
      .then((res) => {
        if (user && token) setAuth(res.data, token);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Pagamento recebido!
        </h1>
        <p className="text-gray-500 mb-2">
          Sua assinatura está sendo processada com segurança.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Em alguns instantes seu acesso será liberado automaticamente.
        </p>

        <Link
          href="/dashboard"
          className="block w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition text-center"
        >
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
