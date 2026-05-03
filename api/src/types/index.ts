export type PlanType = "BASIC" | "PLUS" | "PREMIUM";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}
