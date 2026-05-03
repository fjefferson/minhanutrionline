import { Router } from "express";
import {
  checkout,
  getMySubscription,
  mpWebhook,
} from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/checkout", authenticate, checkout);
router.get("/me", authenticate, getMySubscription);

export default router;
