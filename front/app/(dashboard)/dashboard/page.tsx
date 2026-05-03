"use client";

import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import {
  Pill,
  MessageCircle,
  ClipboardList,
  AlertTriangle,
  Star,
} from "lucide-react";

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user?.name?.split(" ")[0]}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-gray-500">
            Bem-vindo ao seu painel de suporte GLP-1
          </p>
          {active && plan && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                plan === "PREMIUM"
                  ? "bg-purple-100 text-purple-700"
                  : plan === "PLUS"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
              }`}
            >
              {plan === "PREMIUM" && <Star className="w-3 h-3" />}
              {plan === "PREMIUM"
                ? "Premium"
                : plan === "PLUS"
                  ? "Plus"
                  : "Basic"}
            </span>
          )}
        </div>
      </div>

      {!active && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                Você ainda não tem um plano ativo
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Assine um plano para acessar as funcionalidades.
              </p>
            </div>
          </div>
          <Link
            href="/planos"
            className="shrink-0 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
          >
            Ver planos
          </Link>
        </div>
      )}

      {/* Cards rápidos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <Link
          href="/glp1"
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
            <Pill className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="font-semibold text-gray-900 group-hover:text-green-700 transition">
            Consultar Sintomas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Descreva o que está sentindo e receba orientações personalizadas.
          </p>
        </Link>

        <Link
          href={currentLevel >= 2 ? "/chat" : "/planos"}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 group-hover:text-green-700 transition">
              Chat com Nutri
            </h2>
            {currentLevel < 2 && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Plus
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tire dúvidas diretamente com a nutricionista.
          </p>
        </Link>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Meu Plano</h2>
          {active ? (
            <p className="text-sm text-green-600 font-medium mt-1">
              GLP-1 {plan}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Sem plano ativo</p>
          )}
        </div>
      </div>

      {/* Aviso disclaimer */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-xs text-blue-600 leading-relaxed">
          <strong>Aviso:</strong> As orientações fornecidas nesta plataforma têm
          caráter educacional e informativo. Elas não substituem consulta médica
          ou nutricional presencial. Em caso de sintomas graves, procure
          atendimento médico imediatamente.
        </p>
      </div>
    </div>
  );
}
