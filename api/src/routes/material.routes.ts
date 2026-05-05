import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  listCategories,
  listMaterials,
  getMaterial,
  trackView,
  trackDownload,
  reactMaterial,
  getMaterialReaction,
  listComments,
  createComment,
  deleteComment,
} from "../controllers/material.controller";

const router = Router();

router.use(authenticate);

router.get("/categories", listCategories);
router.get("/", listMaterials);
router.get("/:id", getMaterial);
router.post("/:id/view", trackView);
router.post("/:id/download", trackDownload);

// Reactions
router.get("/:id/reaction", getMaterialReaction);
router.post("/:id/reaction", reactMaterial);

// Comments
router.get("/:id/comments", listComments);
router.post("/:id/comments", createComment);
router.delete("/comments/:commentId", deleteComment);

export default router;
