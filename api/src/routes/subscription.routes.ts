import { Router } from "express";
import {
  checkout,
  getMySubscription,
  cancelSubscription,
  upgradeSubscription,
  downgradeSubscription,
  cancelDowngrade,
  testApplyDowngrade,
} from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/checkout", authenticate, checkout);
router.get("/me", authenticate, getMySubscription);
router.delete("/me", authenticate, cancelSubscription);
router.post("/upgrade", authenticate, upgradeSubscription);
router.post("/downgrade", authenticate, downgradeSubscription);
router.delete("/downgrade", authenticate, cancelDowngrade);
router.post("/test-apply-downgrade", authenticate, testApplyDowngrade);

export default router;
