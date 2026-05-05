import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import cloudinary from "../config/cloudinary";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { MaterialType } from "@prisma/client";

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

async function uploadToCloudinary(
  buffer: Buffer,
  mimetype: string,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  const isImage = mimetype.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  const b64 = buffer.toString("base64");
  const dataUri = `data:${mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: resourceType,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

// ──────────────────────────────────────────────────────
// CATEGORIES — ADMIN
// ──────────────────────────────────────────────────────

export async function adminListCategories(_req: Request, res: Response) {
  const cats = await prisma.materialCategory.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { materials: { where: { active: true } } } } },
  });
  res.json(cats);
}

export async function adminCreateCategory(req: Request, res: Response) {
  const { name, description, icon, color, order } = req.body as {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
  };
  if (!name?.trim()) {
    res.status(400).json({ message: "Nome é obrigatório." });
    return;
  }
  const cat = await prisma.materialCategory.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? null,
      icon: icon?.trim() ?? null,
      color: color ?? "#16a34a",
      order: order ?? 0,
    },
  });
  res.status(201).json(cat);
}

export async function adminUpdateCategory(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { name, description, icon, color, order, active } = req.body as {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
    active?: boolean;
  };
  const cat = await prisma.materialCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description.trim() || null,
      }),
      ...(icon !== undefined && { icon: icon.trim() || null }),
      ...(color !== undefined && { color }),
      ...(order !== undefined && { order }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(cat);
}

export async function adminDeleteCategory(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const count = await prisma.material.count({ where: { categoryId: id } });
  if (count > 0) {
    res.status(400).json({
      message: "Remova os materiais desta categoria antes de excluí-la.",
    });
    return;
  }
  await prisma.materialCategory.delete({ where: { id } });
  res.json({ ok: true });
}

// ──────────────────────────────────────────────────────
// MATERIALS — ADMIN
// ──────────────────────────────────────────────────────

export async function adminListMaterials(req: Request, res: Response) {
  const { categoryId } = req.query as { categoryId?: string };
  const materials = await prisma.material.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { category: { select: { id: true, name: true, color: true } } },
  });
  res.json(materials);
}

export async function adminCreateMaterial(req: Request, res: Response) {
  const { categoryId, title, description, type, url } = req.body as {
    categoryId: string;
    title: string;
    description?: string;
    type: MaterialType;
    url?: string;
  };

  // FormData sends everything as strings — coerce explicitly
  const featured = req.body.featured === true || req.body.featured === "true";
  const order = Number(req.body.order ?? 0);

  if (!categoryId || !title?.trim() || !type) {
    res
      .status(400)
      .json({ message: "categoryId, title e type são obrigatórios." });
    return;
  }

  const catExists = await prisma.materialCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!catExists) {
    res.status(404).json({ message: "Categoria não encontrada." });
    return;
  }

  let finalUrl = url ?? "";
  let thumbnailUrl: string | null = null;
  let fileSize: number | null = null;

  if (type === "VIDEO") {
    if (!url?.trim()) {
      res
        .status(400)
        .json({ message: "URL do YouTube é obrigatória para vídeos." });
      return;
    }
    thumbnailUrl = getYoutubeThumbnail(url);
    finalUrl = url.trim();
  } else {
    // File upload via multipart (.fields middleware)
    const files =
      (req as Request & { files?: Record<string, Express.Multer.File[]> })
        .files ?? {};
    const file = files["file"]?.[0];
    const cover = files["cover"]?.[0];

    if (!file) {
      res
        .status(400)
        .json({ message: "Arquivo é obrigatório para este tipo." });
      return;
    }
    fileSize = file.size;
    const result = await uploadToCloudinary(
      file.buffer,
      file.mimetype,
      "materiais",
    );
    finalUrl = result.url;

    if (cover) {
      // Explicit cover image uploaded
      const coverResult = await uploadToCloudinary(
        cover.buffer,
        cover.mimetype,
        "materiais/covers",
      );
      thumbnailUrl = coverResult.url;
    } else if (file.mimetype.startsWith("image/")) {
      thumbnailUrl = finalUrl;
    }
  }

  const material = await prisma.material.create({
    data: {
      categoryId,
      title: title.trim(),
      description: description?.trim() ?? null,
      type,
      url: finalUrl,
      thumbnailUrl,
      fileSize,
      featured: featured ?? false,
      order: order ?? 0,
    },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  res.status(201).json(material);
}

export async function adminUpdateMaterial(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { categoryId, title, description, active, url } = req.body as {
    categoryId?: string;
    title?: string;
    description?: string;
    active?: boolean | string;
    url?: string;
  };

  // FormData sends booleans as strings
  const featured =
    req.body.featured !== undefined
      ? req.body.featured === true || req.body.featured === "true"
      : undefined;
  const order =
    req.body.order !== undefined ? Number(req.body.order) : undefined;

  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Material não encontrado." });
    return;
  }

  let thumbnailUrl = existing.thumbnailUrl;
  let finalUrl = existing.url;

  // Cover image upload (optional on edit)
  const files =
    (req as Request & { files?: Record<string, Express.Multer.File[]> })
      .files ?? {};
  const cover = files["cover"]?.[0];
  if (cover) {
    const coverResult = await uploadToCloudinary(
      cover.buffer,
      cover.mimetype,
      "materiais/covers",
    );
    thumbnailUrl = coverResult.url;
  }

  // If VIDEO and URL changed, update thumbnail
  if (existing.type === "VIDEO" && url && url !== existing.url) {
    finalUrl = url.trim();
    thumbnailUrl = getYoutubeThumbnail(url);
  }

  const activeVal =
    active !== undefined ? active === true || active === "true" : undefined;

  const material = await prisma.material.update({
    where: { id },
    data: {
      ...(categoryId && { categoryId }),
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && {
        description: description.trim() || null,
      }),
      ...(featured !== undefined && { featured }),
      ...(order !== undefined && { order }),
      ...(activeVal !== undefined && { active: activeVal }),
      ...(finalUrl !== existing.url && { url: finalUrl }),
      ...(thumbnailUrl !== existing.thumbnailUrl && { thumbnailUrl }),
    },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  res.json(material);
}

export async function adminDeleteMaterial(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  await prisma.material.delete({ where: { id } });
  res.json({ ok: true });
}

// ──────────────────────────────────────────────────────
// PUBLIC — PATIENT
// ──────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response) {
  const cats = await prisma.materialCategory.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { materials: { where: { active: true } } } },
    },
  });
  res.json(cats);
}

export async function listMaterials(req: Request, res: Response) {
  const { categoryId, search, featured } = req.query as {
    categoryId?: string;
    search?: string;
    featured?: string;
  };

  const where: Record<string, unknown> = { active: true };
  if (categoryId) where["categoryId"] = categoryId;
  if (featured === "true") where["featured"] = true;
  if (search?.trim()) {
    where["OR"] = [
      { title: { contains: search.trim(), mode: "insensitive" } },
      { description: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const materials = await prisma.material.findMany({
    where,
    orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
  res.json(materials);
}

export async function getMaterial(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const material = await prisma.material.findFirst({
    where: { id, active: true },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
  if (!material) {
    res.status(404).json({ message: "Material não encontrado." });
    return;
  }
  res.json(material);
}

export async function trackView(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const material = await prisma.material.update({
    where: { id },
    data: { views: { increment: 1 } },
    select: { views: true },
  });
  res.json(material);
}

export async function trackDownload(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const material = await prisma.material.update({
    where: { id },
    data: { downloads: { increment: 1 } },
    select: { downloads: true },
  });
  res.json(material);
}

// ──────────────────────────────────────────────────────
// REACTIONS (LIKE / DISLIKE)
// ──────────────────────────────────────────────────────

export async function reactMaterial(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;
  const { type } = req.body as { type: "LIKE" | "DISLIKE" };

  if (type !== "LIKE" && type !== "DISLIKE") {
    res.status(400).json({ message: "type deve ser LIKE ou DISLIKE." });
    return;
  }

  const existing = await prisma.materialReaction.findUnique({
    where: { materialId_userId: { materialId: id, userId } },
  });

  if (existing) {
    if (existing.type === type) {
      // Toggle off — remove reaction
      await prisma.materialReaction.delete({ where: { id: existing.id } });
      const counts = await reactionCounts(id);
      res.json({ userReaction: null, ...counts });
      return;
    }
    // Switch reaction type
    await prisma.materialReaction.update({
      where: { id: existing.id },
      data: { type },
    });
  } else {
    await prisma.materialReaction.create({
      data: { materialId: id, userId, type },
    });
  }

  const counts = await reactionCounts(id);
  res.json({ userReaction: type, ...counts });
}

async function reactionCounts(materialId: string) {
  const [likes, dislikes] = await Promise.all([
    prisma.materialReaction.count({ where: { materialId, type: "LIKE" } }),
    prisma.materialReaction.count({ where: { materialId, type: "DISLIKE" } }),
  ]);
  return { likes, dislikes };
}

export async function getMaterialReaction(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;

  const [existing, likes, dislikes] = await Promise.all([
    prisma.materialReaction.findUnique({
      where: { materialId_userId: { materialId: id, userId } },
      select: { type: true },
    }),
    prisma.materialReaction.count({ where: { materialId: id, type: "LIKE" } }),
    prisma.materialReaction.count({
      where: { materialId: id, type: "DISLIKE" },
    }),
  ]);

  res.json({ userReaction: existing?.type ?? null, likes, dislikes });
}

// ──────────────────────────────────────────────────────
// COMMENTS
// ──────────────────────────────────────────────────────

export async function listComments(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const comments = await prisma.materialComment.findMany({
    where: { materialId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.json(comments);
}

export async function createComment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ message: "Comentário não pode ser vazio." });
    return;
  }

  const material = await prisma.material.findFirst({
    where: { id, active: true },
    select: { id: true },
  });
  if (!material) {
    res.status(404).json({ message: "Material não encontrado." });
    return;
  }

  const comment = await prisma.materialComment.create({
    data: { materialId: id, userId, content: content.trim() },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.status(201).json(comment);
}

export async function deleteComment(req: AuthenticatedRequest, res: Response) {
  const { commentId } = req.params as { commentId: string };
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === "ADMIN";

  const comment = await prisma.materialComment.findUnique({
    where: { id: commentId },
  });
  if (!comment) {
    res.status(404).json({ message: "Comentário não encontrado." });
    return;
  }
  if (comment.userId !== userId && !isAdmin) {
    res.status(403).json({ message: "Sem permissão." });
    return;
  }
  await prisma.materialComment.delete({ where: { id: commentId } });
  res.json({ ok: true });
}
