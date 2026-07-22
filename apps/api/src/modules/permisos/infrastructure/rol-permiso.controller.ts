import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { PermisoInvalidoError, RolNoEditableError, RolNoEncontradoError } from "../domain/rol-permiso.errors";
import type { GestionarMatrizPermisosUseCase } from "../application/casos-uso/gestionar-matriz-permisos.usecase";
import { invalidarCachePermisos } from "../../../middleware/permiso.middleware";

const asignarPermisosSchema = z.object({ permisoIds: z.array(z.string().uuid()) });

export class RolPermisoController {
  constructor(private readonly uc: GestionarMatrizPermisosUseCase) {}

  obtenerMatriz = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(respuestaExitosa(await this.uc.obtenerMatriz())); }
    catch (e) { next(this.m(e)); }
  };

  asignarPermisos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { permisoIds } = asignarPermisosSchema.parse(req.body);
      await this.uc.asignarPermisos(req.params["rolId"]!, permisoIds, {
        empresaId: req.usuario!.empresaId,
        usuarioId: req.usuario!.id,
      });
      invalidarCachePermisos();
      res.json(respuestaExitosa({ ok: true }));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof RolNoEncontradoError) return new ErrorHttp(404, "rol_no_encontrado", e.message);
    if (e instanceof RolNoEditableError)   return new ErrorHttp(403, "rol_no_editable", e.message);
    if (e instanceof PermisoInvalidoError) return new ErrorHttp(422, "permiso_invalido", e.message);
    return e;
  }
}
