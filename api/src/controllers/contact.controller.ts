import { Request, Response } from "express";
import { sendContactEmail } from "../services/sendpulse.service";

// Campos válidos para o assunto
const VALID_SUBJECTS = [
  "Dúvida sobre planos",
  "Suporte técnico",
  "Informações sobre GLP-1",
  "Parceria",
  "Outro",
];

export const contact = async (req: Request, res: Response): Promise<void> => {
  const { name, email, subject, message, _honey } = req.body;

  // Honeypot: bots preenchem esse campo, humanos não
  if (_honey) {
    res.status(200).json({ message: "Mensagem enviada com sucesso!" });
    return;
  }

  // Validações básicas
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ message: "Nome inválido." });
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: "E-mail inválido." });
    return;
  }
  if (!subject || !VALID_SUBJECTS.includes(subject)) {
    res.status(400).json({ message: "Assunto inválido." });
    return;
  }
  if (!message || typeof message !== "string" || message.trim().length < 10) {
    res.status(400).json({ message: "Mensagem muito curta." });
    return;
  }
  if (message.trim().length > 2000) {
    res.status(400).json({ message: "Mensagem muito longa." });
    return;
  }

  await sendContactEmail({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject,
    message: message.trim(),
  });

  res.status(200).json({ message: "Mensagem enviada com sucesso!" });
};
