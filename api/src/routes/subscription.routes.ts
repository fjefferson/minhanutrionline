import { Router } from "express";
import {
  checkout,
  getMySubscription,
  cancelSubscription,
  upgradeSubscription,
} from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/checkout", authenticate, checkout);
router.get("/me", authenticate, getMySubscription);
router.delete("/me", authenticate, cancelSubscription);
router.post("/upgrade", authenticate, upgradeSubscription);

export default router;
