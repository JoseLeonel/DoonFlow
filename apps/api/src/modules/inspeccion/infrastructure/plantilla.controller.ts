import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import {
  ComentarioResolucionRequeridoError,
  EstadoAprobacionInvalidoError,
  PlantillaNoEncontradaError,
  PlantillaSinPreguntasError,
  RangosInvalidosError,
} from "../domain/inspeccion.errors";
import { crearPlantillaSchema, actualizarPlantillaSchema, crearNodoSchema, actualizarNodoSchema, reordenarSchema } from "../application/plantilla.schema";
import type { GestionarPlantillaUseCase } from "../application/casos-uso/gestionar-plantilla.usecase";

export class PlantillaController {
  constructor(private readonly uc: GestionarPlantillaUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { empresaId } = req.usuario!;
      const activa = req.query["activa"] === "true" ? true : req.query["activa"] === "false" ? false : undefined;
      const r = await this.uc.listar(empresaId, activa, req.query["tipo"] as string, Number(req.query["pagina"]??1), Number(req.query["porPagina"]??20));
      res.json(respuestaExitosa(r.items, { pagina: r.pagina, porPagina: r.porPagina, total: r.total }));
    } catch (e) { next(e); }
  };

  obtenerCompleta = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(respuestaExitosa(await this.uc.obtenerCompleta(req.params["id"]!, req.usuario!.empresaId))); }
    catch (e) { next(this.m(e)); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(respuestaExitosa(await this.uc.crear(req.usuario!.empresaId, req.usuario!.id, crearPlantillaSchema.parse(req.body)))); }
    catch (e) { next(this.m(e)); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarPlantillaSchema.parse(req.body);
      res.json(respuestaExitosa(await this.uc.actualizar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id, input)));
    } catch (e) { next(this.m(e)); }
  };

  activar    = async (req: Request, res: Response, next: NextFunction) => { try { res.json(respuestaExitosa(await this.uc.activar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id))); } catch (e) { next(this.m(e)); } };
  desactivar = async (req: Request, res: Response, next: NextFunction) => { try { res.json(respuestaExitosa(await this.uc.desactivar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id))); } catch (e) { next(this.m(e)); } };
  eliminar   = async (req: Request, res: Response, next: NextFunction) => { try { await this.uc.eliminar(req.params["id"]!, req.usuario!.empresaId); res.status(204).send(); } catch (e) { next(this.m(e)); } };

  clonar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nombre } = req.body as { nombre?: string };
      if (!nombre) throw new ErrorHttp(400, "nombre_requerido", "Se requiere el nombre para la copia.");
      res.status(201).json(respuestaExitosa(await this.uc.clonar(req.params["id"]!, req.usuario!.empresaId, nombre, req.usuario!.id)));
    } catch (e) { next(this.m(e)); }
  };

  // ── Nodos genéricos ─────────────────────────────────────────────────────

  crearNodo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearNodoSchema.parse(req.body);
      const nodo = await this.uc.crearNodo(req.params["id"]!, req.usuario!.empresaId, input);
      res.status(201).json(respuestaExitosa(nodo));
    } catch (e) { next(this.m(e)); }
  };

  actualizarNodo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarNodoSchema.parse(req.body);
      const resultado = await this.uc.actualizarNodo(req.params["id"]!, req.params["nodoId"]!, req.usuario!.empresaId, req.usuario!.id, input);
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  eliminarNodo = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.uc.eliminarNodo(req.params["nodoId"]!, req.usuario!.empresaId); res.status(204).send(); }
    catch (e) { next(this.m(e)); }
  };

  reordenar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = reordenarSchema.parse(req.body);
      await this.uc.reordenarNodos(items);
      res.json(respuestaExitosa({ ok: true }));
    } catch (e) { next(this.m(e)); }
  };

  guardarRangos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rangos } = req.body as { rangos?: unknown[] };
      if (!Array.isArray(rangos)) throw new ErrorHttp(400, "rangos_requeridos", "Se requiere un array 'rangos'.");
      const resultado = await this.uc.guardarRangos(req.params["id"]!, req.usuario!.empresaId, rangos as any);
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  // ── Aprobación (007-gobernanza-permisos-aprobacion) ────────────────────────

  enviarRevision = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(respuestaExitosa(await this.uc.enviarARevision(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id))); }
    catch (e) { next(this.m(e)); }
  };

  aprobar = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(respuestaExitosa(await this.uc.aprobar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id))); }
    catch (e) { next(this.m(e)); }
  };

  rechazar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comentario } = req.body as { comentario?: string };
      if (!comentario?.trim()) throw new ErrorHttp(400, "comentario_resolucion_requerido", "Debes indicar un comentario para rechazar la plantilla.");
      res.json(respuestaExitosa(await this.uc.rechazar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id, comentario)));
    } catch (e) { next(this.m(e)); }
  };

  listarPendientesAprobacion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { empresaId } = req.usuario!;
      const r = await this.uc.listarPendientesAprobacion(empresaId, Number(req.query["pagina"] ?? 1), Number(req.query["porPagina"] ?? 20));
      res.json(respuestaExitosa(r.items, { pagina: r.pagina, porPagina: r.porPagina, total: r.total }));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof PlantillaNoEncontradaError)         return new ErrorHttp(404, "plantilla_no_encontrada", e.message);
    if (e instanceof RangosInvalidosError)               return new ErrorHttp(422, "rangos_invalidos", e.message);
    if (e instanceof PlantillaSinPreguntasError)         return new ErrorHttp(422, "plantilla_sin_preguntas", e.message);
    if (e instanceof EstadoAprobacionInvalidoError)      return new ErrorHttp(422, "estado_aprobacion_invalido", e.message);
    if (e instanceof ComentarioResolucionRequeridoError) return new ErrorHttp(400, "comentario_resolucion_requerido", e.message);
    return e;
  }
}
