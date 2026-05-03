"use client";

import { useEffect, useState } from "react";
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

const HIGHLIGHT_TYPE = "PLUS";

export default function PlanosPage() {
  const { planType } = useAuthStore();
  const currentPlan = planType();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    api
      .get("/plans")
      .then((r) => setPlans(r.data.filter((p: Plan) => p.active)))
      .catch(() => {});
  }, []);

  const fmtPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Escolha seu plano
          </h1>
          <p className="text-gray-500 text-lg">
            Suporte especializado para a sua jornada com GLP-1
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.type;
            const highlight = plan.type === HIGHLIGHT_TYPE;
            return (
              <div
                key={plan.type}
                className={`rounded-2xl p-8 flex flex-col ${
                  highlight
                    ? "bg-green-600 text-white shadow-xl scale-105"
                    : "bg-white border border-gray-100 shadow-sm"
                }`}
              >
                {isCurrent && (
                  <span className="inline-block mb-3 text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full w-fit">
                    Plano atual
                  </span>
                )}
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
                ) : (
                  <Link
                    href={`/checkout?plan=${plan.type}`}
                    className={`block text-center py-3 rounded-xl font-semibold transition text-sm ${
                      highlight
                        ? "bg-white text-green-700 hover:bg-green-50"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {currentPlan ? "Mudar para este plano" : "Assinar agora"}
                  </Link>
                )}
              </div>
            );
          })}
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
    </div>
  );
}
