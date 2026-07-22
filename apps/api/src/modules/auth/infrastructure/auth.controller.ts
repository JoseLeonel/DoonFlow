import type { Request, Response, NextFunction } from "express";
import { ErrorHttp } from "../../../shared/error-http";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import {
  CredencialesInvalidasError,
  UsuarioInactivoError,
  UsuarioSinPerfilError,
} from "../domain/auth.errors";
import { iniciarSesionSchema } from "../application/auth.schema";
import type { IniciarSesionUseCase } from "../application/casos-uso/iniciar-sesion.usecase";
import type { UsuarioRepositoryPort } from "../domain/usuario.repository.port";

/** Adaptador HTTP — solo traduce request/response ↔ caso de uso. Sin lógica de negocio. */
export class AuthController {
  constructor(
    private readonly iniciarSesionUseCase: IniciarSesionUseCase,
    private readonly usuarioRepository: UsuarioRepositoryPort,
  ) {}

  iniciarSesion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = iniciarSesionSchema.parse(req.body);
      const resultado = await this.iniciarSesionUseCase.ejecutar(input);

      res.json(
        respuestaExitosa({
          tokenAcceso: resultado.tokenAcceso,
          usuario: {
            id: resultado.usuario.id,
            empresaId: resultado.usuario.empresaId,
            email: resultado.usuario.email,
            nombre: resultado.usuario.nombre,
            rol: resultado.usuario.rol,
          },
        }),
      );
    } catch (error) {
      next(this.mapearError(error));
    }
  };

  /** GET /auth/me — usuario autenticado + su alcance resuelto (nombres incluidos). */
  miInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detalle = await this.usuarioRepository.obtenerPorId(req.usuario!.id, req.usuario!.empresaId);
      if (!detalle) throw new ErrorHttp(404, "usuario_no_encontrado", "El usuario no existe.");

      const usuario = { id: detalle.id, email: detalle.email, nombre: detalle.nombre, rol: detalle.rolNombre };

      if (detalle.clienteId) {
        res.json(respuestaExitosa({
          usuario,
          alcance: { tipo: "CLIENTE", cliente: { id: detalle.clienteId, empresa: detalle.clienteNombre } },
        }));
        return;
      }

      if (detalle.rolNombre === "usuario_sucursal") {
        const sucursales = [
          ...(detalle.sucursalId ? [{ id: detalle.sucursalId, nombre: detalle.sucursalNombre ?? "" }] : []),
          ...detalle.sucursalesAdicionales,
        ];
        res.json(respuestaExitosa({ usuario, alcance: { tipo: "SUCURSAL", sucursales } }));
        return;
      }

      res.json(respuestaExitosa({ usuario, alcance: { tipo: "TOTAL" } }));
    } catch (error) {
      next(this.mapearError(error));
    }
  };

  private mapearError(error: unknown) {
    if (error instanceof CredencialesInvalidasError) {
      return new ErrorHttp(401, "credenciales_invalidas", error.message);
    }
    if (error instanceof UsuarioInactivoError) {
      return new ErrorHttp(403, "usuario_inactivo", error.message);
    }
    if (error instanceof UsuarioSinPerfilError) {
      return new ErrorHttp(403, "usuario_sin_perfil", error.message);
    }
    return error;
  }
}
