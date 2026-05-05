import axios from "axios";

const SENDPULSE_API_URL = "https://api.sendpulse.com";
const CLIENT_ID = process.env.SENDPULSE_API_ID ?? "";
const CLIENT_SECRET = process.env.SENDPULSE_API_SECRET ?? "";
const FROM_EMAIL = "nutri@elaneoliveira.com.br";
const FROM_NAME = "Elane Oliveira · MinhaNutri Online";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.post(
        `${SENDPULSE_API_URL}/oauth/access_token`,
        {
          grant_type: "client_credentials",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        { timeout: 10_000 },
      );

      cachedToken = res.data.access_token as string;
      // tokens duram 3600s — renova com 60s de margem
      tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000;
      return cachedToken;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await sleep(attempt * 800);
    }
  }
  throw lastErr;
}

export async function sendWelcomeEmail(to: { name: string; email: string }) {
  try {
    const token = await getAccessToken();

    const html = buildWelcomeHtml(to.name);
    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: buildWelcomeText(to.name),
          subject: "Bem-vinda ao seu acompanhamento nutricional!",
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: to.name, email: to.email }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    // Não deixar falha no e-mail quebrar o fluxo principal
    console.error("[SendPulse] Erro ao enviar e-mail de boas-vindas:", err);
  }
}

function buildWelcomeHtml(name: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vinda ao MinhaNutri Online</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:Arial,Helvetica,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;">
  <tr><td align="center" style="padding:40px 16px;">

  <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">

    <!-- HEADER -->
    <tr>
      <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:16px 16px 0 0;padding:40px 40px 32px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding-bottom:14px;">
            <table border="0" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="#15803d" style="background-color:#15803d;border-radius:50%;width:60px;height:60px;font-size:28px;line-height:60px;">&#127807;</td>
            </tr></table>
          </td></tr>
          <tr><td align="center">
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">MinhaNutri Online</h1>
            <p style="margin:0;color:#bbf7d0;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Nutrição especializada em GLP-1</p>
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- STRIP -->
    <tr>
      <td align="center" bgcolor="#dcfce7" style="background-color:#dcfce7;padding:16px 40px;border-left:1px solid #bbf7d0;border-right:1px solid #bbf7d0;">
        <p style="margin:0;font-size:12px;font-weight:bold;color:#15803d;font-family:Arial,Helvetica,sans-serif;letter-spacing:1px;">&#10022;&nbsp; CONTA ATIVADA COM SUCESSO &nbsp;&#10022;</p>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Ol&#225;, ${firstName}!</p>
        <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
          Que alegria ter voc&#234; aqui! Estou animada para acompanhar a sua jornada com as canetas GLP-1
          e te ajudar a tirar o m&#225;ximo proveito do seu tratamento com nutri&#231;&#227;o personalizada.
        </p>

        <!-- QUOTE -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td width="4" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:4px;">&nbsp;</td>
            <td bgcolor="#f0fdf4" style="background-color:#f0fdf4;padding:14px 18px;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;font-style:italic;font-family:Arial,Helvetica,sans-serif;">
                &#8220;A nutri&#231;&#227;o certa faz toda a diferen&#231;a no tratamento com GLP-1 &#8212; menos efeitos colaterais, mais energia e resultados duradouros.&#8221;
              </p>
            </td>
          </tr>
        </table>

        <!-- SECTION LABEL -->
        <p style="margin:0 0 14px;font-size:11px;font-weight:bold;color:#9ca3af;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">O QUE VOC&#202; PODE FAZER AGORA</p>

        <!-- FEATURES -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle;" width="44">
              <table border="0" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#dcfce7" style="background-color:#dcfce7;border-radius:50%;width:32px;height:32px;font-size:16px;line-height:32px;">&#128203;</td>
              </tr></table>
            </td>
            <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Descrever seus sintomas</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Receba orienta&#231;&#245;es personalizadas por IA em segundos</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle;" width="44">
              <table border="0" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#dcfce7" style="background-color:#dcfce7;border-radius:50%;width:32px;height:32px;font-size:16px;line-height:32px;">&#129504;</td>
              </tr></table>
            </td>
            <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Acessar a base de conhecimento</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Conte&#250;dos exclusivos sobre GLP-1 e nutri&#231;&#227;o</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;vertical-align:middle;" width="44">
              <table border="0" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#dcfce7" style="background-color:#dcfce7;border-radius:50%;width:32px;height:32px;font-size:16px;line-height:32px;">&#128172;</td>
              </tr></table>
            </td>
            <td style="padding:10px 0 10px 12px;vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Chat com a nutricionista</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Dispon&#237;vel nos planos Plus e Premium</p>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td align="center">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr><td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:10px;">
                <a href="https://minhanutrionline.com.br/dashboard"
                   style="display:inline-block;color:#ffffff;text-decoration:none;padding:16px 40px;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">
                  Acessar minha &#225;rea &#8594;
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- SIGNATURE -->
    <tr>
      <td bgcolor="#fafafa" style="background-color:#fafafa;padding:24px 40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <table border="0" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:50%;width:44px;height:44px;font-size:18px;font-weight:bold;color:#ffffff;line-height:44px;font-family:Arial,Helvetica,sans-serif;">E</td>
              </tr></table>
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Elane Oliveira</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Nutricionista &middot; CRN-14533</p>
              <p style="margin:2px 0 0;font-size:13px;color:#16a34a;font-family:Arial,Helvetica,sans-serif;">MinhaNutri Online</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td align="center" bgcolor="#f3f4f6" style="background-color:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
          As orienta&#231;&#245;es s&#227;o de car&#225;ter educacional e n&#227;o substituem consulta m&#233;dica presencial.
        </p>
        <p style="margin:0;font-size:12px;color:#d1d5db;font-family:Arial,Helvetica,sans-serif;">
          &copy; 2026 MinhaNutri Online &nbsp;&middot;&nbsp;
          <a href="https://minhanutrionline.com.br" style="color:#16a34a;text-decoration:none;">minhanutrionline.com.br</a>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildWelcomeText(name: string): string {
  return `Olá, ${name}!\n\nSeu plano foi ativado com sucesso. Acesse sua área de membros em https://minhanutrionline.com.br/dashboard\n\nCom carinho,\nElane Oliveira — Nutricionista · CRN-14533`;
}

// Notifica o PACIENTE quando a nutri responde no chat
export async function sendChatReplyNotification(to: {
  name: string;
  email: string;
}) {
  try {
    const token = await getAccessToken();
    const firstName = to.name.split(" ")[0];
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
  <tr><td bgcolor="#16a34a" align="center" style="padding:32px 40px;">
    <h1 style="margin:0;color:#fff;font-size:22px;">MinhaNutri Online</h1>
    <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Nutrição especializada em GLP-1</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#111827;">Olá, ${firstName}! 💬</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
      A Elane respondeu sua mensagem no chat. Acesse sua área para ver a resposta!
    </p>
    <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="https://minhanutrionline.com.br/chat"
         style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:bold;">
        Ver resposta →
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td align="center" bgcolor="#f3f4f6" style="padding:16px 40px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 MinhaNutri Online · minhanutrionline.com.br</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: `Olá, ${firstName}!\n\nA Elane respondeu sua mensagem. Acesse: https://minhanutrionline.com.br/chat\n\nMinhaNutri Online`,
          subject: "💬 Elane respondeu sua mensagem",
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: to.name, email: to.email }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.error("[SendPulse] Erro ao notificar paciente no chat:", err);
  }
}

// Notifica a NUTRI quando um paciente envia uma nova mensagem
export async function sendChatPatientMessageNotification(patient: {
  name: string;
}) {
  const NUTRI_EMAIL = process.env.SENDPULSE_SENDER_EMAIL ?? FROM_EMAIL;
  const NUTRI_NAME = "Elane Oliveira";
  try {
    const token = await getAccessToken();
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
  <tr><td bgcolor="#16a34a" align="center" style="padding:32px 40px;">
    <h1 style="margin:0;color:#fff;font-size:22px;">MinhaNutri Online</h1>
    <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Painel da Nutricionista</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#111827;">Nova mensagem no chat 📩</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
      <strong>${patient.name}</strong> enviou uma nova mensagem e aguarda sua resposta.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="https://minhanutrionline.com.br/admin/chat"
         style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:bold;">
        Responder agora →
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td align="center" bgcolor="#f3f4f6" style="padding:16px 40px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 MinhaNutri Online · minhanutrionline.com.br</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: `${patient.name} enviou uma nova mensagem no chat. Acesse: https://minhanutrionline.com.br/admin/chat`,
          subject: `📩 Nova mensagem de ${patient.name}`,
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: NUTRI_NAME, email: NUTRI_EMAIL }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.error("[SendPulse] Erro ao notificar nutri no chat:", err);
  }
}

export async function sendPasswordResetEmail(
  to: { name: string; email: string },
  resetLink: string,
) {
  try {
    const token = await getAccessToken();
    const html = buildResetHtml(to.name, resetLink);
    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: `Ola, ${to.name}!\n\nRecebemos uma solicitacao para redefinir sua senha.\n\nClique no link abaixo (valido por 1 hora):\n${resetLink}\n\nSe nao foi voce, ignore este e-mail.\n\nElane Oliveira - MinhaNutri Online`,
          subject: "Redefinicao de senha - MinhaNutri Online",
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: to.name, email: to.email }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.error("[SendPulse] Erro ao enviar e-mail de reset:", err);
  }
}

function buildResetHtml(name: string, resetLink: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefini&#231;&#227;o de senha &#8212; MinhaNutri Online</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:Arial,Helvetica,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;">
  <tr><td align="center" style="padding:40px 16px;">

  <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">

    <!-- HEADER -->
    <tr>
      <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:16px 16px 0 0;padding:40px 40px 32px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding-bottom:14px;">
            <table border="0" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="#15803d" style="background-color:#15803d;border-radius:50%;width:60px;height:60px;font-size:28px;line-height:60px;">&#128274;</td>
            </tr></table>
          </td></tr>
          <tr><td align="center">
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">MinhaNutri Online</h1>
            <p style="margin:0;color:#bbf7d0;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Redefini&#231;&#227;o de senha</p>
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- STRIP -->
    <tr>
      <td align="center" bgcolor="#dcfce7" style="background-color:#dcfce7;padding:16px 40px;border-left:1px solid #bbf7d0;border-right:1px solid #bbf7d0;">
        <p style="margin:0;font-size:12px;font-weight:bold;color:#15803d;font-family:Arial,Helvetica,sans-serif;letter-spacing:1px;">SOLICITA&#199;&#195;O DE NOVA SENHA</p>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Ol&#225;, ${firstName}!</p>
        <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
          Recebemos uma solicita&#231;&#227;o para redefinir a senha da sua conta.
          Clique no bot&#227;o abaixo para criar uma nova senha.
        </p>

        <!-- CTA -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr><td align="center">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr><td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:10px;">
                <a href="${resetLink}"
                   style="display:inline-block;color:#ffffff;text-decoration:none;padding:18px 48px;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">
                  Redefinir minha senha &#8594;
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>

        <!-- EXPIRY NOTICE -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
          <tr>
            <td bgcolor="#fffbeb" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding-right:12px;font-size:20px;line-height:1;">&#9201;</td>
                  <td>
                    <p style="margin:0;font-size:14px;font-weight:bold;color:#92400e;font-family:Arial,Helvetica,sans-serif;">Link v&#225;lido por 1 hora</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#a16207;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">Ap&#243;s este prazo voc&#234; precisar&#225; solicitar um novo link de redefini&#231;&#227;o.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- SECURITY NOTE -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding-right:12px;font-size:18px;line-height:1;">&#128737;</td>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:bold;color:#374151;font-family:Arial,Helvetica,sans-serif;">N&#227;o solicitou essa redefini&#231;&#227;o?</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">Pode ignorar este e-mail com seguran&#231;a. Sua senha permanecer&#225; a mesma e nenhuma altera&#231;&#227;o ser&#225; feita.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- SIGNATURE -->
    <tr>
      <td bgcolor="#fafafa" style="background-color:#fafafa;padding:24px 40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <table border="0" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:50%;width:44px;height:44px;font-size:18px;font-weight:bold;color:#ffffff;line-height:44px;font-family:Arial,Helvetica,sans-serif;">E</td>
              </tr></table>
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Elane Oliveira</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Nutricionista &middot; CRN-14533</p>
              <p style="margin:2px 0 0;font-size:13px;color:#16a34a;font-family:Arial,Helvetica,sans-serif;">MinhaNutri Online</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td align="center" bgcolor="#f3f4f6" style="background-color:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
          As orienta&#231;&#245;es s&#227;o de car&#225;ter educacional e n&#227;o substituem consulta m&#233;dica presencial.
        </p>
        <p style="margin:0;font-size:12px;color:#d1d5db;font-family:Arial,Helvetica,sans-serif;">
          &copy; 2026 MinhaNutri Online &nbsp;&middot;&nbsp;
          <a href="https://minhanutrionline.com.br" style="color:#16a34a;text-decoration:none;">minhanutrionline.com.br</a>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Consulta confirmada ───────────────────────────────────────────────────────

export async function sendConsultationConfirmedEmail(
  to: { name: string; email: string },
  scheduledAt: Date,
  meetingLink?: string | null,
) {
  try {
    const token = await getAccessToken();
    const html = buildConsultationConfirmedHtml(
      to.name,
      scheduledAt,
      meetingLink,
    );
    const dateStr = scheduledAt.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timeStr = scheduledAt.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: `Olá, ${to.name.split(" ")[0]}!\n\nSua consulta foi confirmada para ${dateStr} às ${timeStr} (horário de Brasília).${meetingLink ? `\n\nLink da videochamada: ${meetingLink}` : ""}\n\nElane Oliveira - MinhaNutri Online`,
          subject: "Consulta confirmada! ✓",
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: to.name, email: to.email }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.error("[SendPulse] Erro ao enviar confirmação de consulta:", err);
  }
}

function buildConsultationConfirmedHtml(
  name: string,
  scheduledAt: Date,
  meetingLink?: string | null,
): string {
  const firstName = name.split(" ")[0];
  const dateStr = scheduledAt.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = scheduledAt.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

  const meetingBlock = meetingLink
    ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
        <tr><td align="center">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr><td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:10px;">
              <a href="${meetingLink}"
                 style="display:inline-block;color:#ffffff;text-decoration:none;padding:18px 48px;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">
                Entrar na videochamada &#8594;
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>`
    : `<p style="margin:28px 0 0;font-size:14px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">
        O link da videochamada será enviado em breve pela nutricionista.
      </p>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Consulta confirmada</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:Arial,Helvetica,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;">
  <tr><td align="center" style="padding:40px 16px;">
  <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">
    <tr>
      <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:16px 16px 0 0;padding:40px 40px 32px;">
        <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Consulta Confirmada!</h1>
        <p style="margin:0;color:#bbf7d0;font-size:14px;font-family:Arial,Helvetica,sans-serif;">MinhaNutri Online — Elane Oliveira</p>
      </td>
    </tr>
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Olá, ${firstName}!</p>
        <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
          Sua consulta online com a nutricionista <strong>Elane Oliveira</strong> foi confirmada!
        </p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td bgcolor="#f0fdf4" style="background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#15803d;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;">Data &amp; Horário</p>
              <p style="margin:0;font-size:18px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">${dateStr}</p>
              <p style="margin:4px 0 0;font-size:16px;color:#16a34a;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">${timeStr} — Horário de Brasília</p>
            </td>
          </tr>
        </table>
        ${meetingBlock}
      </td>
    </tr>
    <tr>
      <td align="center" bgcolor="#f3f4f6" style="background-color:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0;font-size:12px;color:#d1d5db;font-family:Arial,Helvetica,sans-serif;">
          &copy; 2026 MinhaNutri Online &nbsp;&middot;&nbsp;
          <a href="https://minhanutrionline.com.br" style="color:#16a34a;text-decoration:none;">minhanutrionline.com.br</a>
        </p>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── VERIFICAÇÃO DE E-MAIL ────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: { name: string; email: string },
  verifyLink: string,
) {
  try {
    const token = await getAccessToken();
    const firstName = to.name.split(" ")[0];
    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu e-mail &#8212; MinhaNutri Online</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:Arial,Helvetica,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;">
  <tr><td align="center" style="padding:40px 16px;">
  <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">

    <tr>
      <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:16px 16px 0 0;padding:40px 40px 32px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding-bottom:14px;">
            <table border="0" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="#15803d" style="background-color:#15803d;border-radius:50%;width:60px;height:60px;font-size:28px;line-height:60px;">&#10003;</td>
            </tr></table>
          </td></tr>
          <tr><td align="center">
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">MinhaNutri Online</h1>
            <p style="margin:0;color:#bbf7d0;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Confirme seu e-mail para come&#231;ar</p>
          </td></tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#dcfce7" style="background-color:#dcfce7;padding:16px 40px;border-left:1px solid #bbf7d0;border-right:1px solid #bbf7d0;">
        <p style="margin:0;font-size:12px;font-weight:bold;color:#15803d;font-family:Arial,Helvetica,sans-serif;letter-spacing:1px;">&#9993;&nbsp; CONFIRMA&#199;&#195;O DE E-MAIL</p>
      </td>
    </tr>

    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Ol&#225;, ${firstName}!</p>
        <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
          Obrigada por se cadastrar no MinhaNutri Online! Para ativar sua conta e come&#231;ar a usar nossas ferramentas, confirme seu e-mail clicando no bot&#227;o abaixo.
        </p>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr><td align="center">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr><td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:10px;">
                <a href="${verifyLink}"
                   style="display:inline-block;color:#ffffff;text-decoration:none;padding:18px 48px;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">
                  Confirmar meu e-mail &#8594;
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
          <tr>
            <td bgcolor="#fffbeb" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding-right:12px;font-size:20px;line-height:1;">&#9201;</td>
                  <td>
                    <p style="margin:0;font-size:14px;font-weight:bold;color:#92400e;font-family:Arial,Helvetica,sans-serif;">Link v&#225;lido por 24 horas</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#a16207;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">Se precisar, voc&#234; pode solicitar um novo link de confirma&#231;&#227;o na p&#225;gina de login.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:13px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">Se voc&#234; n&#227;o criou uma conta no MinhaNutri Online, pode ignorar este e-mail com seguran&#231;a.</p>
      </td>
    </tr>

    <tr>
      <td bgcolor="#fafafa" style="background-color:#fafafa;padding:24px 40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <table border="0" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:50%;width:44px;height:44px;font-size:18px;font-weight:bold;color:#ffffff;line-height:44px;font-family:Arial,Helvetica,sans-serif;">E</td>
              </tr></table>
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;font-family:Arial,Helvetica,sans-serif;">Elane Oliveira</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Nutricionista &middot; CRN-14533</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#f3f4f6" style="background-color:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0;font-size:12px;color:#d1d5db;font-family:Arial,Helvetica,sans-serif;">
          &copy; 2026 MinhaNutri Online &nbsp;&middot;&nbsp;
          <a href="https://minhanutrionline.com.br" style="color:#16a34a;text-decoration:none;">minhanutrionline.com.br</a>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: `Olá, ${firstName}!\n\nConfirme seu e-mail para ativar sua conta:\n${verifyLink}\n\nLink válido por 24 horas.\n\nElane Oliveira — MinhaNutri Online`,
          subject: "Confirme seu e-mail — MinhaNutri Online",
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: to.name, email: to.email }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.error("[SendPulse] Erro ao enviar e-mail de verificação:", err);
  }
}

// ── FORMULÁRIO DE CONTATO ────────────────────────────────────────────────────

export async function sendContactEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const NUTRI_EMAIL = process.env.SENDPULSE_SENDER_EMAIL ?? FROM_EMAIL;
  try {
    const token = await getAccessToken();
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
  <tr><td bgcolor="#16a34a" align="center" style="padding:32px 40px;">
    <h1 style="margin:0;color:#fff;font-size:22px;">MinhaNutri Online</h1>
    <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Nova mensagem do formulário de contato</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 20px;font-size:16px;font-weight:bold;color:#111827;">📩 Nova mensagem de contato</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Nome</td>
          <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:bold;color:#111827;">${data.name}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">E-mail</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;"><a href="mailto:${data.email}" style="color:#16a34a;">${data.email}</a></td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Assunto</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${data.subject}</td></tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Mensagem:</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${data.message}</div>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">Responda diretamente para: <a href="mailto:${data.email}" style="color:#16a34a;">${data.email}</a></p>
  </td></tr>
  <tr><td align="center" bgcolor="#f3f4f6" style="padding:16px 40px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 MinhaNutri Online · minhanutrionline.com.br</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: Buffer.from(html).toString("base64"),
          text: `Nova mensagem de contato\n\nNome: ${data.name}\nE-mail: ${data.email}\nAssunto: ${data.subject}\n\nMensagem:\n${data.message}`,
          subject: `[Contato] ${data.subject}`,
          from: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ name: "Elane Oliveira", email: NUTRI_EMAIL }],
          reply_to: { name: data.name, email: data.email },
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    console.error("[SendPulse] Erro ao enviar e-mail de contato:", err);
    throw err;
  }
}
