import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import HomeHeader from "@/components/layout/HomeHeader";

export const metadata: Metadata = {
  title: "Sobre | MinhaNutri Online",
  description:
    "Conheça a MinhaNutri Online e a nutricionista Elane Oliveira, especialista em GLP-1 e canetas emagrecedoras como Ozempic, Wegovy e Mounjaro.",
  alternates: { canonical: "https://minhanutrionline.com.br/sobre" },
};

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            Sobre nós
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MinhaNutri Online
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Uma plataforma criada para transformar o acompanhamento nutricional
            de quem usa canetas emagrecedoras GLP-1.
          </p>
        </div>

        {/* Foto + bio */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-10 flex flex-col sm:flex-row gap-8 items-center">
          <div className="shrink-0">
            <Image
              src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
              alt="Elane Oliveira — Nutricionista CRN-14533"
              width={160}
              height={160}
              className="w-36 h-36 rounded-full object-cover ring-4 ring-green-100"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Elane Oliveira
            </h2>
            <p className="text-sm text-green-700 font-medium mb-3">
              Nutricionista · CRN-14533
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Especialista em nutrição clínica com foco em emagrecimento e
              tratamentos com análogos do GLP-1. Atende pacientes que utilizam
              semaglutida (Ozempic, Wegovy) e tirzepatida (Mounjaro), auxiliando
              na adaptação alimentar, controle de sintomas e resultados
              sustentáveis.
            </p>
          </div>
        </div>

        {/* Missão */}
        <div className="bg-green-50 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Nossa missão</h2>
          <p className="text-gray-700 leading-relaxed">
            Acreditamos que o uso de canetas emagrecedoras é apenas uma parte do
            processo. O acompanhamento nutricional especializado é o que
            transforma resultados temporários em mudança real de vida. A
            MinhaNutri Online nasceu para tornar esse suporte acessível,
            contínuo e personalizado — de qualquer lugar do Brasil.
          </p>
        </div>

        {/* O que fazemos */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            O que oferecemos
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Controle de sintomas",
                desc: "Registre náuseas, vômitos, fadiga e outros efeitos colaterais com apoio de inteligência artificial treinada com os protocolos da nutricionista Elane Oliveira.",
              },
              {
                title: "Chat com a nutricionista",
                desc: "Converse diretamente com a nutricionista Elane Oliveira para orientações personalizadas no seu acompanhamento.",
              },
              {
                title: "Consultas online",
                desc: "Agendamento de consultas com a nutricionista Elane Oliveira diretamente pela plataforma.",
              },
              {
                title: "Materiais exclusivos",
                desc: "Guias, vídeos, receitas e estratégias alimentares criadas especificamente para quem usa GLP-1.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
              >
                <h3 className="font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-700 transition"
          >
            Começar agora
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Sem compromisso. Cancele quando quiser.
          </p>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="border-t border-gray-100 py-8 mt-10 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center text-xs text-gray-400 space-y-1">
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
            <Link href="/contato" className="hover:text-green-600 transition">
              Contato
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
