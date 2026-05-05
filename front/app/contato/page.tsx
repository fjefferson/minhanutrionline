import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HomeHeader from "@/components/layout/HomeHeader";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contato | MinhaNutri Online",
  description:
    "Entre em contato com a nutricionista Elane Oliveira e a equipe MinhaNutri Online. Tire suas dúvidas sobre planos, GLP-1 e acompanhamento nutricional.",
  alternates: { canonical: "https://minhanutrionline.com.br/contato" },
};

export default function ContatoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HomeHeader />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* ── Painel lateral ── */}
          <div className="lg:col-span-2 rounded-3xl overflow-hidden bg-gradient-to-b from-green-700 to-green-900 text-white shadow-xl">
            {/* Imagem GLP-1 pens decorativa */}
            <div className="relative h-44 w-full overflow-hidden">
              <Image
                src="/images/home/gVlAwRJsyTzFQauxZrBBrw9yzCxfFo9NxwutQVe4.jpg"
                alt="Canetas GLP-1"
                fill
                className="object-cover opacity-60"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-green-800/60 to-green-900/80" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <span className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-1">
                  Fale conosco
                </span>
                <h1 className="text-2xl font-bold leading-tight">
                  Entre em contato
                </h1>
              </div>
            </div>

            {/* Perfil Elane */}
            <div className="px-6 py-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/30 shrink-0">
                  <Image
                    src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                    alt="Elane Oliveira — Nutricionista"
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div>
                  <p className="font-semibold text-base">Elane Oliveira</p>
                  <p className="text-green-300 text-xs">
                    Nutricionista · CRN-14533
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    Especialista em GLP-1
                  </p>
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-green-300 font-medium">E-mail</p>
                  <p className="text-sm text-white/90">
                    nutri@elaneoliveira.com.br
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-green-300 font-medium">
                    Tempo de resposta
                  </p>
                  <p className="text-sm text-white/90">Até 1 dia útil</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-green-300 font-medium">
                    Atendimento seguro
                  </p>
                  <p className="text-sm text-white/90">
                    Suas informações são protegidas pela LGPD
                  </p>
                </div>
              </div>
            </div>

            {/* Imagem resultado */}
            <div className="relative h-52 mx-6 mb-6 rounded-2xl overflow-hidden">
              <Image
                src="/images/home/clinica-emagrecimento.webp"
                alt="Resultado do tratamento"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/70 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-xs font-medium leading-relaxed">
                  &ldquo;Nutrição certa no tratamento com GLP-1 faz toda a
                  diferença.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* ── Formulário ── */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Envie sua mensagem
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Preencha o formulário abaixo e retornaremos em breve.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 mt-4 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-400 space-y-1">
          <p>© 2026 MinhaNutri Online. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-4 font-medium">
            <Link href="/termos" className="hover:text-green-600 transition">
              Termos de Uso
            </Link>
            <Link
              href="/privacidade"
              className="hover:text-green-600 transition"
            >
              Política de Privacidade
            </Link>
            <Link href="/sobre" className="hover:text-green-600 transition">
              Sobre
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
