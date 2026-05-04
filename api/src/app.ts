import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { FRONTEND_URL } from "./config/env";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env["NODE_ENV"] === "production" ? FRONTEND_URL : "*",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1", routes);

app.use((_req, res) =>
  res.status(404).json({ message: "Rota não encontrada" }),
);

export default app;
