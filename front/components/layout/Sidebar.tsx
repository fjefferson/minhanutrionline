"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LayoutDashboard,
  Pill,
  MessageCircle,
  BarChart3,
  CreditCard,
  Tag,
  Stethoscope,
  BookOpen,
  Lock,
  LogOut,
  ClipboardList,
  UserCircle,
  Settings,
  CalendarDays,
  Users,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  minPlan?: string;
}

const userNav: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/glp1", label: "Consultar Sintomas", icon: Pill },
  {
    href: "/chat",
    label: "Chat com Nutri",
    icon: MessageCircle,
    minPlan: "PLUS",
  },
  { href: "/perfil", label: "Meu Perfil", icon: UserCircle },
  {
    href: "/consultas",
    label: "Consultas",
    icon: CalendarDays,
    minPlan: "PREMIUM",
  },
  { href: "/conta", label: "Minha Conta", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Painel", icon: BarChart3 },
  { href: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/planos", label: "Planos", icon: Tag },
  { href: "/admin/sintomas", label: "Sintomas", icon: Stethoscope },
  { href: "/admin/knowledge", label: "Base de Conhecimento", icon: BookOpen },
  { href: "/admin/chat", label: "Atendimento", icon: MessageCircle },
  {
    href: "/admin/glp1-revisoes",
    label: "Revisões GLP-1",
    icon: ClipboardList,
  },
  { href: "/admin/consultas", label: "Consultas", icon: CalendarDays },
  { href: "/admin/pacientes", label: "Pacientes", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, planType } = useAuthStore();
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const nav = isAdmin ? adminNav : userNav;
  const plan = planType();

  useEffect(() => {
    if (isAdmin) return;
    api
      .get("/profile/nutritional")
      .then((r) => {
        const p = r.data;
        if (!p || !p.gender || !p.heightCm || !p.weightKg || !p.goal) {
          setProfileIncomplete(true);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const planHierarchy: Record<string, number> = {
    BASIC: 1,
    PLUS: 2,
    PREMIUM: 3,
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <span className="font-bold text-green-700 text-lg">
          MinhaNutri Online
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const locked =
            item.minPlan && plan
              ? planHierarchy[plan] < planHierarchy[item.minPlan]
              : !!item.minPlan && !plan;

          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={locked ? "/planos" : item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                ${active ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"}
                ${locked ? "opacity-50" : ""}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {locked && (
                <span className="ml-auto flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Plus
                </span>
              )}
              {!locked && item.href === "/perfil" && profileIncomplete && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Incompleto
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        {!isAdmin && plan && (
          <div className="mb-3 px-3 py-2 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600 font-medium">Plano {plan}</p>
          </div>
        )}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
