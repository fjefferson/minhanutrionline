import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getSymptoms,
  createReport,
  getReports,
  rateReport,
  requestReview,
  getFreeStatus,
} from "../controllers/glp1.controller";
import {
  getDosageHistory,
  createDosageChange,
  updateDosageChange,
  deleteDosageChange,
} from "../controllers/glp1Dosage.controller";

const router = Router();

router.use(authenticate);

router.get("/free-status", getFreeStatus);
router.get("/symptoms", getSymptoms);
router.post("/report", createReport);
router.get("/reports", getReports);
router.patch("/report/:id/helpful", rateReport);
router.post("/report/:id/review", requestReview);

router.get("/dosage-history", getDosageHistory);
router.post("/dosage-change", createDosageChange);
router.patch("/dosage-change/:id", updateDosageChange);
router.delete("/dosage-change/:id", deleteDosageChange);

export default router;
