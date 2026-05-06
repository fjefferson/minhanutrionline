import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos de Acompanhamento Nutricional para GLP-1",
  description:
    "Escolha o plano ideal para o seu tratamento com GLP-1. Orientações por IA, chat com nutricionista e consultas online para quem usa Ozempic, Wegovy ou Mounjaro. Acompanhamento com a nutricionista Elane Oliveira (CRN-14533).",
  alternates: {
    canonical: "https://minhanutrionline.com.br/planos",
  },
  openGraph: {
    title:
      "Planos de Acompanhamento Nutricional para GLP-1 | MinhaNutri Online",
    description:
      "Planos mensais com suporte nutricional dedicado ao tratamento com canetas emagrecedoras GLP-1. Ozempic, Wegovy e Mounjaro.",
    url: "https://minhanutrionline.com.br/planos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planos | MinhaNutri Online",
    description:
      "Planos de acompanhamento nutricional para GLP-1. Suporte dedicado para Ozempic, Wegovy e Mounjaro.",
  },
};

export default function PlanosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
