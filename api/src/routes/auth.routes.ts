import { Router } from "express";
import {
  register,
  login,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  completeOnboarding,
  uploadAvatar,
} from "../controllers/auth.controller";
import {
  registerValidator,
  loginValidator,
} from "../validators/auth.validator";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { avatarUpload } from "../middlewares/upload.middleware";

const router = Router();

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateMe);
router.put("/password", authenticate, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/onboarding-done", authenticate, completeOnboarding);
router.post(
  "/avatar",
  authenticate,
  avatarUpload.single("avatar"),
  uploadAvatar,
);

export default router;
