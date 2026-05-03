import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";
import {
  getAdminStats,
  getAdminSubscriptions,
  activateSubscription,
  cancelSubscription,
  getPlans,
  updatePlan,
  getKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getSymptoms,
  createSymptom,
  updateSymptom,
  deleteSymptom,
  getAdminChatSessions,
  closeAdminChatSession,
  getGlp1Reviews,
  resolveGlp1Review,
  getAdminUsers,
  getAdminUserProfile,
} from "../controllers/admin.controller";
import {
  adminListConsultations,
  adminUpdateConsultation,
  adminListAgendaBlocks,
  adminCreateAgendaBlock,
  adminDeleteAgendaBlock,
  adminGetConsultationConfig,
  adminUpdateConsultationConfig,
} from "../controllers/consultation.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/stats", getAdminStats);
router.get("/subscriptions", getAdminSubscriptions);
router.patch("/subscriptions/:id/activate", activateSubscription);
router.patch("/subscriptions/:id/cancel", cancelSubscription);
router.get("/plans", getPlans);
router.put("/plans/:id", updatePlan);
router.get("/knowledge", getKnowledge);
router.post("/knowledge", createKnowledge);
router.put("/knowledge/:id", updateKnowledge);
router.delete("/knowledge/:id", deleteKnowledge);
router.get("/symptoms", getSymptoms);
router.post("/symptoms", createSymptom);
router.put("/symptoms/:id", updateSymptom);
router.delete("/symptoms/:id", deleteSymptom);
router.get("/chat/sessions", getAdminChatSessions);
router.patch("/chat/sessions/:id/close", closeAdminChatSession);
router.get("/glp1/reviews", getGlp1Reviews);
router.patch("/glp1/reviews/:id/resolve", resolveGlp1Review);
router.get("/consultations", adminListConsultations);
router.put("/consultations/:id", adminUpdateConsultation);
router.get("/agenda-blocks", adminListAgendaBlocks);
router.post("/agenda-blocks", adminCreateAgendaBlock);
router.delete("/agenda-blocks/:id", adminDeleteAgendaBlock);
router.get("/consultation-config", adminGetConsultationConfig);
router.put("/consultation-config", adminUpdateConsultationConfig);
router.get("/users", getAdminUsers);
router.get("/users/:id/profile", getAdminUserProfile);

export default router;
