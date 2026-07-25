import type { PrismaClient } from "@prisma/client";
import type {
  DatosComparativoSucursales,
  DatosConsolidadoCliente,
  DatosPanelEjecutivoCrudo,
  FilaComparativaSucursal,
  FilaConsolidadoSucursal,
  ReporteGenerado,
  ReporteHistorialItem,
} from "../domain/reporte.entity";
import { construirResumenFiltros } from "../domain/reporte.entity";
import type { DatosCrearReporte, FiltrosHistorial, ReporteRepositoryPort } from "../domain/reporte.repository.port";

function mapear(raw: any): ReporteGenerado {
  return {
    id: raw.id,
    empresaId: raw.empresaId,
    tipo: raw.tipo,
    filtros: raw.filtros,
    formato: raw.formato,
    url: raw.url,
    generadoPorId: raw.generadoPorId,
    creadoEn: raw.creadoEn,
  };
}

/** `fechaHasta` (YYYY-MM-DD) se interpreta inclusive hasta el final de ese día. */
function rangoFechas(fechaDesde: string, fechaHasta: string) {
  const desde = new Date(`${fechaDesde}T00:00:00.000Z`);
  const hasta = new Date(`${fechaHasta}T23:59:59.999Z`);
  return { gte: desde, lte: hasta };
}

export class ReportePrismaRepository implements ReporteRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listarHistorial(
    empresaId: string,
    filtros: FiltrosHistorial,
    paginacion: { pagina: number; porPagina: number },
  ): Promise<{ items: ReporteHistorialItem[]; total: number }> {
    const where: Record<string, unknown> = {
      empresaId,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    };
    // `filtros.clienteId` no es columna propia (vive dentro del JSON `filtros`) — se filtra en memoria
    // tras traer la página, ya que Prisma no indexa JSONB en este proyecto. Aceptable dado el volumen
    // esperado de reportes generados (no es una tabla de alto volumen como Inspeccion/Cliente).
    const rows = await this.prisma.reporteGenerado.findMany({ where, orderBy: { creadoEn: "desc" } });
    const filtrados = filtros.clienteId
      ? rows.filter((r) => (r.filtros as any)?.clienteId === filtros.clienteId)
      : rows;

    const total = filtrados.length;
    const inicio = (paginacion.pagina - 1) * paginacion.porPagina;
    const pagina = filtrados.slice(inicio, inicio + paginacion.porPagina).map(mapear);

    const clienteIds = [...new Set(pagina.map((r) => r.filtros.clienteId))];
    const usuarioIds = [...new Set(pagina.map((r) => r.generadoPorId))];
    const [clientes, usuarios] = await Promise.all([
      this.prisma.cliente.findMany({ where: { id: { in: clienteIds } }, select: { id: true, empresa: true } }),
      this.prisma.usuario.findMany({ where: { id: { in: usuarioIds } }, select: { id: true, nombre: true } }),
    ]);
    const nombrePorClienteId = new Map(clientes.map((c) => [c.id, c.empresa]));
    const nombrePorUsuarioId = new Map(usuarios.map((u) => [u.id, u.nombre]));

    const items: ReporteHistorialItem[] = pagina.map((r) => ({
      ...r,
      resumenFiltros: construirResumenFiltros(r.filtros, nombrePorClienteId.get(r.filtros.clienteId) ?? "Cliente desconocido"),
      generadoPorNombre: nombrePorUsuarioId.get(r.generadoPorId) ?? "—",
    }));

    return { items, total };
  }

  async crear(datos: DatosCrearReporte): Promise<ReporteGenerado> {
    const row = await this.prisma.reporteGenerado.create({
      data: {
        empresaId: datos.empresaId,
        tipo: datos.tipo,
        filtros: datos.filtros as any,
        formato: datos.formato,
        url: datos.url,
        generadoPorId: datos.generadoPorId,
      },
    });
    return mapear(row);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<ReporteGenerado | null> {
    const row = await this.prisma.reporteGenerado.findFirst({ where: { id, empresaId } });
    return row ? mapear(row) : null;
  }

  async obtenerDatosConsolidadoCliente(
    empresaId: string,
    clienteId: string,
    fechaDesde: string,
    fechaHasta: string,
  ): Promise<DatosConsolidadoCliente> {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    const sucursales = await this.prisma.sucursal.findMany({
      where: { clienteId, empresaId },
      orderBy: { nombre: "asc" },
    });

    const filas: FilaConsolidadoSucursal[] = await Promise.all(
      sucursales.map(async (sucursal) => {
        const inspecciones = await this.prisma.inspeccion.findMany({
          where: { sucursalId: sucursal.id, fechaInicio: rangoFechas(fechaDesde, fechaHasta) },
          orderBy: { fechaInicio: "desc" },
        });
        const masReciente = inspecciones[0];
        return {
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          certificacionesDelPeriodo: inspecciones.length,
          puntajeVigente: masReciente ? Number(masReciente.puntajeObtenido) : null,
          puntajeMaximoVigente: masReciente ? Number(masReciente.puntajeMaximo) : null,
          clasificacionVigente: masReciente?.clasificacion ?? null,
        };
      }),
    );

    return {
      clienteId,
      clienteNombre: cliente?.empresa ?? "",
      periodo: { fechaDesde, fechaHasta },
      sucursales: filas,
    };
  }

  async obtenerDatosComparativoSucursales(
    empresaId: string,
    clienteId: string,
    sucursalIds: string[],
    fechaDesde: string,
    fechaHasta: string,
  ): Promise<DatosComparativoSucursales> {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    const sucursales = await this.prisma.sucursal.findMany({
      where: { id: { in: sucursalIds }, clienteId, empresaId },
      orderBy: { nombre: "asc" },
    });

    const filas: FilaComparativaSucursal[] = await Promise.all(
      sucursales.map(async (sucursal) => {
        const masReciente = await this.prisma.inspeccion.findFirst({
          where: { sucursalId: sucursal.id, fechaInicio: rangoFechas(fechaDesde, fechaHasta) },
          orderBy: { fechaInicio: "desc" },
        });
        return {
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          puntaje: masReciente ? Number(masReciente.puntajeObtenido) : null,
          puntajeMaximo: masReciente ? Number(masReciente.puntajeMaximo) : null,
          porcentajeCumplimiento: masReciente ? Number(masReciente.porcentajeCumplimiento) : null,
          clasificacion: masReciente?.clasificacion ?? null,
          tieneCertificacionEnPeriodo: !!masReciente,
        };
      }),
    );

    return {
      clienteId,
      clienteNombre: cliente?.empresa ?? "",
      periodo: { fechaDesde, fechaHasta },
      filas,
    };
  }

  // ── Panel ejecutivo (014-panel-calendario-biblioteca, HU-4) ────────────────

  async obtenerPanelEjecutivo(empresaId: string, clienteId?: string): Promise<DatosPanelEjecutivoCrudo> {
    const ahora = new Date();
    const en30dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
    const whereSucursal = { empresaId, activo: true, ...(clienteId ? { clienteId } : {}) };
    const whereSucursalRelacion = clienteId ? { clienteId } : {};

    const [totalSucursales, sucursalesVigentes, certificacionesPorVencerRaw, hallazgosCriticosAbiertos, accionesVencidasRaw] =
      await Promise.all([
        this.prisma.sucursal.count({ where: whereSucursal }),
        this.prisma.sucursal.count({
          where: { ...whereSucursal, inspecciones: { some: { estado: "FIRMADA", fechaVencimiento: { gte: ahora } } } },
        }),
        this.prisma.inspeccion.findMany({
          where: { empresaId, estado: "FIRMADA", fechaVencimiento: { gte: ahora, lte: en30dias }, sucursal: whereSucursalRelacion },
          select: { fechaVencimiento: true, sucursal: { select: { nombre: true, cliente: { select: { empresa: true } } } } },
          orderBy: { fechaVencimiento: "asc" },
        }),
        this.prisma.hallazgo.count({
          where: {
            empresaId, severidad: "CRITICA", estado: "ACTIVO",
            acciones: { none: { estado: "CUMPLIDO" } },
            inspeccion: { sucursal: whereSucursalRelacion },
          },
        }),
        this.prisma.accionCorrectiva.findMany({
          where: {
            estado: { notIn: ["CUMPLIDO", "NO_CUMPLIDO"] },
            fechaLimite: { lt: ahora },
            hallazgo: { empresaId, inspeccion: { sucursal: whereSucursalRelacion } },
          },
          select: {
            descripcion: true, fechaLimite: true,
            hallazgo: { select: { inspeccion: { select: { sucursal: { select: { nombre: true, cliente: { select: { empresa: true } } } } } } } },
          },
          orderBy: { fechaLimite: "asc" },
        }),
      ]);

    return {
      totalSucursales,
      sucursalesVigentes,
      certificacionesPorVencer: certificacionesPorVencerRaw.map((i) => ({
        sucursal: i.sucursal!.nombre, cliente: i.sucursal!.cliente.empresa, fechaVencimiento: i.fechaVencimiento!,
      })),
      hallazgosCriticosAbiertos,
      accionesVencidas: accionesVencidasRaw.map((a) => ({
        descripcion: a.descripcion, fechaLimite: a.fechaLimite,
        sucursal: a.hallazgo.inspeccion.sucursal!.nombre, cliente: a.hallazgo.inspeccion.sucursal!.cliente.empresa,
      })),
    };
  }
}
