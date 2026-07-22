import type { RegistroCertificacion } from "@doonflow/shared";
import type { PrismaClient } from "@prisma/client";
import type { Sucursal } from "../domain/sucursal.entity";
import type { AlcanceConsulta, DatosCrearSucursal, Paginacion, PuntajeVigente, ResultadoPaginado, SucursalRepositoryPort } from "../domain/sucursal.repository.port";

function mapear(raw: any): Sucursal {
  return {
    id:            raw.id,
    empresaId:     raw.empresaId,
    clienteId:     raw.clienteId,
    nombre:        raw.nombre,
    direccion:     raw.direccion ?? null,
    correo:        raw.correo ?? null,
    movil:         raw.movil ?? null,
    activo:        raw.activo,
    creadoEn:      raw.creadoEn,
    actualizadoEn: raw.actualizadoEn,
  };
}

/** Filtro adicional por alcance — para SUCURSAL/CLIENTE, ignora el clienteId solicitado y usa el del alcance. */
function whereAlcance(clienteId: string | undefined, alcance?: AlcanceConsulta): Record<string, unknown> {
  if (!alcance || alcance.tipo === "TOTAL") return clienteId ? { clienteId } : {};
  if (alcance.tipo === "CLIENTE") return { clienteId: alcance.clienteId };
  return { id: { in: alcance.sucursalIds } };
}

export class SucursalPrismaRepository implements SucursalRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listarPorCliente(
    clienteId: string,
    empresaId: string,
    alcance: AlcanceConsulta | undefined,
    paginacion: Paginacion,
  ): Promise<ResultadoPaginado<Sucursal>> {
    const where = { empresaId, ...whereAlcance(clienteId, alcance) };
    const [rows, total] = await Promise.all([
      this.prisma.sucursal.findMany({
        where,
        orderBy: { nombre: "asc" },
        skip: (paginacion.pagina - 1) * paginacion.porPagina,
        take: paginacion.porPagina,
      }),
      this.prisma.sucursal.count({ where }),
    ]);
    return { items: rows.map(mapear), total };
  }

  async obtenerPorId(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<Sucursal | null> {
    // OJO: mismo riesgo que en cliente.prisma-repository — para alcance tipo SUCURSAL,
    // whereAlcance() retorna una clave `id` que pisaría (por orden del spread) el `id`
    // solicitado. Se maneja aparte para no perder el filtro por :id.
    if (alcance?.tipo === "SUCURSAL" && !alcance.sucursalIds.includes(id)) return null;

    const where: Record<string, unknown> = { id, empresaId };
    if (alcance?.tipo === "CLIENTE") where["clienteId"] = alcance.clienteId;
    const row = await this.prisma.sucursal.findFirst({ where });
    return row ? mapear(row) : null;
  }

  async crear(datos: DatosCrearSucursal): Promise<Sucursal> {
    const row = await this.prisma.sucursal.create({ data: datos });
    return mapear(row);
  }

  async actualizar(id: string, empresaId: string, datos: Partial<Omit<DatosCrearSucursal, "empresaId" | "clienteId">>): Promise<Sucursal> {
    const row = await this.prisma.sucursal.update({ where: { id }, data: datos });
    return mapear(row);
  }

  async cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<Sucursal> {
    const row = await this.prisma.sucursal.update({ where: { id }, data: { activo } });
    return mapear(row);
  }

  async obtenerHistoricoCertificaciones(sucursalId: string, empresaId: string): Promise<RegistroCertificacion[]> {
    const inspecciones = await this.prisma.inspeccion.findMany({
      where: { sucursalId, empresaId },
      orderBy: { fechaInicio: "desc" },
      include: { plantilla: true },
    });
    return inspecciones.map((i) => ({
      fecha:           i.fechaInicio.toISOString(),
      plantillaNombre: i.plantilla.nombre,
      puntajeObtenido: Number(i.puntajeObtenido),
      puntajeMaximo:   Number(i.puntajeMaximo),
      clasificacion:   i.clasificacion ?? null,
    }));
  }

  async obtenerPuntajeVigente(sucursalId: string, empresaId: string): Promise<PuntajeVigente | null> {
    const registros = await this.obtenerHistoricoCertificaciones(sucursalId, empresaId);
    const masReciente = registros[0];
    if (!masReciente) return null;
    return { puntaje: masReciente.puntajeObtenido, clasificacion: masReciente.clasificacion };
  }
}
