import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePlan } from "../middlewares/plan.middleware";
import {
  getSymptoms,
  createReport,
  getReports,
  rateReport,
  requestReview,
  getFreeStatus,
} from "../controllers/glp1.controller";

const router = Router();

router.use(authenticate);

router.get("/free-status", getFreeStatus);
router.get("/symptoms", getSymptoms);
router.post("/report", createReport);
router.get("/reports", getReports);
router.patch("/report/:id/helpful", rateReport);
router.post("/report/:id/review", requirePlan("BASIC"), requestReview);

export default router;
