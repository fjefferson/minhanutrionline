"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import {
  User,
  Lock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  XCircle,
  ChevronRight,
  ShieldCheck,
  BadgeCheck,
  Clock,
  Ban,
  ArrowUpCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

type Tab = "dados" | "senha" | "assinatura";

const INPUT =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition";

function Alert({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 text-sm px-4 py-3 rounded-xl border ${
        type === "ok"
          ? "bg-green-50 text-green-700 border-green-100"
          : "bg-red-50 text-red-600 border-red-100"
      }`}
    >
      {type === "ok" ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      {text}
    </div>
  );
}

export default function ContaPage() {
  const { user, setAuth, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>("dados");

  // Dados pessoais
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [dadosLoading, setDadosLoading] = useState(false);
  const [dadosMsg, setDadosMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [senhaLoading, setSenhaLoading] = useState(false);
  const [senhaMsg, setSenhaMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Assinatura
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Upgrade
  const [plans, setPlans] = useState<
    {
      id: string;
      type: string;
      name: string;
      priceInCents: number;
      description: string;
    }[]
  >([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [confirmUpgrade, setConfirmUpgrade] = useState<{
    planType: string;
    planName: string;
    fullPrice: number;
    daysRemaining: number;
    credit: number;
    firstPayment: number;
  } | null>(null);

  const subStatus = user?.subscription?.status;
  const planName = user?.subscription?.plan?.name;
  const cancelScheduledAt = user?.subscription?.cancelScheduledAt;
  const currentPeriodEnd = user?.subscription?.currentPeriodEnd;
  const currentPeriodStart = user?.subscription?.currentPeriodStart;

  const accessUntilLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const initials = (user?.name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  async function handleDados(e: React.FormEvent) {
    e.preventDefault();
    setDadosLoading(true);
    setDadosMsg(null);
    try {
      const { data } = await api.put("/auth/me", {
        name: name.trim(),
      });
      const current = useAuthStore.getState();
      setAuth({ ...current.user!, name: data.name }, current.token!);
      setDadosMsg({ type: "ok", text: "Dados atualizados com sucesso!" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao atualizar dados";
      setDadosMsg({ type: "err", text: msg });
    } finally {
      setDadosLoading(false);
    }
  }

  async function handleSenha(e: React.FormEvent) {
    e.preventDefault();
    setSenhaMsg(null);
    if (newPassword !== confirmPassword) {
      setSenhaMsg({ type: "err", text: "As senhas não conferem" });
      return;
    }
    if (newPassword.length < 6) {
      setSenhaMsg({
        type: "err",
        text: "A nova senha deve ter ao menos 6 caracteres",
      });
      return;
    }
    setSenhaLoading(true);
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      setSenhaMsg({ type: "ok", text: "Senha alterada com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao alterar senha";
      setSenhaMsg({ type: "err", text: msg });
    } finally {
      setSenhaLoading(false);
    }
  }

  // Carrega planos quando entra na aba assinatura
  useEffect(() => {
    if (tab !== "assinatura" || plans.length > 0) return;
    setPlansLoading(true);
    api
      .get("/plans/public")
      .then((r) => setPlans(r.data))
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, [tab]);

  // Sincroniza campos com o usuário quando o store hidrata
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  function calcProration(
    newPriceInCents: number,
  ): { daysRemaining: number; credit: number; firstPayment: number } | null {
    if (!currentPeriodStart) return null;
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUsed = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(currentPeriodStart).getTime()) / msPerDay,
      ),
    );
    const daysRemaining = Math.max(0, 30 - daysUsed);
    if (daysRemaining === 0) return null;
    const currentPriceInCents =
      plans.find((x) => x.name === planName)?.priceInCents ?? 0;
    const credit =
      Math.round(((daysRemaining * currentPriceInCents) / 100 / 30) * 100) /
      100;
    const charge =
      Math.round(((daysRemaining * newPriceInCents) / 100 / 30) * 100) / 100;
    const firstPayment = Math.max(
      0.01,
      Math.round((charge - credit) * 100) / 100,
    );
    return { daysRemaining, credit, firstPayment };
  }

  function handleSelectUpgrade(p: {
    type: string;
    name: string;
    priceInCents: number;
  }) {
    const proration = calcProration(p.priceInCents);
    setConfirmUpgrade({
      planType: p.type,
      planName: p.name,
      fullPrice: p.priceInCents / 100,
      daysRemaining: proration?.daysRemaining ?? 30,
      credit: proration?.credit ?? 0,
      firstPayment: proration?.firstPayment ?? p.priceInCents / 100,
    });
    setUpgradeMsg(null);
  }

  async function handleUpgrade(planType: string) {
    setUpgradeLoading(planType);
    setUpgradeMsg(null);
    try {
      const { data } = await api.post("/subscriptions/upgrade", { planType });
      window.open(data.init_point, "_blank", "noopener,noreferrer");
      setConfirmUpgrade(null);
      setUpgradeMsg({
        type: "ok",
        text: "Link de pagamento aberto em nova aba. Após pagar, seu plano será atualizado automaticamente.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao processar upgrade";
      setUpgradeMsg({ type: "err", text: msg });
    } finally {
      setUpgradeLoading(null);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    setCancelMsg(null);
    try {
      await api.delete("/subscriptions/me");
      const current = useAuthStore.getState();
      if (current.user && current.token) {
        const me = await api.get("/auth/me");
        setAuth(me.data, current.token);
      }
      setCancelMsg({
        type: "ok",
        text: "Cancelamento agendado. Seu acesso permanece ativo até o fim do período.",
      });
      setConfirmCancel(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao cancelar assinatura";
      setCancelMsg({ type: "err", text: msg });
    } finally {
      setCancelLoading(false);
    }
  }

  // Excluir conta (LGPD)
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDeleteAccount() {
    if (!deletePassword) return;
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      await api.delete("/auth/me", { data: { password: deletePassword } });
      logout();
      window.location.href = "/login";
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao excluir conta";
      setDeleteMsg({ type: "err", text: msg });
      setDeleteLoading(false);
    }
  }

  const navItems: {
    key: Tab;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      key: "dados",
      label: "Dados pessoais",
      icon: <User className="w-4 h-4" />,
      desc: "Nome e e-mail",
    },
    {
      key: "senha",
      label: "Senha",
      icon: <Lock className="w-4 h-4" />,
      desc: "Alterar acesso",
    },
    {
      key: "assinatura",
      label: "Assinatura",
      icon: <CreditCard className="w-4 h-4" />,
      desc: "Plano e cobrança",
    },
  ];

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    ACTIVE: {
      label: "Ativa",
      color: "text-green-700 bg-green-50 border-green-200",
      icon: <BadgeCheck className="w-4 h-4" />,
    },
    PENDING: {
      label: "Aguardando pagamento",
      color: "text-yellow-700 bg-yellow-50 border-yellow-200",
      icon: <Clock className="w-4 h-4" />,
    },
    CANCELED: {
      label: "Cancelada",
      color: "text-gray-500 bg-gray-100 border-gray-200",
      icon: <Ban className="w-4 h-4" />,
    },
    PAST_DUE: {
      label: "Pagamento em atraso",
      color: "text-red-600 bg-red-50 border-red-200",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  return (
    <div className="max-w-4xl py-2 px-0">
      {/* Header com avatar */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xl font-bold shadow-md select-none">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {user?.name ?? "Minha Conta"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Nav lateral */}
        <nav className="md:w-56 shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => setTab(item.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition group ${
                    tab === item.key
                      ? "bg-green-50 text-green-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        tab === item.key
                          ? "text-green-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }
                    >
                      {item.icon}
                    </span>
                    <div className="text-left">
                      <p className="leading-tight">{item.label}</p>
                      <p
                        className={`text-xs font-normal leading-tight mt-0.5 ${tab === item.key ? "text-green-500" : "text-gray-400"}`}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition ${tab === item.key ? "text-green-500" : "text-gray-300"}`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Dados pessoais */}
          {tab === "dados" && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50">
                  <h2 className="font-semibold text-gray-900">
                    Dados pessoais
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Atualize seu nome e endereço de e-mail
                  </p>
                </div>
                <form onSubmit={handleDados} className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={INPUT}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className={`${INPUT} opacity-60 cursor-not-allowed`}
                      placeholder="seu@email.com"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      O e-mail não pode ser alterado.
                    </p>
                  </div>

                  {dadosMsg && (
                    <Alert type={dadosMsg.type} text={dadosMsg.text} />
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={dadosLoading}
                      className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 active:scale-95 transition disabled:opacity-60"
                    >
                      {dadosLoading ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card excluir conta (LGPD) */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mt-4">
                <div className="px-6 py-5 border-b border-red-50">
                  <h2 className="font-semibold text-red-700 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Excluir minha conta
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Direito de exclusão de dados conforme a LGPD. Esta ação é
                    irreversível.
                  </p>
                </div>
                <div className="p-6 space-y-3">
                  {deleteMsg && (
                    <Alert type={deleteMsg.type} text={deleteMsg.text} />
                  )}
                  {!confirmDelete ? (
                    <button
                      onClick={() => {
                        setConfirmDelete(true);
                        setDeleteMsg(null);
                      }}
                      className="text-sm font-medium text-red-600 border border-red-200 px-4 py-2.5 rounded-xl hover:bg-red-50 active:scale-95 transition"
                    >
                      Solicitar exclusão de conta e dados
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">
                          <strong>Atenção: esta ação é permanente.</strong>{" "}
                          Todos os seus dados (perfil, histórico de chat,
                          relatórios, consultas e assinatura) serão excluídos e
                          não poderão ser recuperados.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Confirme sua senha para continuar
                        </label>
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          autoComplete="current-password"
                          className={INPUT}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading || !deletePassword}
                          className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition disabled:opacity-60"
                        >
                          {deleteLoading
                            ? "Excluindo..."
                            : "Excluir minha conta permanentemente"}
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDelete(false);
                            setDeletePassword("");
                            setDeleteMsg(null);
                          }}
                          disabled={deleteLoading}
                          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-95 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Alterar senha */}
          {tab === "senha" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900">Alterar senha</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Recomendamos usar uma senha forte e única
                </p>
              </div>
              <form onSubmit={handleSenha} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={INPUT}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                    className={INPUT}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Mínimo de 6
                    caracteres
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={INPUT}
                    placeholder="••••••••"
                  />
                </div>

                {senhaMsg && (
                  <Alert type={senhaMsg.type} text={senhaMsg.text} />
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={senhaLoading}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 active:scale-95 transition disabled:opacity-60"
                  >
                    {senhaLoading ? "Alterando..." : "Alterar senha"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assinatura */}
          {tab === "assinatura" && (
            <div className="space-y-4">
              {/* Card de status */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50">
                  <h2 className="font-semibold text-gray-900">Meu plano</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Status atual da sua assinatura
                  </p>
                </div>
                <div className="p-6">
                  {subStatus ? (
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1.5">
                          Plano
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {planName ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1.5">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${
                            statusConfig[subStatus]?.color ??
                            "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {statusConfig[subStatus]?.icon}
                          {statusConfig[subStatus]?.label ?? subStatus}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Nenhuma assinatura encontrada.
                    </p>
                  )}
                </div>
              </div>

              {/* Card de upgrade */}
              {subStatus === "ACTIVE" && !cancelScheduledAt && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900">
                      Trocar plano
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Faça upgrade ou downgrade da sua assinatura
                    </p>
                  </div>
                  <div className="p-6 space-y-3">
                    {upgradeMsg && (
                      <Alert type={upgradeMsg.type} text={upgradeMsg.text} />
                    )}

                    {/* Confirmação com cálculo proporcional */}
                    {confirmUpgrade ? (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                        <p className="text-sm font-semibold text-blue-800">
                          Confirmar troca para {confirmUpgrade.planName}
                        </p>

                        {confirmUpgrade.credit > 0 ? (
                          <div className="text-sm text-blue-700 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Dias restantes no ciclo atual
                              </span>
                              <span className="font-medium">
                                {confirmUpgrade.daysRemaining} dias
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Crédito do plano atual
                              </span>
                              <span className="font-medium text-green-700">
                                − R${" "}
                                {confirmUpgrade.credit
                                  .toFixed(2)
                                  .replace(".", ",")}
                              </span>
                            </div>
                            <div className="border-t border-blue-200 pt-1 flex justify-between font-semibold text-blue-900">
                              <span>1º pagamento (proporcional)</span>
                              <span>
                                R${" "}
                                {confirmUpgrade.firstPayment
                                  .toFixed(2)
                                  .replace(".", ",")}
                              </span>
                            </div>
                            <p className="text-xs text-blue-600 pt-0.5">
                              A partir do 2º mês: R${" "}
                              {confirmUpgrade.fullPrice
                                .toFixed(2)
                                .replace(".", ",")}
                              /mês
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-blue-700">
                            Valor cheio: R${" "}
                            {confirmUpgrade.fullPrice
                              .toFixed(2)
                              .replace(".", ",")}
                            /mês
                          </p>
                        )}

                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() =>
                              handleUpgrade(confirmUpgrade.planType)
                            }
                            disabled={
                              upgradeLoading === confirmUpgrade.planType
                            }
                            className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-95 transition disabled:opacity-60"
                          >
                            {upgradeLoading === confirmUpgrade.planType
                              ? "Processando..."
                              : "Confirmar e pagar"}
                          </button>
                          <button
                            onClick={() => setConfirmUpgrade(null)}
                            disabled={!!upgradeLoading}
                            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-95 transition"
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : plansLoading ? (
                      <p className="text-sm text-gray-400">
                        Carregando planos...
                      </p>
                    ) : (
                      plans
                        .filter((p) => p.name !== planName)
                        .map((p) => {
                          const currentPrice =
                            plans.find((x) => x.name === planName)
                              ?.priceInCents ?? 0;
                          const isUpgrade = p.priceInCents > currentPrice;
                          const proration = calcProration(p.priceInCents);
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-4 border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition"
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                  {p.name}
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      isUpgrade
                                        ? "bg-green-50 text-green-700"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {isUpgrade ? "Upgrade" : "Downgrade"}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  R${" "}
                                  {(p.priceInCents / 100)
                                    .toFixed(2)
                                    .replace(".", ",")}
                                  /mês
                                  {proration && proration.credit > 0 && (
                                    <span className="ml-2 text-green-600 font-medium">
                                      → hoje R${" "}
                                      {proration.firstPayment
                                        .toFixed(2)
                                        .replace(".", ",")}{" "}
                                      (proporcional)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => handleSelectUpgrade(p)}
                                className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-green-700 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-50 active:scale-95 transition"
                              >
                                <ArrowUpCircle className="w-4 h-4" />
                                Selecionar
                              </button>
                            </div>
                          );
                        })
                    )}
                    {!plansLoading &&
                      !confirmUpgrade &&
                      plans.filter((p) => p.name !== planName).length === 0 && (
                        <p className="text-sm text-gray-400">
                          Você já está no plano máximo disponível.
                        </p>
                      )}
                  </div>
                </div>
              )}

              {/* Card de cancelamento */}
              {subStatus && subStatus !== "CANCELED" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900">
                      {cancelScheduledAt
                        ? "Cancelamento agendado"
                        : "Cancelar assinatura"}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cancelScheduledAt
                        ? "A renovação foi cancelada, seu acesso continua ativo até o fim do período"
                        : "A renovação será interrompida, mas você mantém o acesso até o fim do período pago"}
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Já tem cancelamento agendado */}
                    {cancelScheduledAt ? (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800">
                            Renovação cancelada
                          </p>
                          {accessUntilLabel && (
                            <p className="text-sm text-amber-700 mt-0.5">
                              Seu acesso ao plano <strong>{planName}</strong>{" "}
                              permanece ativo até{" "}
                              <strong>{accessUntilLabel}</strong>.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : cancelMsg ? (
                      <Alert type={cancelMsg.type} text={cancelMsg.text} />
                    ) : !confirmCancel ? (
                      <div className="flex items-start gap-4">
                        <div className="flex-1 text-sm text-gray-500">
                          Ao cancelar, a renovação automática é interrompida,
                          mas você mantém acesso ao plano
                          {planName ? ` ${planName}` : ""} até o final do
                          período já pago.
                        </div>
                        <button
                          onClick={() => setConfirmCancel(true)}
                          className="shrink-0 flex items-center gap-2 text-sm text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 active:scale-95 transition font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancelar renovação
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">
                            <strong>Tem certeza?</strong> A renovação será
                            cancelada. Você continua com acesso até o fim do
                            período pago.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleCancel}
                            disabled={cancelLoading}
                            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition disabled:opacity-60"
                          >
                            {cancelLoading
                              ? "Cancelando..."
                              : "Sim, cancelar renovação"}
                          </button>
                          <button
                            onClick={() => setConfirmCancel(false)}
                            disabled={cancelLoading}
                            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-95 transition disabled:opacity-60"
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
