import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { ArchivoNoPermitidoError, HallazgoNoEncontradoError, InspeccionNoEncontradaError } from "../domain/inspeccion.errors";
import { crearHallazgoSchema, actualizarHallazgoSchema } from "../application/hallazgo.schema";
import type { GestionarHallazgosUseCase } from "../application/casos-uso/gestionar-hallazgos.usecase";

export class HallazgoController {
  constructor(private readonly usecase: GestionarHallazgosUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hallazgos = await this.usecase.listar(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      res.json(respuestaExitosa(hallazgos));
    } catch (e) { next(this.m(e)); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearHallazgoSchema.parse(req.body);
      const hallazgo = await this.usecase.crearManual(req.params["id"]!, req.usuario!.empresaId, input, req.alcance);
      res.status(201).json(respuestaExitosa(hallazgo));
    } catch (e) { next(this.m(e)); }
  };

  generarAutomaticos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hallazgos = await this.usecase.generarAutomaticos(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      res.status(201).json(respuestaExitosa(hallazgos));
    } catch (e) { next(this.m(e)); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarHallazgoSchema.parse(req.body);
      const hallazgo = await this.usecase.actualizar(req.params["id"]!, req.usuario!.empresaId, input);
      res.json(respuestaExitosa(hallazgo));
    } catch (e) { next(this.m(e)); }
  };

  adjuntarEvidencia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const archivo = req.file;
      if (!archivo) throw new ErrorHttp(400, "archivo_requerido", "Se requiere un archivo.");
      const evidencia = await this.usecase.adjuntarEvidencia(req.params["id"]!, req.usuario!.empresaId, {
        buffer: archivo.buffer, mimetype: archivo.mimetype, originalname: archivo.originalname, size: archivo.size,
      });
      res.status(201).json(respuestaExitosa(evidencia));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof InspeccionNoEncontradaError) return new ErrorHttp(404, "certificacion_no_encontrada", e.message);
    if (e instanceof HallazgoNoEncontradoError) return new ErrorHttp(404, "hallazgo_no_encontrado", e.message);
    if (e instanceof ArchivoNoPermitidoError) return new ErrorHttp(422, "archivo_no_permitido", e.message);
    return e;
  }
}
