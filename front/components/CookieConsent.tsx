"use client";

import { useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-800">🍪 Usamos cookies</span>{" "}
          para melhorar sua experiência, analisar o tráfego e personalizar
          conteúdo. Ao continuar, você concorda com nossa{" "}
          <Link
            href="/privacidade"
            className="text-green-600 underline underline-offset-2 hover:text-green-700"
          >
            Política de Privacidade
          </Link>
          .
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={decline}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Recusar
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
