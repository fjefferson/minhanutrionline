"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Subscription {
  id: string;
  status: string;
  mpSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { name: string; type: string; priceInCents: number };
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING: "Aguardando pagamento",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-600",
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubs = () => {
    setLoading(true);
    api
      .get("/admin/subscriptions")
      .then((r) => setSubs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchSubs();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/admin/subscriptions/${id}/activate`);
      fetchSubs();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar esta assinatura?")) return;
    setActionLoading(id);
    try {
      await api.patch(`/admin/subscriptions/${id}/cancel`);
      fetchSubs();
    } finally {
      setActionLoading(null);
    }
  };

  const filtered =
    filter === "ALL" ? subs : subs.filter((s) => s.status === filter);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "-";

  const fmtPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assinaturas</h1>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["ALL", "PENDING", "ACTIVE", "CANCELED", "EXPIRED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "ALL" ? "Todas" : STATUS_LABELS[s]}
            {s !== "ALL" && (
              <span className="ml-1 text-xs opacity-75">
                ({subs.filter((x) => x.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Nenhuma assinatura encontrada.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Cadastro</th>
                <th className="px-4 py-3 text-left">Vigência</th>
                <th className="px-4 py-3 text-left">ID Mercado Pago</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {sub.user.name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {sub.user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{sub.plan.name}</div>
                    <div className="text-gray-400 text-xs">
                      {fmtPrice(sub.plan.priceInCents)}/mês
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[sub.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_LABELS[sub.status] ?? sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fmt(sub.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {sub.currentPeriodStart
                      ? `${fmt(sub.currentPeriodStart)} → ${fmt(sub.currentPeriodEnd)}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                    {sub.mpSubscriptionId ? (
                      <span title={sub.mpSubscriptionId}>
                        {sub.mpSubscriptionId.slice(0, 12)}...
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {sub.status !== "ACTIVE" && (
                        <button
                          disabled={actionLoading === sub.id}
                          onClick={() => handleActivate(sub.id)}
                          className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                        >
                          Ativar
                        </button>
                      )}
                      {sub.status === "ACTIVE" && (
                        <button
                          disabled={actionLoading === sub.id}
                          onClick={() => handleCancel(sub.id)}
                          className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
