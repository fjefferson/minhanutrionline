import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://minhanutrionline.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MinhaNutri Online | Acompanhamento Nutricional para GLP-1",
    template: "%s | MinhaNutri Online",
  },
  description:
    "Plataforma de acompanhamento nutricional especializada em canetas emagrecedoras GLP-1 (Ozempic, Wegovy, Mounjaro). Controle de sintomas, orientações por IA e consultas online com nutricionista.",
  keywords: [
    "GLP-1",
    "caneta emagrecedora",
    "Ozempic nutricionista",
    "Wegovy acompanhamento",
    "Mounjaro nutrição",
    "semaglutida dieta",
    "tirzepatida alimentação",
    "acompanhamento nutricional GLP-1",
    "nutricionista GLP-1",
    "emagrecimento caneta",
    "tratamento obesidade nutricional",
    "controle sintomas GLP-1",
    "náusea Ozempic alimentação",
    "nutrição semaglutida",
    "orientação nutricional online",
    "perda de peso GLP-1",
    "nutricionista online emagrecimento",
    "caneta emagrecedora acompanhamento",
    "Elane Oliveira nutricionista",
    "CRN-14533",
  ],
  authors: [
    { name: "Elane Oliveira — Nutricionista CRN-14533", url: SITE_URL },
  ],
  creator: "MinhaNutri Online",
  publisher: "MinhaNutri Online",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "MinhaNutri Online",
    title: "MinhaNutri Online | Nutricionista especialista em Canetas GLP-1",
    description:
      "Suporte nutricional online para quem usa Ozempic, Wegovy ou Mounjaro. Controle de sintomas, orientações por IA e consultas com nutricionista especialista em GLP-1.",
    images: [
      {
        url: "/images/avatar_atendimento_elane_oliveira_nutri.jpg",
        width: 1200,
        height: 630,
        alt: "MinhaNutri Online — Nutricionista especialista em GLP-1",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MinhaNutri Online | Nutricionista especialista em GLP-1",
    description:
      "Acompanhamento nutricional para canetas emagrecedoras. Ozempic, Wegovy, Mounjaro. Orientação personalizada online.",
    images: ["/images/avatar_atendimento_elane_oliveira_nutri.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-BL11SHHS3J"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-BL11SHHS3J');
        `}
      </Script>
      <body
        suppressHydrationWarning
        className={`${inter.className} min-h-full bg-gray-50 antialiased`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
