"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "O que são os tratamentos com GLP-1?",
    a: "GLP-1 (Glucagon-Like Peptide-1) é uma classe de medicamentos usados no tratamento da obesidade e controle metabólico, sob prescrição médica. Eles imitam um hormônio natural que regula o apetite e aumenta a saciedade, ajudando na perda de peso de forma gradual e sustentável.",
  },
  {
    q: "Quais medicamentos fazem parte dessa classe?",
    a: "Os principais são base de Semaglutida (Ozempic®, Wegovy®, Rybelsus®) e Tirzepatida (Mounjaro®). Cada um tem princípio ativo e dosagem específicos — cabe ao médico endocrinologista definir o mais adequado para cada caso.",
  },
  {
    q: "Para quem são indicados?",
    a: "Apenas o médico endocrinologista pode definir quem precisa do tratamento, por isso a avaliação médica é fundamental. Geralmente são indicados para pessoas com IMC elevado ou condições metabólicas associadas.",
  },
  {
    q: "Quais são os efeitos colaterais mais comuns?",
    a: "Os efeitos colaterais costumam ser leves e passageiros, sendo mais comuns problemas gastrointestinais como náusea e diarreia, especialmente no início do tratamento. Nossa nutricionista está disponível para orientar como minimizar o desconforto.",
  },
  {
    q: "O que acontece se eu parar de tomar a medicação?",
    a: "A medicação é efetiva para emagrecer, mas não garante a manutenção do peso após o término. Por isso, o acompanhamento nutricional é essencial — nossa nutricionista te ajuda a criar novos hábitos alimentares para manter os resultados a longo prazo.",
  },
  {
    q: "Quais as regras da ANVISA para esses medicamentos?",
    a: "A ANVISA exige prescrição médica em duas vias (uma retida pela farmácia), com validade de 90 dias. Nunca adquira esses medicamentos sem prescrição.",
  },
  {
    q: "O acompanhamento nutricional faz diferença?",
    a: "Sim. Estudos mostram que pacientes acompanhados por nutricionistas perdem significativamente mais peso do que os que usam apenas a medicação. O suporte nutricional ajuda a criar hábitos que sustentam o resultado mesmo após o fim do tratamento.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
      >
        <span className="font-medium text-gray-900 text-sm sm:text-base">
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqSection() {
  return (
    <section className="py-14 sm:py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="inline-block bg-white border border-gray-100 text-gray-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 shadow-sm">
            Dúvidas frequentes
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Perguntas frequentes
          </h2>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          As orientações fornecidas são educacionais e não substituem consulta
          médica ou nutricional presencial.
        </p>
      </div>
    </section>
  );
}
