import multer from "multer";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

// Guarda o arquivo em memória — o controller faz o upload para o Cloudinary
export const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Tipo de arquivo não permitido. Use imagens ou documentos PDF/Word.",
        ),
      );
    }
  },
});

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    if (IMAGE_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Use uma imagem JPEG, PNG ou WebP."));
    }
  },
});

export const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Tipo de arquivo não permitido. Use imagens ou documentos PDF/Word.",
        ),
      );
    }
  },
});

// Accepts both the main file and an optional cover image in a single request
export const materialUploadFields = materialUpload.fields([
  { name: "file", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]);
