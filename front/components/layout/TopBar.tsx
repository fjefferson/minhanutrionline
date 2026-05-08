"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/glp1": "Consultar Sintomas",
  "/glp1?tab=dosagem": "Doses GLP-1",
  "/progresso": "Minha Evolução",
  "/relatorios": "Meus Relatórios",
  "/chat": "Chat com Nutri",
  "/perfil": "Meu Perfil",
  "/consultas": "Consultas",
  "/conta": "Minha Conta",
  "/planos": "Planos",
  "/checkout": "Checkout",
  "/admin": "Painel Admin",
  "/admin/subscriptions": "Assinaturas",
  "/admin/pacientes": "Pacientes",
  "/admin/chat": "Atendimento",
  "/admin/consultas": "Consultas",
  "/admin/planos": "Planos",
  "/admin/sintomas": "Sintomas",
  "/admin/knowledge": "Base de Conhecimento",
  "/admin/glp1-revisoes": "Revisões GLP-1",
};

export default function TopBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const fullKey = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const title =
    Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(
        ([key]) =>
          fullKey === key || pathname === key || pathname.startsWith(key + "/"),
      )?.[1] ?? "Dashboard";

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        <span className="hidden sm:block text-xs text-gray-400 border-l border-gray-200 pl-3 capitalize">
          {today}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/chat"
          className="p-2 hover:bg-gray-100 rounded-xl transition"
          title="Mensagens"
        >
          <Bell className="w-5 h-5 text-gray-500" />
        </Link>

        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="Avatar"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              (user?.name?.[0]?.toUpperCase() ?? "U")
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.name?.split(" ")[0]}
            </p>
            <p className="text-xs text-gray-400 leading-tight">
              {user?.role === "ADMIN" ? "Administrador" : "Paciente"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
