import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env";
import { sendPasswordResetEmail } from "../services/sendpulse.service";
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
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const signOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    signOptions,
  );

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
  const { name, email } = req.body;

  if (!name && !email) {
    res.status(400).json({ message: "Nada para atualizar" });
    return;
  }

  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: req.user!.userId } },
    });
    if (existing) {
      res.status(409).json({ message: "E-mail já está em uso" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { ...(name && { name }), ...(email && { email }) },
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
      subscription: {
        select: {
          status: true,
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
