"use client";

import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Pill,
  MessageCircle,
  CalendarDays,
  ArrowRight,
  Star,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Zap,
  User,
} from "lucide-react";

interface RecentReport {
  id: string;
  createdAt: string;
  symptoms: { symptom: { name: string } }[];
}

interface ChatSession {
  id: string;
  updatedAt: string;
  status: string;
}

const PLAN_LABEL: Record<string, string> = {
  BASIC: "Basic",
  PLUS: "Plus",
  PREMIUM: "Premium",
};

const PLAN_COLOR: Record<string, string> = {
  BASIC: "bg-green-100 text-green-700",
  PLUS: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

export default function DashboardPage() {
  const { user, planType, hasActivePlan } = useAuthStore();
  const plan = planType();
  const active = hasActivePlan();

  const planHierarchy: Record<string, number> = {
    BASIC: 1,
    PLUS: 2,
    PREMIUM: 3,
  };
  const currentLevel = plan ? (planHierarchy[plan] ?? 0) : 0;

  const [reports, setReports] = useState<RecentReport[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/glp1/reports").catch(() => ({ data: [] })),
      currentLevel >= 2
        ? api.get("/chat/sessions").catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]).then(([r, c]) => {
      setReports(r.data.slice(0, 5));
      setChatSessions(c.data.slice(0, 3));
      setLoadingStats(false);
    });
  }, [currentLevel]);

  const firstName = user?.name?.split(" ")[0] ?? "Olá";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {firstName}
          </h1>
        </div>
        {active && plan && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${PLAN_COLOR[plan]}`}
          >
            {plan === "PREMIUM" && <Star className="w-3 h-3" />}
            Plano {PLAN_LABEL[plan]}
          </span>
        )}
      </div>

      {/* Banner sem plano */}
      {!active && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Sem plano ativo
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Assine para acessar as orientações e o suporte.
              </p>
            </div>
          </div>
          <Link
            href="/planos"
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
          >
            Ver planos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Consultas
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Pill className="w-4 h-4 text-green-600" />
            </div>
          </div>
          {loadingStats ? (
            <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">sintomas analisados</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Mensagens
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          {loadingStats ? (
            <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {chatSessions.length}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">conversas com nutri</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Plano
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {active && plan ? PLAN_LABEL[plan] : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {active ? "ativo" : "sem assinatura"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Membro
            </span>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {user?.name
              ? user.name.split(" ").length > 1
                ? user.name.split(" ")[0][0] + user.name.split(" ")[1][0]
                : user.name[0]
              : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Acesso rápido + Atividade recente */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Acesso rápido */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Acesso rápido
          </h2>
          <div className="space-y-2">
            <Link
              href="/glp1"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Consultar Sintomas
                </p>
                <p className="text-xs text-gray-400">Orientações por IA</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
            </Link>

            <Link
              href={currentLevel >= 2 ? "/chat" : "/planos"}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Chat com Nutri
                </p>
                <p className="text-xs text-gray-400">
                  {currentLevel >= 2
                    ? "Atendimento direto"
                    : "Requer plano Plus"}
                </p>
              </div>
              {currentLevel < 2 ? (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Plus
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
              )}
            </Link>

            <Link
              href={currentLevel >= 3 ? "/consultas" : "/planos"}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Agendar Consulta
                </p>
                <p className="text-xs text-gray-400">
                  {currentLevel >= 3
                    ? "Com a nutricionista"
                    : "Requer plano Premium"}
                </p>
              </div>
              {currentLevel < 3 ? (
                <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Premium
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
              )}
            </Link>

            <Link
              href="/perfil"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">Meu Perfil</p>
                <p className="text-xs text-gray-400">Dados nutricionais</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
            </Link>
          </div>
        </div>

        {/* Atividade recente */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Consultas recentes
            </h2>
            <Link
              href="/glp1"
              className="text-xs text-green-600 hover:text-green-700 font-medium transition flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Nenhuma consulta ainda
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Faça sua primeira consulta de sintomas
                </p>
              </div>
              <Link
                href="/glp1"
                className="mt-1 text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition"
              >
                Começar agora
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {reports.map((r) => {
                const names = r.symptoms.map((s) => s.symptom.name);
                const label =
                  names.slice(0, 2).join(", ") +
                  (names.length > 2 ? ` +${names.length - 2}` : "");
                const date = new Date(r.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                });
                return (
                  <Link
                    key={r.id}
                    href={`/glp1/historico/${r.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate font-medium">
                        {label || "Consulta"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span className="text-xs text-gray-400">{date}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Banner upgrade ou disclaimer */}
      {active && plan !== "PREMIUM" && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-sm">
              {plan === "BASIC"
                ? "Quer falar diretamente com a nutricionista?"
                : "Quer agendar uma consulta personalizada?"}
            </p>
            <p className="text-green-100 text-xs mt-1">
              {plan === "BASIC"
                ? "Faça upgrade para o plano Plus e tenha acesso ao chat."
                : "O plano Premium inclui consultas mensais com a Elane."}
            </p>
          </div>
          <Link
            href="/planos"
            className="shrink-0 bg-white text-green-700 hover:bg-green-50 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap"
          >
            Fazer upgrade <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pb-2">
        As orientações são educacionais e não substituem consulta médica.
      </p>
    </div>
  );
}
