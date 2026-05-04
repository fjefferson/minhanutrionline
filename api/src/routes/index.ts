import { Router } from "express";
import authRoutes from "./auth.routes";
import subscriptionRoutes from "./subscription.routes";
import webhookRoutes from "./webhook.routes";
import adminRoutes from "./admin.routes";
import glp1Routes from "./glp1.routes";
import chatRoutes from "./chat.routes";
import profileRoutes from "./profile.routes";
import consultationRoutes from "./consultation.routes";
import { getPlans, getPublicPlans } from "../controllers/admin.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/admin", adminRoutes);
router.use("/glp1", glp1Routes);
router.use("/chat", chatRoutes);
router.use("/profile", profileRoutes);
router.use("/consultations", consultationRoutes);
router.get("/plans", getPlans);
router.get("/plans/public", getPublicPlans);

export default router;
