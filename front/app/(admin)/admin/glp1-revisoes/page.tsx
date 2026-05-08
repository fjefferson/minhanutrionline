"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { CheckCircle, Clock, Send } from "lucide-react";

interface Review {
  id: string;
  createdAt: string;
  reviewRequestedAt: string | null;
  reviewResolvedAt: string | null;
  reviewResponse: string | null;
  helpful: boolean | null;
  extraNotes: string | null;
  reviewReason: string | null;
  aiResponse: string;
  user: { id: string; name: string; email: string };
  symptoms: { symptom: { name: string; slug: string } }[];
}

export default function AdminGlp1RevisoesPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"pending" | "resolved" | "all">(
    "pending",
  );
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [responseError, setResponseError] = useState<Record<string, string>>(
    {},
  );

  const load = useCallback((f: typeof filter) => {
    setLoading(true);
    api
      .get(`/admin/glp1/reviews?status=${f === "all" ? "" : f}`)
      .then((r) => setReviews(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load(filter);
    }, 0);
    return () => clearTimeout(timeout);
  }, [filter, load]);

  const resolve = async (id: string) => {
    const text = responses[id]?.trim();
    if (!text) {
      setResponseError((prev) => ({
        ...prev,
        [id]: "Escreva uma resposta antes de resolver.",
      }));
      return;
    }
    setResponseError((prev) => ({ ...prev, [id]: "" }));
    setResolving(id);
    try {
      await api.patch(`/admin/glp1/reviews/${id}/resolve`, {
        reviewResponse: text,
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                reviewResolvedAt: new Date().toISOString(),
                reviewResponse: text,
              }
            : r,
        ),
      );
    } finally {
      setResolving(null);
    }
  };

  const pending = reviews.filter((r) => !r.reviewResolvedAt);
  const resolved = reviews.filter((r) => r.reviewResolvedAt);
  const displayed =
    filter === "pending" ? pending : filter === "resolved" ? resolved : reviews;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revisões GLP-1</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pacientes que solicitaram revisão da orientação da IA
          </p>
        </div>
        <div className="flex gap-2">
          {(["pending", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "pending"
                ? `Pendentes${pending.length ? ` (${pending.length})` : ""}`
                : f === "resolved"
                  ? "Resolvidas"
                  : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Carregando...</p>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma revisão pendente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                r.reviewResolvedAt
                  ? "border-gray-100 opacity-70"
                  : "border-orange-200"
              }`}
            >
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {r.reviewResolvedAt ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> Resolvida
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )}
                    {r.helpful === false && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                        Não útil
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{r.user.name}</p>
                  <p className="text-xs text-gray-400">{r.user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.symptoms.map((s) => (
                      <span
                        key={s.symptom.slug}
                        className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full"
                      >
                        {s.symptom.name}
                      </span>
                    ))}
                  </div>
                  {r.reviewRequestedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Solicitado em{" "}
                      {new Date(r.reviewRequestedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {expanded === r.id ? "Ocultar" : "Ver orientação"}
                  </button>
                </div>
              </div>

              {/* Motivo da revisão */}
              {r.reviewReason && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-orange-500 font-medium mb-1">
                    Motivo da revisão
                  </p>
                  <p className="text-sm text-gray-800 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    {r.reviewReason}
                  </p>
                </div>
              )}

              {/* Observações do paciente */}
              {r.extraNotes && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-gray-400 font-medium mb-1">
                    Observações do paciente
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">
                    {r.extraNotes}
                  </p>
                </div>
              )}

              {/* Resposta IA expandida */}
              {expanded === r.id && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">
                    Orientação gerada pela IA
                  </p>
                  <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-xl p-4">
                    <ReactMarkdown>{r.aiResponse}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Resposta da nutri ou textarea para responder */}
              {r.reviewResolvedAt ? (
                r.reviewResponse && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-xs text-green-600 font-medium mb-2">
                      Sua resposta
                    </p>
                    <p className="text-sm text-gray-700 bg-green-50 rounded-xl px-4 py-3 whitespace-pre-wrap">
                      {r.reviewResponse}
                    </p>
                  </div>
                )
              ) : (
                <div className="border-t border-orange-100 px-5 py-4 bg-orange-50/30">
                  <p className="text-xs text-gray-500 font-medium mb-2">
                    Resposta da nutricionista
                  </p>
                  <textarea
                    rows={4}
                    value={responses[r.id] ?? ""}
                    onChange={(e) =>
                      setResponses((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    placeholder="Escreva aqui a sua orientação revisada para o paciente..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white"
                  />
                  {responseError[r.id] && (
                    <p className="text-red-500 text-xs mt-1">
                      {responseError[r.id]}
                    </p>
                  )}
                  <button
                    onClick={() => resolve(r.id)}
                    disabled={resolving === r.id}
                    className="mt-3 flex items-center gap-2 bg-green-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {resolving === r.id ? "Enviando..." : "Enviar resposta"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
