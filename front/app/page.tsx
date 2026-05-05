import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ClipboardList,
  MessageCircle,
  CalendarDays,
  Star,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Leaf,
  Mail,
} from "lucide-react";
import HomeHeader from "@/components/layout/HomeHeader";
import PlansSection from "@/components/home/PlansSection";
import FaqSection from "@/components/home/FaqSection";

export const metadata: Metadata = {
  title: "Acompanhamento Nutricional GLP-1 | MinhaNutri Online",
  description:
    "Nutricionista especialista em GLP-1. Controle sintomas, plano alimentar e consultas online para quem usa Ozempic, Wegovy ou Mounjaro.",
  alternates: {
    canonical: "https://minhanutrionline.com.br",
  },
  openGraph: {
    title: "Acompanhamento Nutricional GLP-1 | MinhaNutri Online",
    description:
      "Nutricionista especialista em GLP-1. Controle sintomas, plano alimentar personalizado e consultas online para Ozempic, Wegovy e Mounjaro.",
    url: "https://minhanutrionline.com.br",
    images: [
      {
        url: "https://minhanutrionline.com.br/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MinhaNutri Online — Acompanhamento nutricional para GLP-1",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://minhanutrionline.com.br/images/og-image.jpg"],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MinhaNutri Online",
    url: "https://minhanutrionline.com.br",
    logo: {
      "@type": "ImageObject",
      url: "https://minhanutrionline.com.br/images/avatar_atendimento_elane_oliveira_nutri.jpg",
    },
    description:
      "Plataforma de acompanhamento nutricional especializada em tratamentos GLP-1. Suporte para pacientes que usam Ozempic, Wegovy e Mounjaro.",
    founder: {
      "@type": "Person",
      name: "Elane Oliveira",
      jobTitle: "Nutricionista",
      identifier: "CRN-14533",
    },
    areaServed: { "@type": "Country", name: "Brasil" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MinhaNutri Online",
    url: "https://minhanutrionline.com.br",
    description:
      "Acompanhamento nutricional online para quem usa canetas emagrecedoras GLP-1",
  },
  {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "MinhaNutri Online",
    url: "https://minhanutrionline.com.br",
    description:
      "Acompanhamento nutricional especializado em GLP-1, incluindo Ozempic (semaglutida), Wegovy e Mounjaro (tirzepatida). Controle de sintomas, plano alimentar e emagrecimento sustentável.",
    medicalSpecialty: "Nutrição",
    employee: {
      "@type": "Person",
      name: "Elane Oliveira",
      jobTitle: "Nutricionista",
      identifier: "CRN-14533",
    },
    areaServed: { "@type": "Country", name: "Brasil" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Planos de Acompanhamento Nutricional GLP-1",
      itemListElement: [
        {
          "@type": "Offer",
          name: "Plano Basic",
          description:
            "Orientações por IA, controle de sintomas e base de conhecimento nutricional para GLP-1",
        },
        {
          "@type": "Offer",
          name: "Plano Plus",
          description:
            "Plano Basic + chat direto com a nutricionista Elane Oliveira",
        },
        {
          "@type": "Offer",
          name: "Plano Premium",
          description:
            "Plano Plus + consultas individuais por videochamada com acompanhamento personalizado",
        },
      ],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "O que são os tratamentos com GLP-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GLP-1 (Glucagon-Like Peptide-1) é uma classe de medicamentos usados no tratamento da obesidade e controle metabólico, sob prescrição médica. Eles imitam um hormônio natural que regula o apetite e aumenta a saciedade, ajudando na perda de peso de forma gradual e sustentável.",
        },
      },
      {
        "@type": "Question",
        name: "Quais medicamentos GLP-1 existem?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Os principais são base de Semaglutida (Ozempic®, Wegovy®, Rybelsus®) e Tirzepatida (Mounjaro®). Cada um tem princípio ativo e dosagem específicos — cabe ao médico endocrinologista definir o mais adequado para cada caso.",
        },
      },
      {
        "@type": "Question",
        name: "Para quem são indicados os medicamentos GLP-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Apenas o médico endocrinologista pode definir quem precisa do tratamento, por isso a avaliação médica é fundamental. Geralmente são indicados para pessoas com IMC elevado ou condições metabólicas associadas.",
        },
      },
      {
        "@type": "Question",
        name: "Quais são os efeitos colaterais mais comuns do GLP-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Os efeitos colaterais costumam ser leves e passageiros, sendo mais comuns problemas gastrointestinais como náusea e diarreia, especialmente no início do tratamento. A nutricionista orienta como minimizar o desconforto com ajustes alimentares.",
        },
      },
      {
        "@type": "Question",
        name: "O que acontece se eu parar de tomar a medicação GLP-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A medicação é efetiva para emagrecer, mas não garante a manutenção do peso após o término. O acompanhamento nutricional é essencial para criar novos hábitos que mantêm os resultados a longo prazo.",
        },
      },
      {
        "@type": "Question",
        name: "Quais as regras da ANVISA para os medicamentos GLP-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A ANVISA exige prescrição médica em duas vias (uma retida pela farmácia), com validade de 90 dias. Nunca adquira esses medicamentos sem prescrição médica.",
        },
      },
      {
        "@type": "Question",
        name: "O acompanhamento nutricional faz diferença no tratamento com GLP-1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sim. Estudos mostram que pacientes acompanhados por nutricionistas perdem significativamente mais peso do que os que usam apenas a medicação. O suporte nutricional ajuda a criar hábitos que sustentam o resultado mesmo após o fim do tratamento.",
        },
      },
    ],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeHeader />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f0fdf4] via-white to-white">
        {/* Decorative dots */}
        <div className="absolute top-16 left-8 w-3 h-3 bg-green-400 rounded-full opacity-50" />
        <div className="absolute top-36 right-16 w-4 h-4 border-2 border-green-300 rounded-full opacity-40" />
        <div className="absolute bottom-16 left-1/3 w-2 h-2 bg-yellow-300 rounded-full opacity-60" />
        <div className="absolute top-1/2 left-6 w-1.5 h-1.5 bg-emerald-400 rounded-full opacity-40" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 bg-white border border-green-100 text-green-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 shadow-sm">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Especialistas em GLP-1 / Canetas Emagrecedoras
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
                Emagreça com{" "}
                <span className="relative inline-block text-green-600">
                  suporte nutricional
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    height="8"
                    viewBox="0 0 300 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 6 Q75 1 150 6 Q225 11 300 6"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.45"
                    />
                  </svg>
                </span>{" "}
                especializado
              </h1>

              <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Acompanhamento nutricional online para quem usa canetas
                emagrecedoras. Orientações personalizadas, chat com
                nutricionista e consultas por videochamada.
              </p>

              <div className="flex items-center gap-3 justify-center lg:justify-start flex-wrap mb-10">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-green-700 transition text-base shadow-lg shadow-green-200"
                >
                  Começar agora
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#planos"
                  className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition text-base shadow-sm"
                >
                  Ver planos
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {["A", "M", "C", "P", "L"].map((l, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold bg-green-100 text-green-700"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    +200 pacientes acompanhadas
                  </p>
                </div>
              </div>
            </div>

            {/* Right — photo + floating cards */}
            <div className="lg:w-[480px] shrink-0 w-full relative mt-4 lg:mt-0">
              <div className="relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden shadow-2xl shadow-green-100">
                <Image
                  src="/images/hero_images/file_00000000b36c720eae05e581ccec3bef.png"
                  alt="Elane Oliveira — Nutricionista especialista em GLP-1"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 480px"
                  priority
                />
              </div>

              {/* Floating card — bottom left */}
              <div className="absolute -bottom-5 -left-4 sm:-left-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3 max-w-[220px]">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">
                    Plano alimentar criado
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Personalizado para você ✨
                  </p>
                </div>
              </div>

              {/* Floating card — top right */}
              <div className="absolute -top-5 -right-4 sm:-right-6 bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-4 text-center">
                <p className="text-3xl font-bold text-green-600 leading-none">
                  4.9
                </p>
                <div className="flex gap-0.5 justify-center my-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">Avaliação média</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "200+", label: "Pacientes atendidas" },
              { value: "4.9★", label: "Avaliação média" },
              { value: "3", label: "Planos disponíveis" },
              { value: "CRN-14533", label: "Nutricionista registrada" },
            ].map((s) => (
              <div key={s.value}>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {s.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE TRIAL BANNER ────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-xl sm:text-2xl">
                Experimente grátis — sem cartão de crédito
              </p>
              <p className="text-green-100 text-sm mt-1">
                Receba{" "}
                <strong className="text-white">
                  3 orientações personalizadas por IA
                </strong>{" "}
                antes de assinar qualquer plano. Veja se é para você.
              </p>
            </div>
            <Link
              href="/register"
              className="shrink-0 bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition text-sm whitespace-nowrap"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              O que você encontra aqui
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
              Uma plataforma completa para acompanhar e potencializar seus
              resultados com as canetas emagrecedoras.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <ClipboardList className="w-6 h-6 text-orange-500" />,
                bg: "bg-orange-50",
                title: "Controle de Sintomas",
                desc: "Registre e monitore seus sintomas diários. Nossa IA analisa e entrega orientações baseadas em protocolos nutricionais especializados.",
                href: "/register",
              },
              {
                icon: <MessageCircle className="w-6 h-6 text-green-600" />,
                bg: "bg-green-50",
                title: "Chat com Nutricionista",
                desc: "Converse diretamente com a Elane nos planos Plus e Premium. Respostas em até 24h úteis, quando você mais precisar.",
                href: "/register",
              },
              {
                icon: <CalendarDays className="w-6 h-6 text-violet-500" />,
                bg: "bg-violet-50",
                title: "Consultas Online",
                desc: "No plano Premium, agende consultas individuais por videochamada com acompanhamento 100% personalizado.",
                href: "/register",
                badge: "Premium",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all duration-300 relative"
              >
                {f.badge && (
                  <span className="absolute top-5 right-5 text-[11px] font-semibold bg-violet-100 text-violet-600 px-2.5 py-1 rounded-full">
                    {f.badge}
                  </span>
                )}
                <div
                  className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-5`}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                  {f.desc}
                </p>
                <Link
                  href={f.href}
                  className="inline-flex items-center gap-1.5 text-green-600 text-sm font-semibold group-hover:gap-2.5 transition-all"
                >
                  Explorar <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA — SPLIT ────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#f8fffe]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Imagem */}
            <div className="lg:w-[480px] shrink-0 w-full relative">
              <div className="relative h-80 sm:h-[460px] rounded-3xl overflow-hidden shadow-xl">
                <Image
                  src="/images/home/clinica-emagrecimento.webp"
                  alt="Clínica de emagrecimento"
                  fill
                  className="object-cover"
                  sizes="480px"
                />
              </div>
              {/* Floating progress card */}
              <div className="absolute bottom-6 -right-4 sm:-right-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-52">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    Meta de emagrecimento
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mb-1.5">
                  <div className="h-1.5 bg-green-500 rounded-full w-[72%]" />
                </div>
                <p className="text-xs text-gray-400">
                  72% dos objetivos alcançados
                </p>
              </div>
            </div>

            {/* Texto */}
            <div className="flex-1">
              <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                Passo a passo
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                Do cadastro aos resultados em 4 passos simples
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed text-sm sm:text-base">
                A plataforma foi desenhada para ser simples e eficiente. Em
                poucos minutos você já tem acesso ao suporte nutricional
                especializado.
              </p>

              <div className="space-y-5">
                {[
                  {
                    n: "1",
                    title: "Crie sua conta",
                    desc: "Cadastro rápido, sem burocracia. Escolha o plano ideal para você.",
                  },
                  {
                    n: "2",
                    title: "Descreva seus sintomas",
                    desc: "Use o monitoramento para registrar como está se sentindo durante o tratamento.",
                  },
                  {
                    n: "3",
                    title: "Receba orientações personalizadas",
                    desc: "Nossa IA analisa e entrega orientações baseadas em n protocolos nutricionais.",
                  },
                  {
                    n: "4",
                    title: "Acompanhe sua evolução",
                    desc: "Consulte a nutricionista e ajuste seu plano conforme os resultados.",
                  },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="w-8 h-8 shrink-0 bg-green-600 text-white rounded-xl flex items-center justify-center text-sm font-bold mt-0.5">
                      {step.n}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {step.title}
                      </p>
                      <p className="text-sm text-gray-500 leading-relaxed mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className="inline-flex items-center gap-2 mt-8 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition text-sm shadow-md shadow-green-100"
              >
                Quero começar <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── NUTRICIONISTA ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl overflow-hidden shadow-xl shadow-green-200">
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Foto */}
              <div className="md:w-72 shrink-0 relative min-h-64">
                <Image
                  src="/images/hero_images/file_00000000fa5c720eabf48da8e603cdfe.png"
                  alt="Elane Oliveira atendendo paciente"
                  fill
                  className="object-cover object-top"
                  sizes="288px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 p-8 md:p-12 text-white">
                <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-3">
                  Responsável técnica
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  Elane Oliveira
                </h2>
                <p className="text-green-200 font-medium mb-7 text-sm">
                  Nutricionista · CRN-14533
                </p>

                <div className="grid sm:grid-cols-2 gap-3 mb-7">
                  {[
                    "Graduada em Nutrição (2020)",
                    "CRN-14533 — Registro ativo",
                    "Especialista em recomposição corporal",
                    "Formação em Saúde da Mulher",
                    "Expertise em tratamentos GLP-1",
                    "Atendimento 100% online",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-300 shrink-0" />
                      <span className="text-sm text-white/90">{item}</span>
                    </div>
                  ))}
                </div>

                <p className="text-white/75 text-sm leading-relaxed mb-7 max-w-lg">
                  Atende pacientes com necessidades de controle glicêmico,
                  emagrecimento e saúde metabólica. Toda a base de conhecimento
                  da plataforma é construída e revisada por Elane.
                </p>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-white text-green-700 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition text-sm shadow-lg"
                >
                  Começar meu acompanhamento <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANOS ───────────────────────────────────────────────────── */}
      <PlansSection />

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── CTA BANNER ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden px-8 py-16 sm:py-20 text-center">
            <div className="absolute top-0 right-0 w-72 h-72 bg-green-600 rounded-full blur-3xl opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
            <div className="relative">
              <span className="inline-block bg-white/10 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                Comece hoje mesmo
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
                Seu resultado começa com
                <br />o suporte certo
              </h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto text-sm sm:text-base">
                Junte-se a mais de 200 pacientes que já estão alcançando
                resultados reais com acompanhamento nutricional especializado em
                GLP-1.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-500 transition text-base shadow-lg shadow-green-900/30"
              >
                Criar minha conta gratuitamente
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400">
        {/* Main columns */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Image
                src="/images/logo.png"
                alt="MinhaNutri Online"
                width={180}
                height={50}
                className="h-10 w-auto object-contain mb-4 brightness-0 invert opacity-90"
              />
              <p className="text-sm leading-relaxed max-w-sm text-gray-400">
                Plataforma de acompanhamento nutricional especializada em
                canetas GLP-1. Cuide da sua saúde com orientação profissional e
                tecnologia.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 leading-none mb-0.5">
                    Responsável técnica
                  </p>
                  <p className="text-sm font-medium text-white">
                    Elane Oliveira · CRN-14533
                  </p>
                </div>
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">
                Plataforma
              </h4>
              <ul className="space-y-3">
                {[
                  { href: "/sobre", label: "Sobre nós" },
                  { href: "#planos", label: "Planos" },
                  { href: "/contato", label: "Contato" },
                  { href: "/login", label: "Entrar na conta" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-5">
                Legal
              </h4>
              <ul className="space-y-3">
                {[
                  { href: "/termos", label: "Termos de Uso" },
                  { href: "/privacidade", label: "Privacidade" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mt-8 mb-5">
                Contato
              </h4>
              <a
                href="mailto:contato@minhanutrionline.com.br"
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Enviar e-mail
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Leaf className="w-3.5 h-3.5 text-green-700" />
              <span>
                © 2026 MinhaNutri Online. Todos os direitos reservados.
              </span>
            </div>
            <p className="text-xs text-gray-600 text-center">
              As orientações são educacionais e não substituem consulta médica
              presencial.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
