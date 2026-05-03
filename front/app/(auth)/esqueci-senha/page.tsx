"use client";

import { useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-2">
          MinhaNutri Online
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Recuperação de senha
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-14 h-14 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              E-mail enviado!
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Se este e-mail estiver cadastrado, você receberá as instruções
              para redefinir sua senha em breve. Verifique também a caixa de
              spam.
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 text-sm text-green-600 font-medium hover:underline"
            >
              ← Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Informe o e-mail cadastrado e enviaremos um link para você criar
              uma nova senha.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar instruções"}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link
                href="/login"
                className="text-green-600 font-medium hover:underline"
              >
                ← Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
