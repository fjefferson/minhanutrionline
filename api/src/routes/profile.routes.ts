import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getProfile, upsertProfile } from "../controllers/profile.controller";

const router = Router();

router.use(authenticate);

router.get("/nutritional", getProfile);
router.put("/nutritional", upsertProfile);

export default router;
