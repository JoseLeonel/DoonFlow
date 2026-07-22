import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { z } from "zod";
import {
  AlcanceInvalidoError,
  EmailDuplicadoError,
  PasswordActualIncorrectaError,
  PasswordDebilError,
  SucursalRequeridaError,
  UsuarioNoEncontradoError,
} from "../domain/auth.errors";
import { crearUsuarioSchema, actualizarUsuarioSchema } from "../application/usuario.schema";

const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "La contraseña actual es requerida"),
  passwordNueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});
import type { GestionarUsuarioUseCase } from "../application/casos-uso/gestionar-usuario.usecase";

export class UsuarioController {
  constructor(private readonly uc: GestionarUsuarioUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.listar(req.usuario!.empresaId)));
    } catch (e) { next(e); }
  };

  listarRoles = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.listarRoles()));
    } catch (e) { next(e); }
  };

  obtener = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.obtenerPorId(req.params["id"]!, req.usuario!.empresaId)));
    } catch (e) { next(this.m(e)); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearUsuarioSchema.parse(req.body);
      res.status(201).json(respuestaExitosa(await this.uc.crear(req.usuario!.empresaId, input)));
    } catch (e) { next(this.m(e)); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarUsuarioSchema.parse(req.body);
      res.json(respuestaExitosa(await this.uc.actualizar(req.params["id"]!, req.usuario!.empresaId, input)));
    } catch (e) { next(this.m(e)); }
  };

  activar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.activar(req.params["id"]!, req.usuario!.empresaId)));
    } catch (e) { next(this.m(e)); }
  };

  desactivar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.desactivar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id)));
    } catch (e) { next(this.m(e)); }
  };

  cambiarPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { passwordActual, passwordNueva } = cambiarPasswordSchema.parse(req.body);
      await this.uc.cambiarPassword(req.params["id"]!, req.usuario!.empresaId, passwordActual, passwordNueva);
      res.json(respuestaExitosa({ ok: true }));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof UsuarioNoEncontradoError)      return new ErrorHttp(404, "usuario_no_encontrado", e.message);
    if (e instanceof EmailDuplicadoError)           return new ErrorHttp(409, "email_duplicado", e.message);
    if (e instanceof AlcanceInvalidoError)          return new ErrorHttp(400, "alcance_invalido", e.message);
    if (e instanceof SucursalRequeridaError)        return new ErrorHttp(400, "sucursal_requerida", e.message);
    if (e instanceof PasswordDebilError)            return new ErrorHttp(400, "password_debil", e.message);
    if (e instanceof PasswordActualIncorrectaError) return new ErrorHttp(400, "password_actual_incorrecta", e.message);
    return e;
  }
}
