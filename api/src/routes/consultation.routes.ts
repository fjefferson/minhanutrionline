import { Router } from "express";
import {
  getEligibility,
  getAvailableSlots,
  listMyConsultations,
  bookConsultation,
  cancelConsultation,
  getPublicConsultationConfig,
  getBlockedDates,
} from "../controllers/consultation.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePlan } from "../middlewares/plan.middleware";

const router = Router();

// Public (no auth needed)
router.get("/config", getPublicConsultationConfig);
router.get("/blocked-dates", getBlockedDates);

router.use(authenticate);
router.use(requirePlan("PREMIUM"));

router.get("/eligibility", getEligibility);
router.get("/available-slots", getAvailableSlots);
router.get("/", listMyConsultations);
router.post("/", bookConsultation);
router.delete("/:id", cancelConsultation);

export default router;
