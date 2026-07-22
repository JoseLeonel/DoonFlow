import { InspeccionNoEncontradaError } from "../../domain/inspeccion.errors";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { HallazgoRepositoryPort } from "../../domain/hallazgo.repository.port";
import type { AccionCorrectivaRepositoryPort } from "../../domain/accion-correctiva.repository.port";
import type { PlanCumplimientoRepositoryPort } from "../../domain/plan-cumplimiento.repository.port";

export type OrigenEvidencia = "RESPUESTA" | "HALLAZGO" | "ACCION_CORRECTIVA";

export interface EvidenciaConsolidada {
  id: string;
  origen: OrigenEvidencia;
  tipo: string;
  url: string;
  nombre: string;
  creadoEn: Date;
}

/**
 * Consultas transversales de seguimiento: "mis acciones" del responsable autenticado,
 * acciones pendientes de verificación del auditor, y la galería de evidencias consolidada
 * de una certificación (respuestas de 005 + hallazgos + acciones de este sprint).
 */
export class ConsultarSeguimientoUseCase {
  constructor(
    private readonly accionRepo: AccionCorrectivaRepositoryPort,
    private readonly hallazgoRepo: HallazgoRepositoryPort,
    private readonly planRepo: PlanCumplimientoRepositoryPort,
    private readonly certificacionRepo: CertificacionRepositoryPort,
  ) {}

  misAcciones(usuarioId: string, empresaId: string, alcance?: AlcanceConsulta) {
    return this.accionRepo.listarPorResponsable(usuarioId, empresaId, alcance);
  }

  accionesEnRevision(empresaId: string, alcance?: AlcanceConsulta) {
    return this.accionRepo.listarEnRevision(empresaId, alcance);
  }

  async evidenciasConsolidadas(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta): Promise<EvidenciaConsolidada[]> {
    const certificacion = await this.certificacionRepo.obtenerCompleta(inspeccionId, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(inspeccionId);

    const [hallazgos, plan] = await Promise.all([
      this.hallazgoRepo.listarPorInspeccion(inspeccionId, empresaId),
      this.planRepo.obtenerPorInspeccion(inspeccionId, empresaId),
    ]);
    const acciones = plan ? await this.accionRepo.listarPorPlan(plan.id, empresaId) : [];

    const deRespuestas: EvidenciaConsolidada[] = certificacion.evidencias.map((e) => ({
      id: e.id, origen: "RESPUESTA", tipo: e.tipo, url: e.url, nombre: e.nombre, creadoEn: e.creadoEn,
    }));
    const deHallazgos: EvidenciaConsolidada[] = hallazgos.flatMap((h) =>
      h.evidencias.map((e) => ({ id: e.id, origen: "HALLAZGO" as const, tipo: e.tipo, url: e.url, nombre: e.nombre, creadoEn: e.creadoEn })),
    );
    const deAcciones: EvidenciaConsolidada[] = acciones.flatMap((a) =>
      a.evidencias.map((e) => ({ id: e.id, origen: "ACCION_CORRECTIVA" as const, tipo: e.tipo, url: e.url, nombre: e.nombre, creadoEn: e.creadoEn })),
    );

    return [...deRespuestas, ...deHallazgos, ...deAcciones];
  }
}
