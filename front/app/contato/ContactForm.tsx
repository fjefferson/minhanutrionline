"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";

const SUBJECTS = [
  "Dúvida sobre planos",
  "Suporte técnico",
  "Informações sobre GLP-1",
  "Parceria",
  "Outro",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadedAt] = useState(() => Date.now());

  // Honeypot — campo oculto que bots preenchem
  const honeyRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Proteção contra bots
    if (honeyRef.current?.value) return;
    if (Date.now() - loadedAt < 3000) {
      setErrorMsg("Envio muito rápido. Tente novamente.");
      return;
    }

    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setErrorMsg("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/contact", {
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
        _honey: honeyRef.current?.value ?? "",
      });
      setStatus("success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao enviar mensagem. Tente novamente.";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition placeholder:text-gray-400";

  if (status === "success") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-14 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Mensagem enviada!
        </h2>
        <p className="text-gray-500 text-sm">
          Obrigada pelo contato. Responderemos para{" "}
          <strong className="text-gray-700">{email}</strong> em breve.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5"
    >
      {/* Honeypot — invisível para humanos */}
      <input
        ref={honeyRef}
        type="text"
        name="_honey"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {/* Nome + Email em grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputCls}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Assunto
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputCls}
          required
        >
          <option value="">Selecione um assunto</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Mensagem
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Descreva sua dúvida ou mensagem..."
          className={`${inputCls} resize-none`}
          required
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {message.length}/2000
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Enviando...
          </>
        ) : (
          <>
            Enviar mensagem
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Suas informações são protegidas e nunca compartilhadas com terceiros.
      </p>
    </form>
  );
}
