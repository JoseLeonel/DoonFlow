import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { ErrorHttp } from "../shared/error-http";
import { hashClave } from "../modules/integraciones/domain/api-key.entity";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKey?: { id: string; empresaId: string };
    }
  }
}

/**
 * Autentica una request de la API pública (`/api/v1`) por el header `X-Api-Key` (009, HU-3).
 * No usa `Authorization: Bearer` a propósito — evita cualquier ambigüedad con el JWT de sesión
 * de usuario, que nunca aplica a esta ruta (no hay `req.usuario` en la API pública).
 */
export function crearMiddlewareAutenticacionApiKey(prisma: PrismaClient) {
  return async function autenticacionApiKey(req: Request, _res: Response, next: NextFunction) {
    try {
      const clave = req.headers["x-api-key"];
      if (!clave || typeof clave !== "string") {
        throw new ErrorHttp(401, "api_key_faltante", "Falta el header X-Api-Key.");
      }

      const apiKey = await prisma.apiKey.findFirst({ where: { claveHash: hashClave(clave), activa: true } });
      if (!apiKey) {
        throw new ErrorHttp(401, "api_key_invalida", "La clave de API es inválida o fue revocada.");
      }

      req.apiKey = { id: apiKey.id, empresaId: apiKey.empresaId };
      prisma.apiKey.update({ where: { id: apiKey.id }, data: { ultimoUsoEn: new Date() } }).catch(() => undefined);

      next();
    } catch (error) {
      next(error);
    }
  };
}
