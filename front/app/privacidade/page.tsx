import type { Metadata } from "next";
import Link from "next/link";
import HomeHeader from "@/components/layout/HomeHeader";

export const metadata: Metadata = {
  title: "Política de Privacidade | MinhaNutri Online",
  description:
    "Saiba como a MinhaNutri Online coleta, usa e protege seus dados pessoais de acordo com a LGPD.",
  alternates: { canonical: "https://minhanutrionline.com.br/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Política de Privacidade
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            Última atualização: 5 de maio de 2026
          </p>

          <div className="prose prose-sm prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                1. Introdução
              </h2>
              <p>
                A MinhaNutri Online (&quot;nós&quot;, &quot;nosso&quot; ou
                &quot;Plataforma&quot;) respeita a sua privacidade e está
                comprometida com a proteção dos seus dados pessoais. Esta
                Política descreve como coletamos, usamos, armazenamos e
                protegemos suas informações, em conformidade com a Lei Geral de
                Proteção de Dados (LGPD — Lei 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                2. Dados que Coletamos
              </h2>
              <p>Coletamos os seguintes dados:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>
                  <strong>Dados de cadastro:</strong> nome, e-mail e senha;
                </li>
                <li>
                  <strong>Dados de perfil nutricional:</strong> data de
                  nascimento, gênero, peso, altura, objetivo e restrições
                  alimentares (fornecidos voluntariamente);
                </li>
                <li>
                  <strong>Registros de sintomas:</strong> informações de saúde
                  inseridas pelo próprio usuário;
                </li>
                <li>
                  <strong>Dados de uso:</strong> páginas acessadas, interações
                  com a plataforma e logs de acesso;
                </li>
                <li>
                  <strong>Dados de pagamento:</strong> processados de forma
                  segura por nosso provedor de pagamentos (não armazenamos dados
                  de cartão).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                3. Como Usamos seus Dados
              </h2>
              <p>Seus dados são utilizados para:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>Criar e gerenciar sua conta;</li>
                <li>
                  Personalizar orientações nutricionais e recomendações da IA;
                </li>
                <li>Processar pagamentos e gerenciar assinaturas;</li>
                <li>Enviar comunicações relacionadas ao serviço;</li>
                <li>Melhorar continuamente a Plataforma;</li>
                <li>Cumprir obrigações legais e regulatórias.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                4. Base Legal para o Tratamento
              </h2>
              <p>
                Tratamos seus dados com base nas seguintes hipóteses legais:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>
                  <strong>Consentimento:</strong> para dados sensíveis de saúde
                  e comunicações de marketing;
                </li>
                <li>
                  <strong>Execução de contrato:</strong> para prestação dos
                  serviços contratados;
                </li>
                <li>
                  <strong>Legítimo interesse:</strong> para melhorias da
                  plataforma e segurança;
                </li>
                <li>
                  <strong>Cumprimento de obrigação legal:</strong> quando
                  exigido por lei.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                5. Compartilhamento de Dados
              </h2>
              <p>
                Não vendemos seus dados pessoais. Podemos compartilhá-los apenas
                com:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>
                  <strong>Prestadores de serviço:</strong> provedores de
                  hospedagem, pagamento e e-mail que atuam sob contrato de
                  confidencialidade;
                </li>
                <li>
                  <strong>Profissionais de saúde:</strong> a nutricionista
                  responsável acessa dados de saúde para fins de atendimento;
                </li>
                <li>
                  <strong>Autoridades:</strong> quando exigido por ordem
                  judicial ou regulatória.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                6. Retenção de Dados
              </h2>
              <p>
                Mantemos seus dados pelo tempo necessário para a prestação dos
                serviços ou pelo prazo exigido por lei. Após o cancelamento da
                conta, os dados são anonimizados ou excluídos em até 90 dias,
                salvo obrigação legal de retenção.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                7. Segurança
              </h2>
              <p>
                Adotamos medidas técnicas e organizacionais adequadas para
                proteger seus dados contra acesso não autorizado, perda,
                alteração ou divulgação. Senhas são armazenadas com criptografia
                e todas as comunicações utilizam protocolo HTTPS.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                8. Seus Direitos (LGPD)
              </h2>
              <p>Você tem direito a:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>Confirmar a existência de tratamento dos seus dados;</li>
                <li>Acessar seus dados pessoais;</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                <li>
                  Solicitar anonimização, bloqueio ou eliminação de dados
                  desnecessários;
                </li>
                <li>
                  Revogar o consentimento a qualquer momento, sem prejuízo à
                  legalidade do tratamento anterior;
                </li>
                <li>Portabilidade dos dados a outro fornecedor.</li>
              </ul>
              <p className="mt-3">
                Para exercer seus direitos, entre em contato pelo e-mail:{" "}
                <a
                  href="mailto:nutri@elaneoliveira.com.br"
                  className="text-green-600 hover:underline"
                >
                  nutri@elaneoliveira.com.br
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                9. Cookies
              </h2>
              <p>
                Utilizamos cookies essenciais para o funcionamento da Plataforma
                (autenticação, preferências) e cookies analíticos (Google
                Analytics) para entender o uso do site. Você pode desativar
                cookies analíticos nas configurações do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                10. Alterações desta Política
              </h2>
              <p>
                Podemos atualizar esta Política periodicamente. Notificaremos
                sobre mudanças relevantes por e-mail ou aviso na Plataforma. O
                uso continuado após as alterações implica aceitação da nova
                versão.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                11. Contato e Encarregado (DPO)
              </h2>
              <p>
                Para questões sobre privacidade e proteção de dados, entre em
                contato com nosso encarregado pelo e-mail:{" "}
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
