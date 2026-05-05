import type { Metadata } from "next";
import Link from "next/link";
import HomeHeader from "@/components/layout/HomeHeader";

export const metadata: Metadata = {
  title: "Termos de Uso | MinhaNutri Online",
  description:
    "Leia os Termos de Uso da plataforma MinhaNutri Online antes de utilizar nossos serviços.",
  alternates: { canonical: "https://minhanutrionline.com.br/termos" },
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Termos de Uso
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            Última atualização: 5 de maio de 2026
          </p>

          <div className="prose prose-sm prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar ou utilizar a plataforma MinhaNutri Online
                (&quot;Plataforma&quot;), você concorda com estes Termos de Uso.
                Caso não concorde, não utilize nossos serviços. Estes termos
                podem ser atualizados a qualquer momento, sendo responsabilidade
                do usuário consultá-los periodicamente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                2. Descrição dos Serviços
              </h2>
              <p>
                A MinhaNutri Online é uma plataforma de acompanhamento
                nutricional online especializada em pacientes que utilizam
                medicamentos análogos do GLP-1 (semaglutida, tirzepatida e
                similares). Os serviços incluem:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>Registro e monitoramento de sintomas;</li>
                <li>
                  Orientações nutricionais automatizadas via inteligência
                  artificial;
                </li>
                <li>
                  Agendamento e realização de consultas online com
                  nutricionista;
                </li>
                <li>Acesso a materiais educativos exclusivos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                3. Natureza Educacional
              </h2>
              <p>
                As orientações fornecidas pela Plataforma, incluindo aquelas
                geradas por inteligência artificial, possuem caráter
                exclusivamente educacional e informativo. Não substituem
                consulta médica, diagnóstico ou tratamento presencial. Em caso
                de sintomas graves, emergências ou dúvidas clínicas, procure um
                serviço de saúde imediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                4. Elegibilidade e Cadastro
              </h2>
              <p>
                Para usar a Plataforma você deve ter no mínimo 18 anos e
                fornecer informações verdadeiras no cadastro. O usuário é
                responsável por manter a confidencialidade de suas credenciais
                de acesso e por todas as atividades realizadas em sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                5. Assinatura e Pagamento
              </h2>
              <p>
                O acesso a determinados recursos exige assinatura paga. Os
                valores, formas de pagamento e condições de cancelamento estão
                descritos na página de planos. O cancelamento pode ser
                solicitado a qualquer momento dentro da própria plataforma, sem
                multa. O acesso permanece ativo até o fim do período já pago.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                6. Propriedade Intelectual
              </h2>
              <p>
                Todo o conteúdo disponível na Plataforma — textos, imagens,
                vídeos, materiais educativos e demais recursos — é de
                propriedade exclusiva da MinhaNutri Online ou de seus
                licenciadores. É proibida a reprodução, distribuição ou
                modificação sem autorização prévia e por escrito.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                7. Conduta do Usuário
              </h2>
              <p>O usuário compromete-se a não:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>Usar a Plataforma para fins ilegais ou fraudulentos;</li>
                <li>
                  Compartilhar conteúdo ofensivo, falso ou prejudicial a
                  terceiros;
                </li>
                <li>Tentar acessar sistemas ou dados de outros usuários;</li>
                <li>Realizar engenharia reversa ou scraping da Plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                8. Limitação de Responsabilidade
              </h2>
              <p>
                A MinhaNutri Online não se responsabiliza por danos diretos,
                indiretos ou consequenciais decorrentes do uso ou
                impossibilidade de uso da Plataforma. A disponibilidade dos
                serviços pode ser interrompida para manutenção ou melhorias sem
                aviso prévio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                9. Rescisão
              </h2>
              <p>
                Reservamo-nos o direito de suspender ou encerrar o acesso de
                qualquer usuário que viole estes Termos, sem aviso prévio e sem
                direito a reembolso do período não utilizado.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                10. Lei Aplicável
              </h2>
              <p>
                Estes Termos são regidos pelas leis brasileiras. Qualquer
                disputa será submetida ao foro da comarca de domicílio do
                consumidor, conforme o Código de Defesa do Consumidor (Lei
                8.078/1990).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                11. Contato
              </h2>
              <p>
                Dúvidas sobre estes Termos podem ser enviadas para:{" "}
                <a
                  href="mailto:nutri@elaneoliveira.com.br"
                  className="text-green-600 hover:underline"
                >
                  nutri@elaneoliveira.com.br
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

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
