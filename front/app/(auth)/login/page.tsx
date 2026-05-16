"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Mail } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resentEmail, setResentEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSuccess = async (credential: string) => {
    setGoogleLoading(true);
    setLoginError(null);
    try {
      const res = await api.post("/auth/google", { idToken: credential });
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao entrar com Google.";
      setLoginError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoginError(null);
    setEmailNotVerified(null);
    try {
      const res = await api.post("/auth/login", data);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const errData = (
        err as { response?: { data?: { code?: string; message?: string } } }
      )?.response?.data;
      if (errData?.code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(data.email);
      } else {
        setLoginError(errData?.message ?? "Erro ao entrar");
      }
    }
  };

  const resendVerification = async () => {
    if (!emailNotVerified) return;
    setResentEmail(false);
    try {
      await api.post("/auth/resend-verification", { email: emailNotVerified });
      setResentEmail(true);
    } catch {
      // silencioso
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — formulário ── */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-8 sm:px-16 lg:px-24 py-12 bg-white">
        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/images/logo.png"
            alt="MinhaNutri Online"
            width={200}
            height={56}
            className="h-24 w-auto object-contain"
            priority
          />
        </div>

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vinda de volta
          </h1>
          <p className="text-gray-500 text-sm">
            Entre na sua conta para continuar seu acompanhamento
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mail
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-colors placeholder:text-gray-400"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <Link
                href="/esqueci-senha"
                className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-colors placeholder:text-gray-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.password.message}
              </p>
            )}
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{loginError}</p>
            </div>
          )}

          {emailNotVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-800 text-sm font-semibold mb-1">
                    Confirme seu e-mail para entrar
                  </p>
                  <p className="text-amber-700 text-xs mb-3">
                    Enviamos um link de confirmação para{" "}
                    <strong>{emailNotVerified}</strong>. Verifique sua caixa de
                    entrada (e o spam).
                  </p>
                  {resentEmail ? (
                    <p className="text-green-700 text-xs font-semibold">
                      ✓ Novo link enviado!
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={resendVerification}
                      className="text-xs text-amber-800 underline hover:text-amber-900 transition"
                    >
                      Reenviar e-mail de confirmação
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-6">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Google login */}
        <div className="flex justify-center">
          {googleLoading ? (
            <div className="w-full border border-gray-200 rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg
                className="animate-spin w-4 h-4"
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
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Aguardando Google...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(res) =>
                res.credential && handleGoogleSuccess(res.credential)
              }
              onError={() =>
                setLoginError("Login com Google cancelado ou falhou.")
              }
              width="100%"
              text="signin_with"
              shape="rectangular"
              logo_alignment="center"
            />
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Não tem conta?{" "}
          <Link
            href="/register"
            className="text-green-600 font-semibold hover:text-green-700 transition-colors"
          >
            Cadastre-se grátis
          </Link>
        </p>
      </div>

      {/* ── Painel direito — imagem ── */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden">
        <Image
          src="/images/background-login.avif"
          alt="Nutrição saudável"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/60 via-green-800/30 to-transparent" />

        {/* Badge sobre a imagem */}
        <div className="absolute bottom-12 left-10 right-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <p className="text-white font-semibold text-lg leading-snug mb-1">
              Nutrição com foco em GLP-1
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              Acompanhamento personalizado com a nutricionista Elane Oliveira
              para otimizar os resultados do seu tratamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
