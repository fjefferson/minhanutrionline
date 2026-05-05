"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
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

function FreeLimitModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-7 text-center">
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

function ProfileGateModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
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
  const [view, setView] = useState<View>("history");
  const [history, setHistory] = useState<Report[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [profileBlocked, setProfileBlocked] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [freeLimitReached, setFreeLimitReached] = useState(false);
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

  const loadHistory = () => {
    setLoadingHistory(true);
    api
      .get("/glp1/reports")
      .then((r) => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
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
    loadHistory();
    loadFreeStatus();
    api
      .get("/glp1/symptoms")
      .then((r) => setSymptoms(r.data))
      .catch(() => {});
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
  }, []);

  const toggle = (slug: string) =>
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const openForm = () => {
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
    } catch (err: any) {
      if (err?.response?.data?.code === "FREE_LIMIT_REACHED") {
        setFreeLimitReached(true);
        setFreeAiUsed(err.response.data.freeAiUsed);
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
      await api.post(`/glp1/report/${result.id}/review`);
      setReviewDone(true);
    } catch (err: any) {
      setReviewError(
        err?.response?.data?.message ?? "Erro ao solicitar revisão.",
      );
    } finally {
      setReviewSending(false);
    }
  };

  /* ── FORM VIEW ── */
  if (view === "form") {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setView("history")}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova consulta</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Selecione os sintomas que está sentindo
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
            {symptoms.map((s) => (
              <button
                key={s.slug}
                onClick={() => toggle(s.slug)}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition text-left ${
                  selected.includes(s.slug)
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-green-300"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações adicionais{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Sintomas começaram há 3 dias, sinto mais após as refeições..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {formError && (
            <p className="text-red-500 text-sm mb-4">{formError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || selected.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {submitting ? "Analisando sintomas..." : "Receber orientações"}
          </button>

          {selected.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              {selected.length} sintoma{selected.length > 1 ? "s" : ""}{" "}
              selecionado{selected.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULT VIEW ── */
  if (view === "result" && result) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setView("history")}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Orientação personalizada
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(result.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
          <div className="flex flex-wrap gap-2 mb-6">
            {selected.map((s) => {
              const sym = symptoms.find((x) => x.slug === s);
              return (
                <span
                  key={s}
                  className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium"
                >
                  {sym?.name ?? s}
                </span>
              );
            })}
          </div>

          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-5 mb-6">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-4 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-4 space-y-1">
                    {children}
                  </ol>
                ),
              }}
            >
              {result.aiResponse}
            </ReactMarkdown>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-600">
              <strong>Lembrete:</strong> Estas orientações são educacionais. Em
              caso de sintomas graves ou persistentes, consulte seu médico ou
              nutricionista.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Esta orientação foi útil para você?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => rate(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">
                Pedir revisão da nutricionista
              </p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
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
                  {reviewError && (
                    <p className="text-red-500 text-xs mb-3">{reviewError}</p>
                  )}
                  <button
                    onClick={requestReview}
                    disabled={reviewSending}
                    className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition disabled:opacity-60"
                  >
                    {reviewSending ? "Enviando..." : "Solicitar revisão"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setView("history")}
          className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition text-sm"
        >
          Voltar ao histórico
        </button>
      </div>
    );
  }

  /* ── HISTORY VIEW (default) ── */
  return (
    <div className="max-w-3xl">
      {freeStatusChecked && freeLimitReached && <FreeLimitModal />}
      {profileChecked && profileBlocked && <ProfileGateModal />}

      {/* Contador de créditos gratuitos */}
      {freeStatusChecked && !hasActivePlan && !freeLimitReached && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl px-5 py-4 flex items-center gap-4">
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
          <h1 className="text-2xl font-bold text-gray-900">Consultas GLP-1</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Orientações nutricionais personalizadas para os seus sintomas
          </p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova consulta
        </button>
      </div>

      {loadingHistory ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Carregando...
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            Você ainda não tem nenhuma consulta.
          </p>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            Fazer primeira consulta
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
                  <p className="text-xs text-gray-400 mb-2">
                    {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </p>
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
