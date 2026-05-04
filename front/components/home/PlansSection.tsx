"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  type: string;
  description: string | null;
  priceInCents: number;
  features: string[];
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PlansSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans/public`)
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  // Middle plan gets highlighted
  const highlightIndex = Math.floor(plans.length / 2);

  return (
    <section id="planos" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Planos
        </h2>
        <p className="text-center text-gray-500 mb-14">
          Escolha o suporte ideal para a sua jornada
        </p>

        {loading && (
          <div className="text-center text-gray-400 text-sm py-12">
            Carregando planos...
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-12">
            Nenhum plano disponível no momento.
          </div>
        )}

        {!loading && plans.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, i) => {
              const highlight = i === highlightIndex;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-8 ${
                    highlight
                      ? "bg-green-600 text-white shadow-xl scale-105"
                      : "bg-white border border-gray-100 shadow-sm"
                  }`}
                >
                  <h3
                    className={`font-bold text-xl mb-1 ${highlight ? "text-white" : "text-gray-900"}`}
                  >
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p
                      className={`text-xs mb-3 ${highlight ? "text-green-100" : "text-gray-400"}`}
                    >
                      {plan.description}
                    </p>
                  )}
                  <div className="flex items-end gap-1 mb-6 mt-3">
                    <span
                      className={`text-4xl font-bold ${highlight ? "text-white" : "text-gray-900"}`}
                    >
                      {formatPrice(plan.priceInCents)}
                    </span>
                    <span
                      className={`text-sm mb-1 ${highlight ? "text-green-100" : "text-gray-400"}`}
                    >
                      /mês
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-center gap-2 text-sm ${highlight ? "text-green-50" : "text-gray-600"}`}
                      >
                        <Check
                          className={`w-4 h-4 shrink-0 ${highlight ? "text-green-200" : "text-green-500"}`}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center py-3 rounded-xl font-semibold transition text-sm ${
                      highlight
                        ? "bg-white text-green-700 hover:bg-green-50"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    Assinar agora
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
