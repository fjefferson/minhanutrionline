"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  openChats: number;
  totalReports: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "Usuários",
      value: stats?.totalUsers ?? "—",
      icon: "👥",
      href: null,
    },
    {
      label: "Assinaturas ativas",
      value: stats?.activeSubscriptions ?? "—",
      icon: "💳",
      href: null,
    },
    {
      label: "Chats abertos",
      value: stats?.openChats ?? "—",
      icon: "💬",
      href: "/admin/chat",
    },
    {
      label: "Consultas realizadas",
      value: stats?.totalReports ?? "—",
      icon: "📋",
      href: null,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
        <p className="text-gray-500 mt-1 text-sm">Visão geral da plataforma</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="text-2xl mb-3">{c.icon}</div>
            <p className="text-3xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            {c.href && (
              <Link
                href={c.href}
                className="text-xs text-green-600 hover:underline mt-2 inline-block"
              >
                Ver detalhes →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Link
          href="/admin/knowledge"
          className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="text-3xl mb-4">📚</div>
          <h2 className="font-semibold text-gray-900 group-hover:text-green-700 transition text-lg">
            Base de Conhecimento
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Crie e edite orientações por sintoma que a IA usará para responder
            os usuários.
          </p>
        </Link>
        <Link
          href="/admin/chat"
          className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="text-3xl mb-4">💬</div>
          <h2 className="font-semibold text-gray-900 group-hover:text-green-700 transition text-lg">
            Atendimento via Chat
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Responda às mensagens dos assinantes Plus e Premium em tempo real.
          </p>
        </Link>
        <Link
          href="/admin/glp1-revisoes"
          className="bg-white rounded-2xl p-7 border border-orange-100 shadow-sm hover:shadow-md transition group"
        >
          <div className="text-3xl mb-4">🔍</div>
          <h2 className="font-semibold text-gray-900 group-hover:text-orange-600 transition text-lg">
            Revisões GLP-1
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Analise e responda às solicitações de revisão das orientações
            geradas pela IA.
          </p>
        </Link>
      </div>
    </div>
  );
}
