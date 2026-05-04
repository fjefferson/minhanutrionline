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
import { Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoginError(null);
    try {
      const res = await api.post("/auth/login", data);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao entrar";
      setLoginError(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — formulário ── */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-8 sm:px-16 lg:px-24 py-12 bg-white">
        {/* Logo */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">
                M
              </span>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">
              MinhaNutri <span className="text-green-600">Online</span>
            </span>
          </div>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

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
              Nutrição especializada em GLP-1
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
