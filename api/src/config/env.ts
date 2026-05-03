import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value)
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  return value;
}

export const DATABASE_URL = required("DATABASE_URL");
export const JWT_SECRET = required("JWT_SECRET");
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as string;
export const PORT = process.env.PORT ?? "3001";
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";
export const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? "";
export const MP_BACK_URL =
  process.env.MP_BACK_URL ?? "https://minhanutrionline.com.br/checkout/success";
export const MP_TEST_PAYER_EMAIL = process.env.MP_TEST_PAYER_EMAIL ?? "";
