import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePlan } from "../middlewares/plan.middleware";
import {
  getSymptoms,
  createReport,
  getReports,
  rateReport,
  requestReview,
} from "../controllers/glp1.controller";

const router = Router();

router.use(authenticate);

router.get("/symptoms", getSymptoms);
router.post("/report", requirePlan("BASIC"), createReport);
router.get("/reports", requirePlan("BASIC"), getReports);
router.patch("/report/:id/helpful", requirePlan("BASIC"), rateReport);
router.post("/report/:id/review", requirePlan("BASIC"), requestReview);

export default router;
