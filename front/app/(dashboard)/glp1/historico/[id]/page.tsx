"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

interface Report {
  id: string;
  createdAt: string;
  helpful: boolean | null;
  reviewRequested: boolean;
  reviewRequestedAt: string | null;
  reviewResolvedAt: string | null;
  reviewResponse: string | null;
  aiResponse: string;
  extraNotes: string | null;
  symptoms: { symptom: { name: string; slug: string } }[];
}

export default function Glp1ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<boolean | null>(null);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewReason, setReviewReason] = useState("");

  useEffect(() => {
    api
      .get("/glp1/reports")
      .then((r) => {
        const found = r.data.find((x: Report) => x.id === id);
        if (found) {
          setReport(found);
          setRating(found.helpful);
          setReviewDone(found.reviewRequested);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const rate = async (helpful: boolean) => {
    if (!report) return;
    setRating(helpful);
    try {
      await api.patch(`/glp1/report/${report.id}/helpful`, { helpful });
      setReport((prev) => (prev ? { ...prev, helpful } : prev));
    } catch {
      setRating(report.helpful);
    }
  };

  const requestReview = async () => {
    if (!report) return;
    setReviewSending(true);
    setReviewError("");
    try {
      await api.post(`/glp1/report/${report.id}/review`, {
        reviewReason: reviewReason.trim() || undefined,
      });
      setReviewDone(true);
      setReport((prev) => (prev ? { ...prev, reviewRequested: true } : prev));
    } catch (err: any) {
      setReviewError(
        err?.response?.data?.message ?? "Erro ao solicitar revisão.",
      );
    } finally {
      setReviewSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl">
        <p className="text-gray-500 text-sm">Consulta não encontrada.</p>
        <Link
          href="/glp1"
          className="text-green-600 text-sm hover:underline mt-2 inline-block"
        >
          Voltar ao histórico
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/glp1"
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Orientação personalizada
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(report.createdAt).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-5">
        {/* Sintomas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {report.symptoms.map((s) => (
            <span
              key={s.symptom.slug}
              className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium"
            >
              {s.symptom.name}
            </span>
          ))}
        </div>

        {/* Observações */}
        {report.extraNotes && (
          <div className="mb-5 bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 font-medium mb-1">
              Suas observações
            </p>
            <p className="text-sm text-gray-600">{report.extraNotes}</p>
          </div>
        )}

        {/* Resposta IA */}
        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-5 mb-6">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>
              ),
            }}
          >
            {report.aiResponse}
          </ReactMarkdown>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-blue-600">
            <strong>Lembrete:</strong> Estas orientações são educacionais. Em
            caso de sintomas graves ou persistentes, consulte seu médico ou
            nutricionista.
          </p>
        </div>

        {/* Avaliação */}
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

      {/* Solicitar revisão da nutri */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">
              Pedir revisão da nutricionista
            </p>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Não ficou satisfeito com a orientação? Solicite uma revisão
              humana. Limite de <strong>1 revisão por dia</strong>.
            </p>

            {report.reviewResponse ? (
              <div className="bg-green-50 rounded-xl px-4 py-4">
                <p className="text-xs text-green-600 font-medium mb-2">
                  Resposta da nutricionista
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {report.reviewResponse}
                </p>
              </div>
            ) : reviewDone || report.reviewRequested ? (
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
                <textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Descreva o motivo da revisão (opcional)..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-500 text-gray-900"
                />
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
    </div>
  );
}
