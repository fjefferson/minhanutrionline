import { Router } from "express";
import { asaasWebhook } from "../controllers/subscription.controller";

const router = Router();

router.post("/asaas", asaasWebhook);

export default router;
