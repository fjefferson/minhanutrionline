"use client";

import Link from "next/link";
import Image from "next/image";
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
  Menu,
  X,
  ArrowUpRight,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  minPlan?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const userSections: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Início", icon: LayoutDashboard },
      { href: "/glp1", label: "Consultar Sintomas", icon: Pill },
    ],
  },
  {
    label: "SUPORTE",
    items: [
      {
        href: "/chat",
        label: "Chat com Nutri",
        icon: MessageCircle,
        minPlan: "PLUS",
      },
      {
        href: "/consultas",
        label: "Consultas",
        icon: CalendarDays,
        minPlan: "PREMIUM",
      },
    ],
  },
  {
    label: "CONTA",
    items: [
      { href: "/perfil", label: "Meu Perfil", icon: UserCircle },
      { href: "/conta", label: "Minha Conta", icon: Settings },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Painel", icon: BarChart3 },
      { href: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard },
      { href: "/admin/pacientes", label: "Pacientes", icon: Users },
      { href: "/admin/chat", label: "Atendimento", icon: MessageCircle },
      { href: "/admin/consultas", label: "Consultas", icon: CalendarDays },
    ],
  },
  {
    label: "CONFIGURAÇÕES",
    items: [
      { href: "/admin/planos", label: "Planos", icon: Tag },
      { href: "/admin/sintomas", label: "Sintomas", icon: Stethoscope },
      {
        href: "/admin/knowledge",
        label: "Base de Conhecimento",
        icon: BookOpen,
      },
      {
        href: "/admin/glp1-revisoes",
        label: "Revisões GLP-1",
        icon: ClipboardList,
      },
    ],
  },
];

const PLAN_LABEL: Record<string, string> = {
  BASIC: "Basic",
  PLUS: "Plus",
  PREMIUM: "Premium",
};
const PLAN_COLOR: Record<string, string> = {
  BASIC: "bg-green-50 text-green-700 border border-green-200",
  PLUS: "bg-blue-50 text-blue-700 border border-blue-200",
  PREMIUM: "bg-purple-50 text-purple-700 border border-purple-200",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, planType, hasActivePlan } = useAuthStore();
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user?.role === "ADMIN";
  const sections = isAdmin ? adminSections : userSections;
  const plan = planType();
  const active = hasActivePlan();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isAdmin) return;
    api
      .get("/profile/nutritional")
      .then((r) => {
        const p = r.data;
        if (!p || !p.gender || !p.heightCm || !p.weightKg || !p.goal)
          setProfileIncomplete(true);
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const fetchUnread = () => {
      api
        .get("/chat/unread-count")
        .then((r) => setUnreadCount(r.data.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (pathname === "/chat" || pathname.startsWith("/chat/"))
      setUnreadCount(0);
  }, [pathname]);

  const planHierarchy: Record<string, number> = {
    BASIC: 1,
    PLUS: 2,
    PREMIUM: 3,
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm leading-none">M</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">
              MinhaNutri
            </p>
            <p className="text-[10px] text-gray-400 leading-tight">Online</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const locked =
                  item.minPlan && plan
                    ? planHierarchy[plan] < planHierarchy[item.minPlan]
                    : !!item.minPlan && !plan;

                const isActive =
                  pathname === item.href ||
                  (item.href.length > 1 &&
                    item.href !== "/admin" &&
                    pathname.startsWith(item.href + "/"));

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={locked ? "/planos" : item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${
                        isActive
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      }
                      ${locked ? "opacity-50" : ""}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {locked && (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}
                      >
                        <Lock className="w-2.5 h-2.5" />
                        {item.minPlan === "PREMIUM" ? "Premium" : "Plus"}
                      </span>
                    )}
                    {!locked &&
                      item.href === "/perfil" &&
                      profileIncomplete && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 w-4 h-4 flex items-center justify-center rounded-full">
                          !
                        </span>
                      )}
                    {!locked && item.href === "/chat" && unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-green-500 text-white rounded-full px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Plan + User */}
      <div className="p-3 border-t border-gray-100 shrink-0 space-y-2">
        {!isAdmin && (
          <div
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${active && plan ? PLAN_COLOR[plan] : "bg-gray-50 text-gray-500 border border-gray-200"}`}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                Plano atual
              </p>
              <p className="text-sm font-bold leading-tight">
                {active && plan ? PLAN_LABEL[plan] : "Sem plano"}
              </p>
            </div>
            {(!active || plan !== "PREMIUM") && (
              <Link
                href="/planos"
                className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-white/70 hover:bg-white transition"
              >
                Upgrade <ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="Avatar"
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            ) : (
              (user?.name?.[0]?.toUpperCase() ?? "U")
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-red-50 rounded-lg transition"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-xl shadow-md border border-gray-100"
      >
        <Menu size={18} className="text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-gray-100 min-h-screen sticky top-0 h-screen">
        {sidebarContent}
      </aside>
    </>
  );
}
