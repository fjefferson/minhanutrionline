import { Router } from "express";
import { mpWebhook } from "../controllers/subscription.controller";

const router = Router();

router.post("/mp", mpWebhook);

export default router;
