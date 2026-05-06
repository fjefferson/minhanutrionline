"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function CheckoutFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-400">Carregando...</p>
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}

function FailureContent() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <XCircle className="w-16 h-16 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Pagamento não concluído
        </h1>
        <p className="text-gray-500 mb-2">
          Não foi possível processar seu pagamento desta vez.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Isso pode acontecer por dados incorretos, cartão sem limite ou recusa
          do banco. Tente novamente ou use outra forma de pagamento.
        </p>

        <div className="space-y-3">
          <Link
            href={plan ? `/checkout?plan=${plan}` : "/planos"}
            className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Link>

          <Link
            href="/planos"
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver planos
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Em caso de dúvidas, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
