import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import {
  ArchivoNoPermitidoError,
  CertificacionConHallazgoCriticoError,
  CertificacionNoEditableError,
  CertificacionNoFirmadaError,
  CertificacionYaAceptadaError,
  CodigoVerificacionEnColisionError,
  InspeccionNoEncontradaError,
  LoteSincronizacionExcedeLimiteError,
  PeriodoCertificacionVigenteError,
  PlantillaInactivaError,
  PlantillaNoEncontradaError,
  RespuestaNoSincronizadaError,
  SincronizacionPendienteError,
  SucursalFueraDeAlcanceError,
  SucursalRequeridaError,
} from "../domain/inspeccion.errors";
import {
  iniciarCertificacionSchema,
  guardarRespuestasSeccionSchema,
  sincronizarLoteSchema,
  firmarCertificacionSchema,
  finalizarCertificacionSchema,
} from "../application/certificacion.schema";
import type { IniciarCertificacionUseCase } from "../application/casos-uso/iniciar-certificacion.usecase";
import type { ResponderCertificacionUseCase } from "../application/casos-uso/responder-certificacion.usecase";
import type { SincronizarCapturaOfflineUseCase } from "../application/casos-uso/sincronizar-captura-offline.usecase";
import type { FirmarCertificacionUseCase } from "../application/casos-uso/firmar-certificacion.usecase";
import type { FinalizarCertificacionUseCase } from "../application/casos-uso/finalizar-certificacion.usecase";
import type { AceptarCertificacionUseCase } from "../application/casos-uso/aceptar-certificacion.usecase";

export class CertificacionController {
  constructor(
    private readonly iniciarUc: IniciarCertificacionUseCase,
    private readonly responderUc: ResponderCertificacionUseCase,
    private readonly sincronizarUc: SincronizarCapturaOfflineUseCase,
    private readonly firmarUc: FirmarCertificacionUseCase,
    private readonly aceptarUc: AceptarCertificacionUseCase,
    private readonly finalizarUc: FinalizarCertificacionUseCase,
  ) {}

  iniciar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = iniciarCertificacionSchema.parse(req.body);
      const certificacion = await this.iniciarUc.ejecutar(req.usuario!.empresaId, req.usuario!.id, input, req.alcance);
      res.status(201).json(respuestaExitosa(certificacion));
    } catch (e) { next(this.m(e)); }
  };

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { empresaId } = req.usuario!;
      const pagina = Number(req.query["pagina"] ?? 1);
      const porPagina = Number(req.query["porPagina"] ?? 20);
      const { items, total } = await this.responderUc.listar({
        empresaId,
        alcance: req.alcance,
        sucursalId: req.query["sucursalId"] as string | undefined,
        estado: req.query["estado"] as string | undefined,
        pagina,
        porPagina,
      });
      res.json(respuestaExitosa(items, { pagina, porPagina, total }));
    } catch (e) { next(this.m(e)); }
  };

  obtenerCompleta = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.responderUc.obtenerCompleta(req.params["id"]!, req.usuario!.empresaId, req.alcance)));
    } catch (e) { next(this.m(e)); }
  };

  guardarRespuestasSeccion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = guardarRespuestasSeccionSchema.parse(req.body);
      const detalles = await this.responderUc.guardarRespuestasSeccion(req.params["id"]!, req.usuario!.empresaId, input, req.alcance);
      res.json(respuestaExitosa(detalles));
    } catch (e) { next(this.m(e)); }
  };

  adjuntarEvidencia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const archivo = req.file;
      if (!archivo) throw new ErrorHttp(400, "archivo_requerido", "Se requiere un archivo.");
      const detalleId = req.body["detalleId"] as string | undefined;
      if (!detalleId) throw new ErrorHttp(400, "detalle_requerido", "Se requiere el detalleId de la respuesta.");

      const evidencia = await this.responderUc.adjuntarEvidenciaRespuesta(
        req.params["id"]!,
        req.usuario!.empresaId,
        detalleId,
        { buffer: archivo.buffer, mimetype: archivo.mimetype, originalname: archivo.originalname, size: archivo.size },
        req.alcance,
      );
      res.status(201).json(respuestaExitosa(evidencia));
    } catch (e) { next(this.m(e)); }
  };

  obtenerResumen = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.responderUc.obtenerResumen(req.params["id"]!, req.usuario!.empresaId, req.alcance)));
    } catch (e) { next(this.m(e)); }
  };

  // ── Captura offline (012-captura-offline-campo) ──────────────────────────

  sincronizarLote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = sincronizarLoteSchema.parse(req.body);
      const resultado = await this.sincronizarUc.sincronizarLote(
        req.params["id"]!,
        req.usuario!.empresaId,
        req.usuario!.id,
        input,
        req.alcance,
      );
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  sincronizarEvidencia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const archivo = req.file;
      if (!archivo) throw new ErrorHttp(400, "archivo_requerido", "Se requiere un archivo.");
      const nodoId = req.body["nodoId"] as string | undefined;
      if (!nodoId) throw new ErrorHttp(400, "nodo_requerido", "Se requiere el nodoId de la pregunta.");

      const evidencia = await this.sincronizarUc.adjuntarEvidenciaPendiente(
        req.params["id"]!,
        req.usuario!.empresaId,
        nodoId,
        { buffer: archivo.buffer, mimetype: archivo.mimetype, originalname: archivo.originalname, size: archivo.size },
        req.alcance,
      );
      res.status(201).json(respuestaExitosa(evidencia));
    } catch (e) { next(this.m(e)); }
  };

  obtenerEstadoSincronizacion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estado = await this.sincronizarUc.obtenerEstado(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      res.json(respuestaExitosa(estado));
    } catch (e) { next(this.m(e)); }
  };

  // ── Firma (005-certificacion-plan-cumplimiento, retomado) ────────────────

  firmar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = firmarCertificacionSchema.parse(req.body);
      const certificacion = await this.firmarUc.ejecutar(
        req.params["id"]!,
        req.usuario!.empresaId,
        req.usuario!.id,
        input,
        req.alcance,
      );
      res.json(respuestaExitosa(certificacion));
    } catch (e) { next(this.m(e)); }
  };

  finalizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = finalizarCertificacionSchema.parse(req.body);
      const certificacion = await this.finalizarUc.ejecutar(
        req.params["id"]!,
        req.usuario!.empresaId,
        input,
        req.alcance,
      );
      res.json(respuestaExitosa(certificacion));
    } catch (e) { next(this.m(e)); }
  };

  obtenerPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificacion = await this.responderUc.obtenerCompleta(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      if (!certificacion.pdfUrl) throw new ErrorHttp(404, "pdf_no_disponible", "Esta certificación todavía no tiene un PDF generado.");
      res.json(respuestaExitosa({ url: certificacion.pdfUrl }));
    } catch (e) { next(this.m(e)); }
  };

  // ── Aceptación del cliente (011-aceptacion-apelaciones-certificacion) ────

  aceptar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificacion = await this.aceptarUc.ejecutar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id, req.alcance);
      res.json(respuestaExitosa(certificacion));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof PlantillaNoEncontradaError)   return new ErrorHttp(404, "plantilla_no_encontrada", e.message);
    if (e instanceof PlantillaInactivaError)       return new ErrorHttp(422, "plantilla_inactiva", e.message);
    if (e instanceof InspeccionNoEncontradaError)  return new ErrorHttp(404, "certificacion_no_encontrada", e.message);
    if (e instanceof CertificacionNoEditableError) return new ErrorHttp(409, "certificacion_no_editable", e.message);
    if (e instanceof SucursalRequeridaError)       return new ErrorHttp(422, "sucursal_requerida", e.message);
    if (e instanceof PeriodoCertificacionVigenteError) return new ErrorHttp(409, "periodo_certificacion_vigente", e.message);
    if (e instanceof SucursalFueraDeAlcanceError)  return new ErrorHttp(403, "sucursal_fuera_de_alcance", e.message);
    if (e instanceof ArchivoNoPermitidoError)      return new ErrorHttp(422, "archivo_no_permitido", e.message);
    if (e instanceof LoteSincronizacionExcedeLimiteError) return new ErrorHttp(413, "lote_excede_limite", e.message);
    if (e instanceof RespuestaNoSincronizadaError) return new ErrorHttp(409, "respuesta_no_sincronizada", e.message);
    if (e instanceof SincronizacionPendienteError) return new ErrorHttp(409, "sincronizacion_pendiente", e.message);
    if (e instanceof CodigoVerificacionEnColisionError) return new ErrorHttp(500, "codigo_verificacion_colision", e.message);
    if (e instanceof CertificacionConHallazgoCriticoError) return new ErrorHttp(409, "hallazgo_critico_pendiente", e.message);
    if (e instanceof CertificacionNoFirmadaError) return new ErrorHttp(400, "certificacion_no_firmada", e.message);
    if (e instanceof CertificacionYaAceptadaError) return new ErrorHttp(409, "certificacion_ya_aceptada", e.message);
    return e;
  }
}
