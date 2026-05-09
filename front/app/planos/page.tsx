"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import api from "@/lib/api";

interface Plan {
  id: string;
  type: string;
  name: string;
  priceInCents: number;
  features: string[];
  active: boolean;
}

interface ScheduledDowngrade {
  plan: { name: string; type: string };
  effectiveAt: string | null;
}

const HIGHLIGHT_TYPE = "PLUS";
const PLAN_HIERARCHY: Record<string, number> = {
  BASIC: 1,
  PLUS: 2,
  PREMIUM: 3,
};

export default function PlanosPage() {
  const { planType } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState<string | null>(planType());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scheduledDowngrade, setScheduledDowngrade] =
    useState<ScheduledDowngrade | null>(null);

  // Modal de downgrade
  const [downgradeTarget, setDowngradeTarget] = useState<Plan | null>(null);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [downgradeSuccess, setDowngradeSuccess] = useState<string | null>(null);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);

  // Cancelar downgrade agendado
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      api.get("/plans"),
      api.get("/subscriptions/me").catch(() => ({ data: null })),
    ])
      .then(([plansRes, subRes]) => {
        setPlans(plansRes.data.filter((p: Plan) => p.active));
        const sub = subRes.data;
        setCurrentPlan(
          sub?.status === "ACTIVE" ? (sub.plan?.type ?? null) : null,
        );
        if (sub?.scheduledDowngrade) {
          setScheduledDowngrade({
            plan: sub.scheduledDowngrade,
            effectiveAt: sub.currentPeriodEnd ?? null,
          });
        } else {
          setScheduledDowngrade(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchPlans(), 0);
    return () => clearTimeout(timeout);
  }, [fetchPlans]);

  const fmtPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const handlePlanClick = (plan: Plan) => {
    if (!currentPlan) return; // sem assinatura → vai para checkout normalmente
    const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
    const targetLevel = PLAN_HIERARCHY[plan.type] ?? 0;
    if (targetLevel < currentLevel) {
      // Downgrade → abre modal
      setDowngradeTarget(plan);
      setDowngradeError(null);
    }
    // Upgrade → Link para /checkout (comportamento padrão)
  };

  const confirmDowngrade = async () => {
    if (!downgradeTarget) return;
    setDowngradeLoading(true);
    setDowngradeError(null);
    try {
      const res = await api.post("/subscriptions/downgrade", {
        planType: downgradeTarget.type,
      });
      setDowngradeTarget(null);
      setDowngradeSuccess(
        `Downgrade agendado para ${downgradeTarget.name}${res.data.effectiveAt ? ` a partir de ${fmtDate(res.data.effectiveAt)}` : ""}.`,
      );
      fetchPlans();
    } catch (err: any) {
      setDowngradeError(
        err?.response?.data?.message ?? "Erro ao processar downgrade.",
      );
    } finally {
      setDowngradeLoading(false);
    }
  };

  const handleCancelDowngrade = async () => {
    setCancelLoading(true);
    try {
      await api.delete("/subscriptions/downgrade");
      setDowngradeSuccess(null);
      fetchPlans();
    } catch {
      // silencioso
    } finally {
      setCancelLoading(false);
    }
  };

  const currentPlanData = plans.find((p) => p.type === currentPlan);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Escolha seu plano
          </h1>
          <p className="text-gray-500 text-lg">
            Suporte dedicado para a sua jornada com GLP-1
          </p>
        </div>

        {/* Banner de downgrade agendado */}
        {scheduledDowngrade && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-xl">⚙</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Downgrade agendado para{" "}
                  <span className="font-bold">
                    {scheduledDowngrade.plan.name}
                  </span>
                </p>
                {scheduledDowngrade.effectiveAt && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Efetivo em {fmtDate(scheduledDowngrade.effectiveAt)} · Você
                    mantém o plano atual até lá
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleCancelDowngrade}
              disabled={cancelLoading}
              className="shrink-0 text-xs font-semibold text-amber-800 underline hover:no-underline disabled:opacity-50"
            >
              {cancelLoading ? "Cancelando..." : "Cancelar downgrade"}
            </button>
          </div>
        )}

        {/* Toast de sucesso */}
        {downgradeSuccess && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-6 py-4">
            <p className="text-sm font-medium text-green-800">
              ✓ {downgradeSuccess}
            </p>
            <button
              onClick={() => setDowngradeSuccess(null)}
              className="text-green-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-8 bg-white border border-gray-100 shadow-sm animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-10 bg-gray-200 rounded w-2/3 mb-6" />
                <div className="space-y-3 mb-8">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-3 bg-gray-100 rounded w-full" />
                  ))}
                </div>
                <div className="h-11 bg-gray-200 rounded-xl" />
              </div>
            ))
          ) : error ? (
            <div className="md:col-span-3 flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-gray-500 text-sm">
                Não foi possível carregar os planos.
              </p>
              <button
                onClick={fetchPlans}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            plans.map((plan) => {
              const isCurrent = currentPlan === plan.type;
              const highlight = plan.type === HIGHLIGHT_TYPE;
              const isDowngradeTarget =
                scheduledDowngrade?.plan.type === plan.type;
              const isDowngrade =
                currentPlan &&
                (PLAN_HIERARCHY[plan.type] ?? 0) <
                  (PLAN_HIERARCHY[currentPlan] ?? 0);

              return (
                <div
                  key={plan.type}
                  className={`rounded-2xl p-8 flex flex-col ${
                    highlight
                      ? "bg-green-600 text-white shadow-xl scale-105"
                      : "bg-white border border-gray-100 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {isCurrent && (
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full w-fit ${highlight ? "bg-white/20 text-white" : "bg-green-100 text-green-700"}`}
                      >
                        Plano atual
                      </span>
                    )}
                    {isDowngradeTarget && (
                      <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full w-fit">
                        ⚙ Downgrade agendado
                      </span>
                    )}
                  </div>
                  <h2
                    className={`font-bold text-xl mb-1 ${highlight ? "text-white" : "text-gray-900"}`}
                  >
                    {plan.name}
                  </h2>
                  <div className="flex items-end gap-1 my-4">
                    <span
                      className={`text-4xl font-bold ${highlight ? "text-white" : "text-gray-900"}`}
                    >
                      {fmtPrice(plan.priceInCents)}
                    </span>
                    <span
                      className={`text-sm mb-1 ${highlight ? "text-green-100" : "text-gray-400"}`}
                    >
                      /mês
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-start gap-2 text-sm ${highlight ? "text-green-50" : "text-gray-600"}`}
                      >
                        <span
                          className={`mt-0.5 ${highlight ? "text-green-200" : "text-green-500"}`}
                        >
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div
                      className={`text-center py-3 rounded-xl text-sm font-semibold ${highlight ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      Plano ativo
                    </div>
                  ) : isDowngrade ? (
                    <button
                      onClick={() => handlePlanClick(plan)}
                      disabled={!!scheduledDowngrade || !!isDowngradeTarget}
                      className={`block w-full text-center py-3 rounded-xl font-semibold transition text-sm ${
                        highlight
                          ? "bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                      }`}
                    >
                      {isDowngradeTarget
                        ? "Downgrade agendado"
                        : "Fazer downgrade"}
                    </button>
                  ) : (
                    <Link
                      href={`/checkout?plan=${plan.type}`}
                      className={`block text-center py-3 rounded-xl font-semibold transition text-sm ${
                        highlight
                          ? "bg-white text-green-700 hover:bg-green-50"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {currentPlan ? "Fazer upgrade" : "Assinar agora"}
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          As orientações são educacionais e não substituem consulta médica.
          Cancele quando quiser.
        </p>

        <div className="text-center mt-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-green-700 transition"
          >
            ← Voltar ao painel
          </Link>
        </div>
      </div>

      {/* Modal de confirmação de downgrade */}
      {downgradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Fazer downgrade para {downgradeTarget.name}?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Você continuará com o{" "}
              <strong>{currentPlanData?.name ?? "plano atual"}</strong> até o
              fim do seu ciclo de cobrança. Após isso, o plano mudará
              automaticamente.
            </p>

            {/* O que você perde */}
            {currentPlanData && (
              <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">
                  O que você deixará de ter
                </p>
                <ul className="space-y-1">
                  {currentPlanData.features
                    .filter((f) => !downgradeTarget.features.includes(f))
                    .map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-red-700"
                      >
                        <span className="mt-0.5">✕</span>
                        {f}
                      </li>
                    ))}
                  {currentPlanData.features.filter(
                    (f) => !downgradeTarget.features.includes(f),
                  ).length === 0 && (
                    <li className="text-sm text-red-600">
                      Nenhuma feature exclusiva identificada.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {downgradeError && (
              <p className="text-sm text-red-600 mb-4">{downgradeError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDowngradeTarget(null)}
                disabled={downgradeLoading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDowngrade}
                disabled={downgradeLoading}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {downgradeLoading ? "Aguarde..." : "Confirmar downgrade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
