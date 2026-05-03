import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ClipboardList,
  Brain,
  MessageCircle,
  Award,
  ShieldCheck,
  Star,
} from "lucide-react";
import HomeHeader from "@/components/layout/HomeHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Texto */}
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              Especialistas em GLP-1 / Canetas Emagrecedoras
            </span>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
              Suporte nutricional especializado para o seu tratamento
            </h1>
            <p className="text-xl text-gray-500 mb-10">
              Descreva seus sintomas e receba orientações personalizadas
              baseadas em protocolos nutricionais criados por nutricionista
              especialista em GLP-1.
            </p>
            <div className="flex gap-4 flex-wrap justify-center md:justify-start">
              <Link
                href="/register"
                className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-green-700 transition text-lg"
              >
                Começar agora
              </Link>
              <Link
                href="#planos"
                className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition text-lg"
              >
                Ver planos
              </Link>
            </div>
          </div>

          {/* Foto hero */}
          <div className="md:w-110 shrink-0 w-full">
            <div className="relative h-100 md:h-120 rounded-3xl overflow-hidden shadow-xl">
              <Image
                src="/images/hero_images/file_00000000b36c720eae05e581ccec3bef.png"
                alt="Elane Oliveira — Nutricionista no consultório"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 440px"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ClipboardList className="w-5 h-5 text-green-700" />,
                step: "1",
                title: "Descreva seus sintomas",
                desc: "Preencha um formulário rápido com o que está sentindo durante o uso das canetas.",
              },
              {
                icon: <Brain className="w-5 h-5 text-green-700" />,
                step: "2",
                title: "IA analisa e orienta",
                desc: "Nossa IA, treinada com protocolos da nutricionista, entrega orientações personalizadas.",
              },
              {
                icon: <MessageCircle className="w-5 h-5 text-green-700" />,
                step: "3",
                title: "Converse com a nutri",
                desc: "Nos planos Plus e Premium, tire dúvidas diretamente com a especialista pelo chat.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-8 shadow-sm"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nutricionista */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-3xl overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-0">
              {/* Foto */}
              <div className="md:w-80 shrink-0 w-full p-6 md:p-8 flex items-center justify-center">
                <div className="relative h-80 md:h-96 w-full rounded-3xl overflow-hidden shadow-md">
                  <Image
                    src="/images/hero_images/file_00000000fa5c720eabf48da8e603cdfe.png"
                    alt="Elane Oliveira — Nutricionista"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 p-10 md:p-14">
                <p className="text-green-700 font-semibold text-sm uppercase tracking-wider mb-3">
                  Responsável técnica
                </p>
                <h2 className="text-4xl font-bold text-gray-900 mb-1">
                  Elane Oliveira
                </h2>
                <p className="text-gray-500 font-medium mb-6">
                  Nutricionista · CRN-14533
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    {
                      icon: (
                        <Award className="w-5 h-5 text-green-600 shrink-0" />
                      ),
                      text: "Graduada em Nutrição (2020)",
                    },
                    {
                      icon: (
                        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                      ),
                      text: "Registrada no Conselho Regional de Nutricionistas — CRN-14533",
                    },
                    {
                      icon: (
                        <Star className="w-5 h-5 text-green-600 shrink-0" />
                      ),
                      text: "Especialização em recomposição corporal: emagrecimento e hipertrofia",
                    },
                    {
                      icon: (
                        <ClipboardList className="w-5 h-5 text-green-600 shrink-0" />
                      ),
                      text: "Formação em Saúde da Mulher",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {item.icon}
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-8">
                  Atende pacientes com necessidades de controle da glicemia,
                  saúde cardiovascular, emagrecimento, saúde digestiva e outras
                  demandas nutricionais específicas. Toda a base de conhecimento
                  da plataforma é construída e revisada por Elane.
                </p>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition text-sm"
                >
                  Começar meu acompanhamento
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Planos
          </h2>
          <p className="text-center text-gray-500 mb-14">
            Escolha o suporte ideal para a sua jornada
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "GLP-1 Basic",
                price: "R$ 19,90",
                period: "/mês",
                highlight: false,
                features: [
                  "Formulário de sintomas ilimitado",
                  "Orientações personalizadas por IA",
                  "Histórico de consultas",
                  "Base de conhecimento GLP-1",
                ],
              },
              {
                name: "GLP-1 Plus",
                price: "R$ 49,90",
                period: "/mês",
                highlight: true,
                features: [
                  "Tudo do Basic",
                  "Chat ao vivo com a nutricionista",
                  "Respostas em até 24h",
                  "Acompanhamento contínuo",
                ],
              },
              {
                name: "GLP-1 Premium",
                price: "R$ 149,90",
                period: "/mês",
                highlight: false,
                features: [
                  "Tudo do Plus",
                  "Consulta de 1h com a nutricionista",
                  "Atendimento prioritário",
                  "Plano alimentar personalizado",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${plan.highlight ? "bg-green-600 text-white shadow-xl scale-105" : "bg-white border border-gray-100 shadow-sm"}`}
              >
                <h3
                  className={`font-bold text-xl mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}
                >
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1 mb-6 mt-3">
                  <span
                    className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm mb-1 ${plan.highlight ? "text-green-100" : "text-gray-400"}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-green-50" : "text-gray-600"}`}
                    >
                      <Check
                        className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-green-200" : "text-green-500"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-xl font-semibold transition text-sm ${plan.highlight ? "bg-white text-green-700 hover:bg-green-50" : "bg-green-600 text-white hover:bg-green-700"}`}
                >
                  Assinar agora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 text-center text-sm text-gray-400">
        <p className="font-medium text-gray-500 mb-1">MinhaNutri Online</p>
        <p className="text-xs">
          Responsável técnica: Elane Oliveira · Nutricionista · CRN-14533
        </p>
        <p className="mt-2">
          © 2026 MinhaNutri Online. Todos os direitos reservados.
        </p>
        <p className="mt-1 text-xs">
          As orientações fornecidas são educacionais e não substituem consulta
          médica ou nutricional presencial.
        </p>
      </footer>
    </div>
  );
}
