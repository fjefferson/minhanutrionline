import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Nome é obrigatório"),
  body("email").isEmail().normalizeEmail().withMessage("E-mail inválido"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Senha deve ter no mínimo 8 caracteres"),
];

export const loginValidator = [
  body("email").isEmail().normalizeEmail().withMessage("E-mail inválido"),
  body("password").notEmpty().withMessage("Senha é obrigatória"),
];
