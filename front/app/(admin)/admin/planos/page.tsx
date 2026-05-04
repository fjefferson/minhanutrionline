"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Plan {
  id: string;
  type: string;
  name: string;
  description: string | null;
  priceInCents: number;
  active: boolean;
  features: string[];
  product: { name: string; slug: string };
}

const TYPE_LABELS: Record<string, string> = {
  BASIC: "Básico",
  PLUS: "Plus",
  PREMIUM: "Premium",
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceInCents: 0,
    active: true,
    features: [] as string[],
  });
  const [newFeature, setNewFeature] = useState("");
  const [saved, setSaved] = useState(false);

  const fetchPlans = () => {
    setLoading(true);
    api
      .get("/admin/plans")
      .then((r) => setPlans(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setSaved(false);
    setNewFeature("");
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      priceInCents: plan.priceInCents,
      active: plan.active,
      features: [...plan.features],
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/admin/plans/${editing.id}`, {
        ...form,
        priceInCents: Math.round(Number(form.priceInCents)),
      });
      setSaved(true);
      fetchPlans();
      setTimeout(() => setEditing(null), 800);
    } finally {
      setSaving(false);
    }
  };

  const fmtPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Planos</h1>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border p-6 flex flex-col gap-4 ${
                plan.active
                  ? "border-gray-200"
                  : "border-dashed border-gray-300 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-green-600">
                    {TYPE_LABELS[plan.type] ?? plan.type}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                    {plan.name}
                  </h2>
                </div>
                {!plan.active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Inativo
                  </span>
                )}
              </div>

              <p className="text-gray-500 text-sm">
                {plan.description || (
                  <span className="italic">Sem descrição</span>
                )}
              </p>

              {plan.features.length > 0 && (
                <ul className="space-y-1">
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-gray-600"
                    >
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="text-2xl font-bold text-gray-900">
                {fmtPrice(plan.priceInCents)}
                <span className="text-sm font-normal text-gray-400">/mês</span>
              </div>

              <button
                onClick={() => openEdit(plan)}
                className="mt-auto w-full py-2 rounded-xl border border-green-600 text-green-700 text-sm font-medium hover:bg-green-50 transition"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Editar — {TYPE_LABELS[editing.type] ?? editing.type}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do plano
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Ex: Acesso básico ao monitoramento GLP-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço mensal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(form.priceInCents / 100).toFixed(2)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priceInCents: Math.round(
                        parseFloat(e.target.value) * 100,
                      ),
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="w-4 h-4 accent-green-600"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Plano ativo (visível no site)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefícios (bullet points)
                </label>
                <div className="space-y-1.5 mb-2">
                  {form.features.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5"
                    >
                      <span className="text-green-500 text-xs shrink-0">✓</span>
                      <input
                        type="text"
                        value={f}
                        onChange={(e) => {
                          const updated = [...form.features];
                          updated[i] = e.target.value;
                          setForm({ ...form, features: updated });
                        }}
                        className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-400 rounded px-1 py-0.5"
                      />
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            features: form.features.filter(
                              (_, idx) => idx !== i,
                            ),
                          })
                        }
                        className="text-gray-300 hover:text-red-400 text-xs font-bold shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFeature.trim()) {
                        setForm({
                          ...form,
                          features: [...form.features, newFeature.trim()],
                        });
                        setNewFeature("");
                      }
                    }}
                    placeholder="Adicionar benefício..."
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => {
                      if (newFeature.trim()) {
                        setForm({
                          ...form,
                          features: [...form.features, newFeature.trim()],
                        });
                        setNewFeature("");
                      }
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
