import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getEntries,
  createEntry,
  deleteEntry,
  getStats,
} from "../controllers/progress.controller";

const router = Router();

router.use(authenticate);

router.get("/entries", getEntries);
router.post("/entries", createEntry);
router.delete("/entries/:id", deleteEntry);
router.get("/stats", getStats);

export default router;
