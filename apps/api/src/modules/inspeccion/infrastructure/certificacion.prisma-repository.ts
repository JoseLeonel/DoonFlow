import type { PrismaClient } from "@prisma/client";
import { construirArbolNodos } from "./plantilla.prisma-repository";
import type {
  AlcanceConsulta,
  CertificacionRepositoryPort,
  DatosIniciarCertificacion,
  DatosRespuestaGuardar,
  DetalleGuardado,
  DetallePendienteSincronizar,
  EvidenciaGuardada,
  CertificacionCompleta,
  FiltroCertificacion,
  ResultadoUpsertDetalle,
} from "../domain/certificacion.repository.port";
import type { Certificacion } from "../domain/certificacion.entity";

function mapCertificacion(i: any): Certificacion {
  return {
    id: i.id,
    empresaId: i.empresaId,
    plantillaId: i.plantillaId,
    plantillaVersion: i.plantillaVersion,
    inspectorId: i.inspectorId,
    sucursalId: i.sucursalId ?? null,
    periodoEtiqueta: i.periodoEtiqueta ?? null,
    estado: i.estado,
    fechaInicio: i.fechaInicio,
    fechaFin: i.fechaFin ?? null,
    puntajeObtenido: Number(i.puntajeObtenido),
    puntajeMaximo: Number(i.puntajeMaximo),
    porcentajeCumplimiento: Number(i.porcentajeCumplimiento),
    clasificacion: i.clasificacion ?? null,
    observaciones: i.observaciones ?? null,
    capturaOffline: i.capturaOffline,
    sincronizadoEn: i.sincronizadoEn ?? null,
    creadoEn: i.creadoEn,
    actualizadoEn: i.actualizadoEn,
  };
}

function mapDetalle(d: any): DetalleGuardado {
  return {
    id: d.id,
    nodoId: d.nodoId,
    valor: d.respuestaValor ?? null,
    valores: d.respuestasMultiples ?? [],
    comentario: d.comentario ?? null,
    puntajeObtenido: Number(d.puntajeObtenido),
    puntajeMaximo: Number(d.puntajeMaximo),
  };
}

function mapEvidencia(e: any): EvidenciaGuardada {
  return { id: e.id, detalleId: e.detalleId ?? null, tipo: e.tipo, url: e.url, nombre: e.nombre };
}

export class CertificacionPrismaRepository implements CertificacionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  /** Filtro de alcance para consultas por `id` — nunca usa la clave `sucursalId` (ver `construirWhereListar`). */
  private whereAlcance(alcance?: AlcanceConsulta): Record<string, unknown> {
    if (!alcance || alcance.tipo === "TOTAL") return {};
    if (alcance.tipo === "CLIENTE") return { sucursal: { clienteId: alcance.clienteId } };
    return { sucursalId: { in: alcance.sucursalIds } };
  }

  async iniciar(datos: DatosIniciarCertificacion): Promise<Certificacion> {
    const i = await this.prisma.inspeccion.create({
      data: {
        empresaId: datos.empresaId,
        plantillaId: datos.plantillaId,
        plantillaVersion: datos.plantillaVersion,
        inspectorId: datos.inspectorId,
        sucursalId: datos.sucursalId,
        periodoEtiqueta: datos.periodoEtiqueta,
        fechaInicio: new Date(),
        estado: "EN_PROGRESO",
      },
    });
    return mapCertificacion(i);
  }

  async obtenerCompleta(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<CertificacionCompleta | null> {
    const i = await this.prisma.inspeccion.findFirst({
      where: { id, empresaId, ...this.whereAlcance(alcance) },
      include: { detalles: true, evidencias: true },
    });
    if (!i) return null;

    const [plantilla, nodosFlat] = await Promise.all([
      this.prisma.inspeccionPlantilla.findFirst({
        where: { id: i.plantillaId, empresaId },
        include: { rangosResultado: { orderBy: { orden: "asc" } } },
      }),
      this.prisma.inspeccionNodo.findMany({
        where: { plantillaId: i.plantillaId, empresaId, activo: true },
        include: { opciones: { orderBy: { orden: "asc" } } },
        orderBy: [{ nivel: "asc" }, { orden: "asc" }],
      }),
    ]);
    if (!plantilla) return null;

    return {
      ...mapCertificacion(i),
      plantilla: {
        id: plantilla.id,
        nombre: plantilla.nombre,
        puntajeMaximo: Number(plantilla.puntajeMaximo),
        nodos: construirArbolNodos(nodosFlat),
        rangosResultado: plantilla.rangosResultado.map((r: any) => ({
          id: r.id, desde: Number(r.desde), hasta: Number(r.hasta),
          clasificacion: r.clasificacion, color: r.color, orden: r.orden,
        })),
      },
      detalles: i.detalles.map(mapDetalle),
      evidencias: i.evidencias.map(mapEvidencia),
    };
  }

  async listar(filtro: FiltroCertificacion): Promise<{ items: Certificacion[]; total: number }> {
    const { empresaId, alcance, sucursalId, estado, pagina = 1, porPagina = 20 } = filtro;

    // Construcción explícita (no por spread) — un spread de `whereAlcance` después de fijar
    // `sucursalId` podría pisar la restricción de alcance y filtrar por cualquier sucursal
    // (bug real detectado en sprint 004 con `obtenerPorId`).
    const where: Record<string, unknown> = { empresaId, ...(estado && { estado }) };

    if (alcance?.tipo === "CLIENTE") {
      where["sucursal"] = { clienteId: alcance.clienteId };
    }

    if (alcance?.tipo === "SUCURSAL") {
      const idsPermitidos = sucursalId
        ? alcance.sucursalIds.includes(sucursalId) ? [sucursalId] : []
        : alcance.sucursalIds;
      where["sucursalId"] = { in: idsPermitidos };
    } else if (sucursalId) {
      where["sucursalId"] = sucursalId;
    }

    const [items, total] = await Promise.all([
      this.prisma.inspeccion.findMany({
        where, orderBy: { creadoEn: "desc" }, skip: (pagina - 1) * porPagina, take: porPagina,
      }),
      this.prisma.inspeccion.count({ where }),
    ]);
    return { items: items.map(mapCertificacion), total };
  }

  async guardarRespuestasSeccion(inspeccionId: string, respuestas: DatosRespuestaGuardar[]): Promise<DetalleGuardado[]> {
    return this.prisma.$transaction(async (tx) => {
      const resultados: DetalleGuardado[] = [];
      for (const r of respuestas) {
        const existente = await tx.inspeccionDetalle.findFirst({ where: { inspeccionId, nodoId: r.nodoId } });
        const data = {
          rutaCodigos: r.rutaCodigos,
          rutaTitulos: r.rutaTitulos,
          preguntaTitulo: r.preguntaTitulo,
          criterioSnapshot: r.criterioSnapshot ?? null,
          tipoRespuesta: r.tipoRespuesta,
          respuestaValor: r.valor ?? null,
          respuestasMultiples: r.valores ?? [],
          comentario: r.comentario ?? null,
          puntajeObtenido: r.puntajeObtenido,
          puntajeMaximo: r.puntajeMaximo,
        };
        const guardado = existente
          ? await tx.inspeccionDetalle.update({ where: { id: existente.id }, data })
          : await tx.inspeccionDetalle.create({ data: { inspeccionId, nodoId: r.nodoId, ...data } });
        resultados.push(mapDetalle(guardado));
      }
      return resultados;
    });
  }

  async guardarEvidencia(
    inspeccionId: string,
    detalleId: string,
    datos: { tipo: string; url: string; nombre: string; tamanoBytes?: number },
  ): Promise<EvidenciaGuardada> {
    const e = await this.prisma.inspeccionEvidencia.create({
      data: {
        inspeccionId, detalleId,
        tipo: datos.tipo, url: datos.url, nombre: datos.nombre,
        tamanoBytes: datos.tamanoBytes ?? null,
      },
    });
    return mapEvidencia(e);
  }

  async obtenerSucursalParaAlcance(sucursalId: string, empresaId: string): Promise<{ id: string; clienteId: string; activo: boolean } | null> {
    const s = await this.prisma.sucursal.findFirst({ where: { id: sucursalId, empresaId } });
    if (!s) return null;
    return { id: s.id, clienteId: s.clienteId, activo: s.activo };
  }

  async upsertDetallesConResolucionConflicto(
    inspeccionId: string,
    empresaId: string,
    detalles: DetallePendienteSincronizar[],
  ): Promise<ResultadoUpsertDetalle[]> {
    return this.prisma.$transaction(async (tx) => {
      // La inspección debe pertenecer a la empresa — mismo aislamiento multiempresa que el resto del repo.
      const inspeccion = await tx.inspeccion.findFirst({ where: { id: inspeccionId, empresaId }, select: { id: true } });
      if (!inspeccion) throw new Error(`Inspección ${inspeccionId} no encontrada.`);

      const resultados: ResultadoUpsertDetalle[] = [];
      for (const d of detalles) {
        const existente = await tx.inspeccionDetalle.findFirst({ where: { inspeccionId, nodoId: d.nodoId } });

        if (existente && existente.actualizadoEn > d.capturadoEnCliente) {
          resultados.push({ detalle: mapDetalle(existente), aplicado: false, conflicto: true });
          continue;
        }

        const data = {
          rutaCodigos: d.rutaCodigos,
          rutaTitulos: d.rutaTitulos,
          preguntaTitulo: d.preguntaTitulo,
          criterioSnapshot: d.criterioSnapshot ?? null,
          tipoRespuesta: d.tipoRespuesta,
          respuestaValor: d.valor ?? null,
          respuestasMultiples: d.valores ?? [],
          comentario: d.comentario ?? null,
          puntajeObtenido: d.puntajeObtenido,
          puntajeMaximo: d.puntajeMaximo,
        };
        const guardado = existente
          ? await tx.inspeccionDetalle.update({ where: { id: existente.id }, data })
          : await tx.inspeccionDetalle.create({ data: { inspeccionId, nodoId: d.nodoId, ...data } });

        resultados.push({ detalle: mapDetalle(guardado), aplicado: true, conflicto: false });
      }
      return resultados;
    });
  }

  async marcarSincronizado(inspeccionId: string, empresaId: string, fecha: Date, capturaOffline: boolean): Promise<void> {
    await this.prisma.inspeccion.updateMany({
      where: { id: inspeccionId, empresaId },
      data: { sincronizadoEn: fecha, ...(capturaOffline ? { capturaOffline: true } : {}) },
    });
  }
}
