import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { chatUpload } from "../middlewares/upload.middleware";
import {
  getSessions,
  getSession,
  createSession,
  getMessages,
  sendMessage,
  rateSession,
  getUnreadCount,
} from "../controllers/chat.controller";

const router = Router();

router.get("/unread-count", authenticate, getUnreadCount);

router.get("/sessions", authenticate, getSessions);
router.get("/session", authenticate, getSession);
router.post("/session", authenticate, createSession);
router.get("/session/:id/messages", authenticate, getMessages);
router.post(
  "/session/:id/messages",
  authenticate,
  chatUpload.single("file"),
  sendMessage,
);
router.post("/session/:id/rating", authenticate, rateSession);

export default router;
