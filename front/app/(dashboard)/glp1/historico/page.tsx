"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  MessageSquare,
} from "lucide-react";

interface Report {
  id: string;
  createdAt: string;
  helpful: boolean | null;
  reviewRequested: boolean;
  reviewResponse: string | null;
  aiResponse: string;
  symptoms: { symptom: { name: string; slug: string } }[];
}

export default function Glp1HistoricoPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/glp1/reports")
      .then((r) => setReports(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Carregando histórico...
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
          <h1 className="text-2xl font-bold text-gray-900">
            Histórico de consultas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Todas as suas orientações anteriores
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhuma consulta ainda.</p>
          <Link
            href="/glp1"
            className="mt-4 inline-block text-sm text-green-600 font-medium hover:underline"
          >
            Fazer primeira consulta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
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
                  <div className="flex flex-wrap gap-1.5 mb-3">
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
                    <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-lg mb-3">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      Nutricionista respondeu sua revisão
                    </div>
                  ) : r.reviewRequested ? (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-lg mb-3">
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      Revisão em análise
                    </div>
                  ) : null}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {r.aiResponse}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition" />
                  <div className="flex gap-1.5">
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
