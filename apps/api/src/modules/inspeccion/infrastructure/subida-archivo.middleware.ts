import multer from "multer";

/** Middleware de subida de un único archivo de evidencia — buffer en memoria, límite 10MB (ver `evidencia.entity.ts`). */
export const subidaArchivoEvidencia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("archivo");
