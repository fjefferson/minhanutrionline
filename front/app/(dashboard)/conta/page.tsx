"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { User, Lock, CheckCircle, AlertCircle } from "lucide-react";

type Tab = "dados" | "senha";

export default function ContaPage() {
  const { user, setAuth } = useAuthStore();
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

  // --- Auth store helpers ---
  const { token } = useAuthStore.getState();

  async function handleDados(e: React.FormEvent) {
    e.preventDefault();
    setDadosLoading(true);
    setDadosMsg(null);
    try {
      const { data } = await api.put("/auth/me", {
        name: name.trim(),
        email: email.trim(),
      });
      // Atualiza store mantendo token e subscription
      const current = useAuthStore.getState();
      setAuth(
        { ...current.user!, name: data.name, email: data.email },
        current.token!,
      );
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

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Minha Conta</h1>
      <p className="text-gray-500 text-sm mb-8">
        Gerencie seus dados e senha de acesso
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setTab("dados")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "dados"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <User className="w-4 h-4" />
          Dados pessoais
        </button>
        <button
          onClick={() => setTab("senha")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "senha"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Lock className="w-4 h-4" />
          Alterar senha
        </button>
      </div>

      {/* Dados pessoais */}
      {tab === "dados" && (
        <form
          onSubmit={handleDados}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {dadosMsg && (
            <div
              className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
                dadosMsg.type === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {dadosMsg.type === "ok" ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {dadosMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={dadosLoading}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-60"
          >
            {dadosLoading ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      )}

      {/* Alterar senha */}
      {tab === "senha" && (
        <form
          onSubmit={handleSenha}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Senha atual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Mínimo de 6 caracteres</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {senhaMsg && (
            <div
              className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
                senhaMsg.type === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {senhaMsg.type === "ok" ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {senhaMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={senhaLoading}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-60"
          >
            {senhaLoading ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      )}
    </div>
  );
}
