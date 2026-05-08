"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useAuthStore } from "@/store/auth.store";
import {
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle,
  Plus,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  UserCircle,
  Sparkles,
  Zap,
  Check,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

interface Symptom {
  slug: string;
  name: string;
}

interface Report {
  id: string;
  aiResponse: string;
  createdAt: string;
  helpful: boolean | null;
  reviewRequested: boolean;
  reviewResponse: string | null;
  symptoms: { symptom: { name: string; slug: string } }[];
}

type View = "history" | "form" | "result";

function FreeLimitModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white"
        >
          ✕
        </button>
        <div className="bg-linear-to-br from-green-600 to-emerald-700 p-7 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Suas 3 orientações gratuitas acabaram!
          </h2>
          <p className="text-green-100 text-sm mt-1">
            Você aproveitou sua degustação 🎉
          </p>
        </div>
        <div className="p-7 flex flex-col gap-4">
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            Para continuar recebendo orientações personalizadas e ter acesso ao
            chat com a nutricionista, escolha um plano.
          </p>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
              No plano Basic você tem:
            </p>
            <ul className="space-y-1">
              {[
                "Orientações ilimitadas por IA",
                "Controle de sintomas",
                "Acesso ao conteúdo educativo",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <span className="text-green-500 text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
            <p className="text-green-700 font-bold text-lg mt-3">
              R$ 14,90
              <span className="text-xs font-normal text-green-600">/mês</span>
            </p>
          </div>
          <Link
            href="/planos"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm text-center"
          >
            Assinar agora
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProfileGateModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <UserCircle className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Perfil incompleto</h2>
        <p className="text-sm text-gray-500">
          Para consultar os sintomas GLP-1, precisamos de algumas informações
          básicas sobre você: sexo, altura, peso e objetivo.
        </p>
        <Link
          href="/perfil"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Preencher perfil agora
        </Link>
      </div>
    </div>
  );
}

export default function Glp1Page() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] ?? "";
  const [view, setView] = useState<View>("history");
  const [history, setHistory] = useState<Report[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [profileBlocked, setProfileBlocked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  const [freeLimitReached, setFreeLimitReached] = useState(false);
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);
  const [freeAiUsed, setFreeAiUsed] = useState(0);
  const [freeAiLimit] = useState(3);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [freeStatusChecked, setFreeStatusChecked] = useState(false);

  // form
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // result
  const [result, setResult] = useState<Report | null>(null);
  const [rating, setRating] = useState<boolean | null>(null);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewReason, setReviewReason] = useState("");

  const loadHistory = () => {
    setLoadingHistory(true);
    api
      .get("/glp1/reports")
      .then((r) => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  const loadSymptoms = () => {
    api
      .get("/glp1/symptoms")
      .then((r) => setSymptoms(r.data))
      .catch(() => {});
  };

  const loadFreeStatus = () => {
    api
      .get("/glp1/free-status")
      .then((r) => {
        setHasActivePlan(r.data.hasActivePlan);
        setFreeAiUsed(r.data.freeAiUsed);
        setFreeLimitReached(
          !r.data.hasActivePlan && r.data.freeAiUsed >= r.data.freeAiLimit,
        );
      })
      .catch(() => {})
      .finally(() => setFreeStatusChecked(true));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadHistory();
      loadFreeStatus();
      loadSymptoms();
      api
        .get("/profile/nutritional")
        .then((r) => {
          const p = r.data;
          const incomplete =
            !p || !p.gender || !p.heightCm || !p.weightKg || !p.goal;
          setProfileBlocked(incomplete);
        })
        .catch(() => setProfileBlocked(true))
        .finally(() => setProfileChecked(true));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const toggle = (slug: string) =>
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const openForm = () => {
    loadSymptoms();
    setSelected([]);
    setNotes("");
    setFormError("");
    setView("form");
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setFormError("Selecione ao menos um sintoma.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await api.post("/glp1/report", {
        symptoms: selected,
        extraNotes: notes,
      });
      setResult(res.data);
      setRating(null);
      setReviewDone(false);
      setReviewError("");
      setView("result");
      loadHistory();
      loadFreeStatus();
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { code?: string; freeAiUsed?: number } };
      };
      if (apiError?.response?.data?.code === "FREE_LIMIT_REACHED") {
        setFreeLimitReached(true);
        setShowFreeLimitModal(true);
        setFreeAiUsed(apiError.response?.data?.freeAiUsed ?? freeAiUsed);
        setView("history");
      } else {
        setFormError("Erro ao processar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const rate = async (helpful: boolean) => {
    if (!result) return;
    setRating(helpful);
    try {
      await api.patch(`/glp1/report/${result.id}/helpful`, { helpful });
    } catch {
      setRating(null);
    }
  };

  const requestReview = async () => {
    if (!result) return;
    setReviewSending(true);
    setReviewError("");
    try {
      await api.post(`/glp1/report/${result.id}/review`, {
        reviewReason: reviewReason.trim() || undefined,
      });
      setReviewDone(true);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setReviewError(
        apiError?.response?.data?.message ?? "Erro ao solicitar revisão.",
      );
    } finally {
      setReviewSending(false);
    }
  };

  /* ── FORM VIEW ── */
  if (view === "form") {
    return (
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("history")}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                Assistente NutriIA
              </p>
              <p className="text-xs text-green-600">online</p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="space-y-4">
          {/* Mensagem de boas-vindas da IA */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs">
              <p className="text-sm text-gray-800">
                Olá
                {firstName ? (
                  <>
                    , <strong>{firstName}</strong>
                  </>
                ) : (
                  ""
                )}
                ! Como está se sentindo hoje? 😊
              </p>
            </div>
          </div>

          {/* Bolha IA: pergunta sobre sintomas */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 max-w-sm">
              <p className="text-sm text-gray-800">
                Selecione os sintomas que está sentindo:
              </p>
              {history.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Na última vez:{" "}
                  {history[0].symptoms.map((s) => s.symptom.name).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Chips de sintomas (resposta do usuário) */}
          <div className="flex justify-end">
            <div className="max-w-sm w-full">
              <div className="flex flex-wrap gap-2 justify-end">
                {symptoms.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => toggle(s.slug)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-[0.96] ${
                      selected.includes(s.slug)
                        ? "bg-green-600 text-white border-green-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50"
                    }`}
                  >
                    {selected.includes(s.slug) && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bolha IA: pedido de detalhes */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs">
              <p className="text-sm text-gray-800">
                Conte mais detalhes do que você está sentindo hoje:
              </p>
            </div>
          </div>

          {/* Input de texto do usuário */}
          <div className="flex justify-end">
            <div className="w-full">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ex: Sinto mais após as refeições, há 3 dias, piora à noite..."
                className="w-full bg-white border border-gray-200 rounded-2xl rounded-br-sm px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none shadow-sm"
              />
            </div>
          </div>

          {formError && (
            <p className="text-center text-red-500 text-sm">{formError}</p>
          )}

          {/* Botão enviar */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting || selected.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Receber orientação
                </>
              )}
            </button>
          </div>

          {submitting && (
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULT VIEW ── */
  if (view === "result" && result) {
    return (
      <div className="max-w-3xl">
        {/* Header chat */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("history")}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                Assistente NutriIA
              </p>
              <p className="text-xs text-gray-400">
                {new Date(result.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {/* Aviso de IA especializada */}
        <div className="flex items-center gap-1.5 px-1 py-3 border-b border-gray-100 mb-2">
          <Zap className="w-3 h-3 text-green-500 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-tight">
            Assistente treinado especificamente para pacientes em uso de GLP-1 —
            não é uma IA genérica.
          </p>
        </div>

        <div className="space-y-4">
          {/* Mensagem do usuário: sintomas selecionados */}
          <div className="flex justify-end">
            <div className="bg-green-600 text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-sm">
              <p className="text-xs font-semibold mb-1.5 opacity-80">
                Você reportou:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.symptoms.map((s) => (
                  <span
                    key={s.symptom.slug}
                    className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-medium"
                  >
                    {s.symptom.name}
                  </span>
                ))}
              </div>
              {notes.trim() && (
                <p className="text-xs text-white/90 mt-2 leading-relaxed">
                  {notes.trim()}
                </p>
              )}
            </div>
          </div>

          {/* Evolução vs. orientação anterior */}
          {(() => {
            const prevReport = history.find((r) => r.id !== result.id);
            if (!prevReport) return null;
            const prevSlugs = new Set(
              prevReport.symptoms.map((s) => s.symptom.slug),
            );
            const currSlugs = new Set(selected);
            const improved = [...prevSlugs].filter((s) => !currSlugs.has(s));
            const newSyms = [...currSlugs].filter((s) => !prevSlugs.has(s));
            if (improved.length === 0 && newSyms.length === 0) return null;
            return (
              <div className="flex justify-end">
                <div className="bg-gray-100 rounded-2xl rounded-br-sm px-4 py-3 max-w-sm space-y-2">
                  {improved.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <span className="text-xs text-green-700 font-medium">
                        Melhorou:{" "}
                        {improved
                          .map(
                            (slug) =>
                              prevReport.symptoms.find(
                                (s) => s.symptom.slug === slug,
                              )?.symptom.name ?? slug,
                          )
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {newSyms.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="text-xs text-orange-600 font-medium">
                        Novo:{" "}
                        {newSyms
                          .map(
                            (slug) =>
                              symptoms.find((s) => s.slug === slug)?.name ??
                              slug,
                          )
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Resposta da IA em bolha */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-5 py-4 flex-1">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 mb-3 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 mb-3 space-y-1">
                        {children}
                      </ol>
                    ),
                  }}
                >
                  {result.aiResponse}
                </ReactMarkdown>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="bg-blue-50 rounded-xl px-3 py-2 mb-4">
                  <p className="text-xs text-blue-600">
                    <strong>Lembrete:</strong> Estas orientações são
                    educacionais. Em caso de sintomas graves ou persistentes,
                    consulte seu médico ou nutricionista.
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Esta orientação foi útil para você?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => rate(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
                      rating === true
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Sim, foi útil
                  </button>
                  <button
                    onClick={() => rate(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
                      rating === false
                        ? "bg-red-500 text-white border-red-500"
                        : "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500"
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Não ajudou
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Revisão */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 shrink-0" />
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex-1">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    Pedir revisão da nutricionista
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 mb-3">
                    Não ficou satisfeito? Solicite uma revisão humana.{" "}
                    <strong>Limite de 1 revisão por dia.</strong>
                  </p>
                  {reviewDone ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Revisão solicitada — a nutricionista entrará em contato em
                      breve.
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder="Descreva o motivo da revisão (opcional)..."
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-500 text-gray-900"
                      />
                      {reviewError && (
                        <p className="text-red-500 text-xs mb-2">
                          {reviewError}
                        </p>
                      )}
                      <button
                        onClick={requestReview}
                        disabled={reviewSending}
                        className="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition disabled:opacity-60"
                      >
                        {reviewSending ? "Enviando..." : "Solicitar revisão"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Nova orientação */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setView("history");
              }}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition"
            >
              Voltar ao histórico
            </button>
          </div>
        </div>
      </div>
    );
  }
  /* ── HISTORY VIEW (default) ── */
  return (
    <div className="max-w-3xl">
      {freeStatusChecked && showFreeLimitModal && (
        <FreeLimitModal onClose={() => setShowFreeLimitModal(false)} />
      )}
      {profileChecked && showProfileModal && (
        <ProfileGateModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Contador de créditos gratuitos */}
      {freeStatusChecked && !hasActivePlan && !freeLimitReached && (
        <div className="mb-6 bg-linear-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {freeAiLimit - freeAiUsed === 1
                ? "1 orientação gratuita restante"
                : `${freeAiLimit - freeAiUsed} orientações gratuitas restantes`}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-green-500 rounded-full transition-all"
                  style={{ width: `${(freeAiUsed / freeAiLimit) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 shrink-0">
                {freeAiUsed}/{freeAiLimit}
              </span>
            </div>
          </div>
          <Link
            href="/planos"
            className="shrink-0 text-xs font-semibold text-green-700 bg-white border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition whitespace-nowrap"
          >
            Ver planos
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Orientações GLP-1
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Orientações nutricionais personalizadas para os seus sintomas
          </p>
        </div>
        <button
          onClick={() => {
            if (profileBlocked) {
              setShowProfileModal(true);
              return;
            }
            if (freeLimitReached) {
              setShowFreeLimitModal(true);
              return;
            }
            openForm();
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova orientação
        </button>
      </div>

      {loadingHistory ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Carregando...
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            Você ainda não tem nenhuma orientação.
          </p>
          <button
            onClick={() => {
              if (profileBlocked) {
                setShowProfileModal(true);
                return;
              }
              if (freeLimitReached) {
                setShowFreeLimitModal(true);
                return;
              }
              openForm();
            }}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            Fazer primeira orientação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((r) => (
            <Link
              key={r.id}
              href={`/glp1/historico/${r.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </p>
                    {(() => {
                      const idx = history.indexOf(r);
                      const prev = history[idx + 1];
                      if (!prev) return null;
                      const curr = r.symptoms.length;
                      const last = prev.symptoms.length;
                      if (curr < last)
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <TrendingDown className="w-3 h-3" /> Melhora
                          </span>
                        );
                      if (curr > last)
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            <TrendingUp className="w-3 h-3" /> Piora
                          </span>
                        );
                      return (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Minus className="w-3 h-3" /> Estável
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.symptoms.map((s) => (
                      <span
                        key={s.symptom.slug}
                        className="bg-green-50 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-medium"
                      >
                        {s.symptom.name}
                      </span>
                    ))}
                  </div>
                  {r.reviewResponse ? (
                    <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-lg mb-2">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      Nutricionista respondeu sua revisão
                    </div>
                  ) : r.reviewRequested ? (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-lg mb-2">
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      Revisão em análise
                    </div>
                  ) : null}
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {r.aiResponse}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition" />
                  <div className="flex gap-1.5 mt-1">
                    {r.helpful === true && (
                      <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                    )}
                    {r.helpful === false && (
                      <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
