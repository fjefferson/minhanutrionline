import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/sendpulse.service";
import { cancelAsaasSubscription } from "../services/asaas.service";
import cloudinary from "../config/cloudinary";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "E-mail já cadastrado" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      emailVerifyToken: verifyToken,
      emailVerifyExpiry: verifyExpiry,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
  });

  const signOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    signOptions,
  );

  const verifyLink = `${FRONTEND_URL}/confirmar-email?token=${verifyToken}`;
  // Fire-and-forget — não bloqueia o registro
  sendVerificationEmail(
    { name: user.name, email: user.email },
    verifyLink,
  ).catch(() => {});

  res.status(201).json({ user, token });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      subscription: { include: { plan: true } },
    },
  });
  if (!user) {
    res.status(401).json({ message: "Credenciais inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ message: "Credenciais inválidas" });
    return;
  }

  if (!user.emailVerified && user.role !== "ADMIN") {
    res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message:
        "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
    });
    return;
  }

  const signOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    signOptions,
  );

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      emailVerified: user.emailVerified,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            plan: {
              type: user.subscription.plan.type,
              name: user.subscription.plan.name,
            },
          }
        : null,
    },
    token,
  });
};

export const updateMe = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<void> => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ message: "Nada para atualizar" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });

  res.json(updated);
};

export const changePassword = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Campos obrigatórios" });
    return;
  }
  if (newPassword.length < 6) {
    res
      .status(400)
      .json({ message: "A nova senha deve ter ao menos 6 caracteres" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });
  if (!user) {
    res.status(404).json({ message: "Usuário não encontrado" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ message: "Senha atual incorreta" });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { password: hashed },
  });

  res.json({ message: "Senha alterada com sucesso" });
};

export const me = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      onboardingDone: true,
      avatarUrl: true,
      emailVerified: true,
      subscription: {
        select: {
          status: true,
          cancelScheduledAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          plan: { select: { type: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ message: "Usuário não encontrado" });
    return;
  }

  res.json(user);
};

export const completeOnboarding = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<void> => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { onboardingDone: true },
  });
  res.json({ ok: true });
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = req.query as { token?: string };

  if (!token) {
    res.status(400).json({ message: "Token ausente" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res
      .status(400)
      .json({ message: "Link inválido ou expirado. Solicite um novo." });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });

  // Redireciona para o front com sucesso
  res.redirect(`${FRONTEND_URL}/confirmar-email?success=1`);
};

export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ message: "E-mail obrigatório" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Resposta genérica para não vazar existência do e-mail
  if (!user || user.emailVerified) {
    res.json({
      message:
        "Se o e-mail existir e ainda não foi verificado, enviaremos um novo link.",
    });
    return;
  }

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry },
  });

  const verifyLink = `${FRONTEND_URL}/confirmar-email?token=${verifyToken}`;
  sendVerificationEmail(
    { name: user.name, email: user.email },
    verifyLink,
  ).catch(() => {});

  res.json({
    message:
      "Se o e-mail existir e ainda não foi verificado, enviaremos um novo link.",
  });
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: "E-mail obrigatório" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Sempre responde com sucesso para não vazar se e-mail existe
  if (!user) {
    res.json({
      message:
        "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
    });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetLink = `${FRONTEND_URL}/redefinir-senha?token=${token}`;
  await sendPasswordResetEmail(
    { name: user.name, email: user.email },
    resetLink,
  );

  res.json({
    message:
      "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
  });
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ message: "Campos obrigatórios" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ message: "A senha deve ter ao menos 6 caracteres" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ message: "Link inválido ou expirado" });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: "Senha redefinida com sucesso!" });
};

export const uploadAvatar = async (
  req: Request & { user?: { userId: string }; file?: Express.Multer.File },
  res: Response,
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "Nenhum arquivo enviado" });
    return;
  }

  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "avatars",
    transformation: [
      { width: 256, height: 256, crop: "fill", gravity: "face" },
    ],
    resource_type: "image",
  });

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl: result.secure_url },
    select: { avatarUrl: true },
  });

  res.json({ avatarUrl: updated.avatarUrl });
};

// DELETE /auth/me — exclusão de conta (LGPD)
export const deleteAccount = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<void> => {
  const userId = req.user!.userId;

  // Verifica senha para confirmar identidade
  const { password } = req.body as { password?: string };
  if (!password) {
    res
      .status(400)
      .json({ message: "Informe sua senha para confirmar a exclusão" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ message: "Usuário não encontrado" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ message: "Senha incorreta" });
    return;
  }

  // Cancela assinatura no Asaas antes de apagar os dados
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.mpSubscriptionId) {
    try {
      await cancelAsaasSubscription(sub.mpSubscriptionId);
    } catch {
      // Continua mesmo se o cancelamento no Asaas falhar
    }
  }

  // Remove todos os dados do usuário em ordem segura (respeita FK)
  await prisma.$transaction([
    // ReportSymptom → SymptomReport
    prisma.reportSymptom.deleteMany({
      where: { report: { userId } },
    }),
    prisma.symptomReport.deleteMany({ where: { userId } }),
    // ChatMessages → ChatSessions
    prisma.chatMessage.deleteMany({
      where: { session: { userId } },
    }),
    prisma.chatSession.deleteMany({ where: { userId } }),
    // Consultas
    prisma.consultation.deleteMany({ where: { userId } }),
    // Perfil nutricional
    prisma.nutritionalProfile.deleteMany({ where: { userId } }),
    // Assinatura
    prisma.subscription.deleteMany({ where: { userId } }),
    // Usuário
    prisma.user.delete({ where: { id: userId } }),
  ]);

  res.json({
    message: "Conta excluída com sucesso. Todos os seus dados foram removidos.",
  });
};
