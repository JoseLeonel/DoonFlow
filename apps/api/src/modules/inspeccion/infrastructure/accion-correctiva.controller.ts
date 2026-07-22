import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import {
  AccionCorrectivaNoEncontradaError,
  ArchivoNoPermitidoError,
  InspeccionNoEncontradaError,
  SinPermisoActualizarAvanceError,
  SinPermisoVerificacionError,
} from "../domain/inspeccion.errors";
import { actualizarAccionSchema, actualizarAvanceSchema, verificarAccionSchema } from "../application/accion-correctiva.schema";
import type { GestionarAccionCorrectivaUseCase } from "../application/casos-uso/gestionar-accion-correctiva.usecase";
import type { ConsultarSeguimientoUseCase } from "../application/casos-uso/consultar-seguimiento.usecase";

export class AccionCorrectivaController {
  constructor(
    private readonly usecase: GestionarAccionCorrectivaUseCase,
    private readonly seguimientoUseCase: ConsultarSeguimientoUseCase,
  ) {}

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarAccionSchema.parse(req.body);
      const accion = await this.usecase.actualizar(req.params["id"]!, req.usuario!.empresaId, input);
      res.json(respuestaExitosa(accion));
    } catch (e) { next(this.m(e)); }
  };

  actualizarAvance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarAvanceSchema.parse(req.body);
      const accion = await this.usecase.actualizarAvance(req.params["id"]!, req.usuario!.empresaId, req.usuario!, req.alcance, input);
      res.json(respuestaExitosa(accion));
    } catch (e) { next(this.m(e)); }
  };

  enviarARevision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accion = await this.usecase.enviarARevision(req.params["id"]!, req.usuario!.empresaId, req.usuario!, req.alcance);
      res.json(respuestaExitosa(accion));
    } catch (e) { next(this.m(e)); }
  };

  verificar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = verificarAccionSchema.parse(req.body);
      const accion = await this.usecase.verificar(req.params["id"]!, req.usuario!.empresaId, req.usuario!, input);
      res.json(respuestaExitosa(accion));
    } catch (e) { next(this.m(e)); }
  };

  adjuntarEvidencia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const archivo = req.file;
      if (!archivo) throw new ErrorHttp(400, "archivo_requerido", "Se requiere un archivo.");
      const comentario = req.body["comentario"] as string | undefined;
      const evidencia = await this.usecase.adjuntarEvidencia(
        req.params["id"]!,
        req.usuario!.empresaId,
        req.usuario!,
        req.alcance,
        { buffer: archivo.buffer, mimetype: archivo.mimetype, originalname: archivo.originalname, size: archivo.size },
        comentario,
      );
      res.status(201).json(respuestaExitosa(evidencia));
    } catch (e) { next(this.m(e)); }
  };

  misAcciones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acciones = await this.seguimientoUseCase.misAcciones(req.usuario!.id, req.usuario!.empresaId, req.alcance);
      res.json(respuestaExitosa(acciones));
    } catch (e) { next(this.m(e)); }
  };

  accionesEnRevision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acciones = await this.seguimientoUseCase.accionesEnRevision(req.usuario!.empresaId, req.alcance);
      res.json(respuestaExitosa(acciones));
    } catch (e) { next(this.m(e)); }
  };

  evidenciasConsolidadas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidencias = await this.seguimientoUseCase.evidenciasConsolidadas(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      res.json(respuestaExitosa(evidencias));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof InspeccionNoEncontradaError) return new ErrorHttp(404, "certificacion_no_encontrada", e.message);
    if (e instanceof AccionCorrectivaNoEncontradaError) return new ErrorHttp(404, "accion_no_encontrada", e.message);
    if (e instanceof ArchivoNoPermitidoError) return new ErrorHttp(422, "archivo_no_permitido", e.message);
    if (e instanceof SinPermisoActualizarAvanceError) return new ErrorHttp(403, "sin_permiso_actualizar_avance", e.message);
    if (e instanceof SinPermisoVerificacionError) return new ErrorHttp(403, "sin_permiso_verificacion", e.message);
    return e;
  }
}
