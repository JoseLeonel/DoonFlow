import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { ErrorHttp } from "../shared/error-http";
import type { UsuarioConRol } from "../modules/auth/domain/usuario.entity";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioConRol;
    }
  }
}

interface PayloadJwt {
  sub: string;       // id del usuario
  email: string;
  rol: string;
  empresaId: string;
}

/**
 * Verifica el JWT del header Authorization (Bearer <token>) y adjunta el usuario a req.usuario.
 * Funciona tanto con JWT local (LocalAuthAdapter) como podría extenderse a Supabase JWT.
 */
export function crearMiddlewareAutenticacion(prisma: PrismaClient) {
  return async function autenticacion(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new ErrorHttp(401, "no_autenticado", "Falta el token de acceso.");
      }

      const token = header.slice("Bearer ".length);
      const secret = process.env.JWT_SECRET ?? "dev-secret-inseguro";

      let payload: PayloadJwt;
      try {
        payload = jwt.verify(token, secret) as PayloadJwt;
      } catch {
        throw new ErrorHttp(401, "token_invalido", "Token de acceso inválido o expirado.");
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.sub },
        include: { rol: true },
      });

      if (!usuario || !usuario.activo) {
        throw new ErrorHttp(403, "usuario_inactivo", "Usuario inactivo o sin perfil.");
      }

      req.usuario = {
        id:          usuario.id,
        empresaId:   usuario.empresaId,
        authUserId:  usuario.authUserId ?? usuario.id,
        email:       usuario.email,
        nombre:      usuario.nombre,
        rol:         usuario.rol.nombre as UsuarioConRol["rol"],
        activo:      usuario.activo,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
