# Backlog — MinhaNutri Online

## 🔴 Crítico (bloqueia crescimento)

### [BACK-01] Validar webhook do Mercado Pago
- Testar fluxo completo de pagamento em sandbox
- Configurar `MP_WEBHOOK_SECRET` no `.env` de produção
- Garantir que `status: ACTIVE` é setado após pagamento confirmado
- Testar cenários: pagamento aprovado, recusado, cancelado

### [BACK-02] Página de retorno do checkout
- Criar `/checkout/success` — confirma assinatura ativada, redireciona para dashboard
- Criar `/checkout/failure` — orienta o usuário a tentar novamente
- Atualizar `MP_BACK_URL` no `.env` de produção

### [BACK-03] Recuperação de assinatura vencida / inadimplente
- Enviar e-mail automático quando status virar `PAST_DUE` ou `CANCELED`
- Exibir banner de aviso no dashboard quando assinatura estiver vencida
- Link direto para reativar o plano

---

## 🟡 Importante (afeta retenção)

### [BACK-04] Notificações de chat
- Enviar e-mail para o paciente quando a nutri responder
- Enviar e-mail/notificação para a nutri quando paciente enviar mensagem
- (Opcional) Badge de mensagens não lidas no menu lateral

### [BACK-05] Onboarding pós-cadastro
- Ao logar pela primeira vez, exibir tela de boas-vindas com próximos passos
- Guiar: 1. Escolher plano → 2. Preencher perfil → 3. Consultar sintomas
- Marcar onboarding como concluído no banco para não repetir

### [BACK-06] Perfil nutricional obrigatório antes de usar a IA
- Bloquear `/glp1` com modal se perfil incompleto
- Redirecionar para `/perfil` com mensagem explicando o porquê
- Melhorar UX do formulário de perfil (progresso em etapas)

---

## 🟢 Diferencial competitivo

### [BACK-07] Relatório de progresso do paciente
- Evolução de peso ao longo do tempo (gráfico)
- Histórico de sintomas reportados
- Opção de exportar/compartilhar PDF com a nutri

### [BACK-08] PWA (Progressive Web App)
- Adicionar `manifest.json` e service worker
- Ícone de app, tela de splash
- Permitir "Adicionar à tela inicial" no celular

### [BACK-09] Agendamento de consultas melhorado
- Calendário visual para o paciente escolher horário
- Confirmação automática por e-mail com link da videochamada
- Lembrete 24h antes da consulta

### [BACK-10] Avaliações e depoimentos
- Coletar NPS dos pacientes após 30 dias de uso
- Exibir depoimentos aprovados na home

---

## 🔵 Qualidade & Infraestrutura

### [BACK-11] Testes automatizados
- Testes de integração para fluxo de pagamento
- Testes para endpoints críticos (checkout, webhook, perfil)

### [BACK-12] Monitoramento em produção
- Configurar Sentry (ou similar) para capturar erros
- Alertas para falhas no webhook do MP
- Logs estruturados na API

### [BACK-13] Segurança
- Rotacionar `JWT_SECRET` com valor forte em produção
- Rate limiting nos endpoints de autenticação
- Revisar CORS em produção
