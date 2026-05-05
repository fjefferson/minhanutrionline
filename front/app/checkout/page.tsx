"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface PlanInfo {
  id: string;
  type: string;
  name: string;
  priceInCents: number;
}

type Stage = "confirm" | "waiting" | "success";

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
  const { isAuthenticated, setAuth, token, user } = useAuthStore();
  const planType = params.get("plan")?.toUpperCase() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [allPlans, setAllPlans] = useState<PlanInfo[]>([]);
  const [stage, setStage] = useState<Stage>("confirm");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detecta se é upgrade
  const currentSub = user?.subscription;
  const isUpgrade =
    currentSub?.status === "ACTIVE" && currentSub.plan?.type !== planType;

  // Calcula prorateamento client-side
  const proration = (() => {
    if (!isUpgrade || !currentSub?.currentPeriodStart || !plan) return null;
    const currentPlan = allPlans.find((p) => p.type === currentSub.plan?.type);
    if (!currentPlan) return null;
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUsed = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(currentSub.currentPeriodStart).getTime()) /
          msPerDay,
      ),
    );
    const daysRemaining = Math.max(0, 30 - daysUsed);
    if (daysRemaining === 0) return null;
    const credit =
      Math.round(
        ((daysRemaining * currentPlan.priceInCents) / 100 / 30) * 100,
      ) / 100;
    const charge =
      Math.round(((daysRemaining * plan.priceInCents) / 100 / 30) * 100) / 100;
    const firstPayment = Math.max(
      0.01,
      Math.round((charge - credit) * 100) / 100,
    );
    return { daysRemaining, credit, charge, firstPayment };
  })();

  useEffect(() => {
    if (!isAuthenticated())
      router.push("/login?next=/checkout?plan=" + planType);
    if (!planType) {
      router.push("/planos");
      return;
    }
    api
      .get<PlanInfo[]>("/plans/public")
      .then((res) => {
        setAllPlans(res.data);
        const found = res.data.find((p) => p.type === planType);
        if (!found) router.push("/planos");
        else setPlan(found);
      })
      .catch(() => router.push("/planos"));
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ status: string } | null>(
          "/subscriptions/me",
        );
        if (res.data?.status === "ACTIVE") {
          clearInterval(pollRef.current!);
          setStage("success");
          // Atualiza o store com os dados mais recentes antes de redirecionar
          try {
            const me = await api.get("/auth/me");
            if (token) setAuth(me.data, token);
          } catch {}
          setTimeout(() => router.push("/dashboard"), 3000);
        }
      } catch {
        // ignora erros de polling
      }
    }, 3000);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isUpgrade
        ? "/subscriptions/upgrade"
        : "/subscriptions/checkout";
      const payload = isUpgrade ? { planType } : { planType };
      const res = await api.post(endpoint, payload);
      if (res.data?.init_point) {
        window.open(res.data.init_point, "_blank", "noopener,noreferrer");
        setStage("waiting");
        startPolling();
      } else {
        setError("Link de pagamento não retornado. Tente novamente.");
      }
    } catch {
      setError("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  const priceFormatted = (plan.priceInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full">
        {stage === "confirm" && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">💳</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {isUpgrade ? "Confirmar upgrade" : "Confirmar assinatura"}
              </h1>
              <p className="text-gray-500 text-sm">
                Você será redirecionado para a página de pagamento
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-5 mb-8">
              <p className="font-semibold text-gray-900 text-lg">{plan.name}</p>
              {proration ? (
                <>
                  <p className="text-green-700 font-bold text-2xl mt-1">
                    R$ {proration.firstPayment.toFixed(2).replace(".", ",")}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      hoje
                    </span>
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-gray-500 border-t border-green-100 pt-3">
                    <div className="flex justify-between">
                      <span>Dias restantes no ciclo atual</span>
                      <span className="font-medium text-gray-700">
                        {proration.daysRemaining} dias
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Crédito do plano atual</span>
                      <span className="font-medium text-green-700">
                        − R$ {proration.credit.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Novo plano ({proration.daysRemaining} dias)</span>
                      <span className="font-medium text-gray-700">
                        R$ {proration.charge.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    A partir do 2º mês: {priceFormatted}/mês
                  </p>
                </>
              ) : (
                <>
                  <p className="text-green-700 font-bold text-2xl mt-1">
                    {priceFormatted}/mês
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Cobrança recorrente mensal · Cancele quando quiser
                  </p>
                </>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 text-lg"
            >
              {loading ? "Aguarde..." : "Assinar agora"}
            </button>

            <button
              onClick={() => router.push("/planos")}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Voltar para planos
            </button>

            <p className="text-center text-xs text-gray-400 mt-6">
              Pagamento 100% seguro
            </p>
          </>
        )}

        {stage === "waiting" && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Aguardando pagamento
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Conclua o pagamento na aba que foi aberta. Esta página será
              atualizada automaticamente assim que confirmarmos.
            </p>
            <button
              onClick={() => {
                if (pollRef.current) clearInterval(pollRef.current);
                setStage("confirm");
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        )}

        {stage === "success" && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Pagamento confirmado!
            </h2>
            <p className="text-gray-500 text-sm">
              Sua assinatura está ativa. Redirecionando para o dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
