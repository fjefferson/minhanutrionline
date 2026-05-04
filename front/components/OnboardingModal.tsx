"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, User2, Stethoscope, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const STEPS = [
  {
    icon: User2,
    title: "Preencha seu perfil",
    desc: "Adicione suas informações de saúde para que a nutricionista possa te conhecer melhor.",
    href: "/perfil",
    cta: "Ir para o perfil",
  },
  {
    icon: Stethoscope,
    title: "Consulte seus sintomas GLP-1",
    desc: "Registre os sintomas do seu tratamento para acompanhamento personalizado.",
    href: "/glp1",
    cta: "Acessar GLP-1",
  },
  {
    icon: Sparkles,
    title: "Converse com a nutricionista",
    desc: "Tire dúvidas e receba orientações diretamente com a Elane Oliveira.",
    href: "/chat",
    cta: "Abrir chat",
  },
];

export default function OnboardingModal() {
  const { token, markOnboardingDone } = useAuthStore();
  const [closing, setClosing] = useState(false);

  const handleDone = async () => {
    setClosing(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/onboarding-done`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // fire-and-forget
    }
    markOnboardingDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-3">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Bem-vinda ao MinhaNutri Online!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Veja o que você pode fazer para começar:
          </p>
        </div>

        {/* Steps */}
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mt-0.5">
                  <Icon className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link
            href="/perfil"
            onClick={handleDone}
            className="w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Começar pelo perfil
          </Link>
          <button
            onClick={handleDone}
            disabled={closing}
            className="w-full text-center text-gray-500 hover:text-gray-700 text-sm py-1 transition-colors disabled:opacity-50"
          >
            Já conheço a plataforma
          </button>
        </div>
      </div>
    </div>
  );
}
