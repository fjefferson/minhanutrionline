"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const PLAN_INFO: Record<string, { name: string; price: string }> = {
  BASIC: { name: "GLP-1 Basic", price: "R$ 19,90/mês" },
  PLUS: { name: "GLP-1 Plus", price: "R$ 49,90/mês" },
  PREMIUM: { name: "GLP-1 Premium", price: "R$ 149,90/mês" },
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-400">Carregando...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const planType = params.get("plan")?.toUpperCase() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = PLAN_INFO[planType];

  useEffect(() => {
    if (!isAuthenticated())
      router.push("/login?next=/checkout?plan=" + planType);
    if (!plan) router.push("/planos");
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/subscriptions/checkout", { planType });
      if (res.data?.init_point) {
        window.location.href = res.data.init_point;
      } else {
        setError("Link de pagamento não retornado. Tente novamente.");
        setLoading(false);
      }
    } catch {
      setError("Erro ao iniciar pagamento. Tente novamente.");
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">💳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Confirmar assinatura
          </h1>
          <p className="text-gray-500 text-sm">
            Você será redirecionado para o Mercado Pago
          </p>
        </div>

        <div className="bg-green-50 rounded-xl p-5 mb-8">
          <p className="font-semibold text-gray-900 text-lg">{plan.name}</p>
          <p className="text-green-700 font-bold text-2xl mt-1">{plan.price}</p>
          <p className="text-gray-500 text-xs mt-2">
            Cobrança recorrente mensal · Cancele quando quiser
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 text-lg"
        >
          {loading ? "Aguarde..." : "Pagar com Mercado Pago"}
        </button>

        <button
          onClick={() => router.push("/planos")}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Voltar para planos
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          Pagamento 100% seguro processado pelo Mercado Pago
        </p>
      </div>
    </div>
  );
}
