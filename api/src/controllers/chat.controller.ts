import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import cloudinary from "../config/cloudinary";

// GET /chat/sessions — todas as sessões do usuário (histórico)
export async function getSessions(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  res.json(sessions);
}

// GET /chat/session — retorna sessão OPEN do usuário (ou 404)
export async function getSession(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const session = await prisma.chatSession.findFirst({
    where: { userId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    res.status(404).json({ message: "Nenhuma sessão ativa" });
    return;
  }

  res.json(session);
}

// POST /chat/session — cria nova sessão para o usuário
export async function createSession(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;

  // Fecha sessões anteriores abertas
  await prisma.chatSession.updateMany({
    where: { userId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  const session = await prisma.chatSession.create({
    data: { userId, status: "OPEN" },
    include: { messages: true },
  });

  res.status(201).json(session);
}

// GET /chat/session/:id/messages
export async function getMessages(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;
  const role = req.user!.role;

  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) {
    res.status(404).json({ message: "Sessão não encontrada" });
    return;
  }
  if (role !== "ADMIN" && session.userId !== userId) {
    res.status(403).json({ message: "Acesso negado" });
    return;
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  // Marca mensagens do outro lado como lidas
  const otherRole = role === "ADMIN" ? "USER" : "ADMIN";
  await prisma.chatMessage.updateMany({
    where: { sessionId: id, senderRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  });

  res.json(messages);
}

// POST /chat/session/:id/messages
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;
  const role = req.user!.role;
  const { content } = req.body as { content?: string };

  // Arquivo enviado via multer (buffer em memória)
  const file = req.file as
    | (Express.Multer.File & { buffer: Buffer })
    | undefined;
  let fileUrl: string | undefined;
  const fileType: string | undefined = file ? file.mimetype : undefined;

  if (file) {
    const isImage = file.mimetype.startsWith("image/");
    const base64 = file.buffer.toString("base64");
    const dataUri = `data:${file.mimetype};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "minhanutrionline/chat",
      resource_type: isImage ? "image" : "raw",
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
      use_filename: false,
    });
    fileUrl = result.secure_url;
  }

  // Mensagem precisa ter texto ou arquivo
  if (!content?.trim() && !fileUrl) {
    res.status(400).json({ message: "Envie uma mensagem ou arquivo" });
    return;
  }

  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) {
    res.status(404).json({ message: "Sessão não encontrada" });
    return;
  }
  if (session.status === "CLOSED") {
    res.status(400).json({ message: "Sessão encerrada" });
    return;
  }
  if (role !== "ADMIN" && session.userId !== userId) {
    res.status(403).json({ message: "Acesso negado" });
    return;
  }

  const message = await prisma.chatMessage.create({
    data: {
      sessionId: id,
      senderId: userId,
      senderRole: role,
      content: content?.trim() ?? "",
      fileUrl: fileUrl ?? null,
      fileType: fileType ?? null,
    },
  });

  res.status(201).json(message);
}

// POST /chat/session/:id/rating
export async function rateSession(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;
  const { rating, ratingComment } = req.body as {
    rating: number;
    ratingComment?: string;
  };

  if (!rating || rating < 1 || rating > 5) {
    res
      .status(400)
      .json({ message: "Nota inválida. Envie um valor entre 1 e 5." });
    return;
  }

  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session || session.userId !== userId) {
    res.status(404).json({ message: "Sessão não encontrada" });
    return;
  }
  if (session.status !== "CLOSED") {
    res
      .status(400)
      .json({ message: "Só é possível avaliar sessões encerradas." });
    return;
  }
  if (session.rating != null) {
    res.status(400).json({ message: "Esta sessão já foi avaliada." });
    return;
  }

  const updated = await prisma.chatSession.update({
    where: { id },
    data: { rating, ratingComment: ratingComment?.trim() ?? null },
  });

  res.json(updated);
}
