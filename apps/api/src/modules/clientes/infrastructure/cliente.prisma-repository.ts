import type { PrismaClient } from "@prisma/client";
import type { Cliente } from "../domain/cliente.entity";
import type { AlcanceConsulta, ClienteRepositoryPort, DatosCrearCliente, Paginacion, ResultadoPaginado } from "../domain/cliente.repository.port";

function whereAlcance(alcance?: AlcanceConsulta): Record<string, unknown> {
  if (!alcance || alcance.tipo === "TOTAL") return {};
  if (alcance.tipo === "CLIENTE") return { id: alcance.clienteId };
  return { sucursales: { some: { id: { in: alcance.sucursalIds } } } };
}

function mapear(raw: any): Cliente {
  return {
    id:                    raw.id,
    empresaId:             raw.empresaId,
    nombreResponsable:     raw.nombreResponsable,
    empresa:               raw.empresa,
    identificacionEmpresa: raw.identificacionEmpresa ?? null,
    correo1:               raw.correo1,
    correo2:               raw.correo2 ?? null,
    correo3:               raw.correo3 ?? null,
    direccion:             raw.direccion ?? null,
    movil:                 raw.movil ?? null,
    activo:                raw.activo,
    creadoEn:              raw.creadoEn,
    actualizadoEn:         raw.actualizadoEn,
  };
}

export class ClientePrismaRepository implements ClienteRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(empresaId: string, alcance: AlcanceConsulta | undefined, paginacion: Paginacion): Promise<ResultadoPaginado<Cliente>> {
    const where = { empresaId, ...whereAlcance(alcance) };
    const [rows, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        orderBy: [{ empresa: "asc" }, { nombreResponsable: "asc" }],
        skip: (paginacion.pagina - 1) * paginacion.porPagina,
        take: paginacion.porPagina,
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return { items: rows.map(mapear), total };
  }

  async obtenerPorId(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<Cliente | null> {
    // OJO: no usar `{ id, empresaId, ...whereAlcance(alcance) }` — para alcance tipo CLIENTE,
    // whereAlcance() retorna una clave `id` que pisaría (por orden del spread) el `id` solicitado
    // y devolvería un cliente distinto al pedido en vez de un 404.
    if (alcance?.tipo === "CLIENTE" && alcance.clienteId !== id) return null;

    const where: Record<string, unknown> = { id, empresaId };
    if (alcance?.tipo === "SUCURSAL") {
      where["sucursales"] = { some: { id: { in: alcance.sucursalIds } } };
    }
    const row = await this.prisma.cliente.findFirst({ where });
    return row ? mapear(row) : null;
  }

  async crear(datos: DatosCrearCliente): Promise<Cliente> {
    const row = await this.prisma.cliente.create({ data: datos });
    return mapear(row);
  }

  async actualizar(id: string, empresaId: string, datos: Partial<Omit<DatosCrearCliente, "empresaId">>): Promise<Cliente> {
    const row = await this.prisma.cliente.update({ where: { id }, data: datos });
    return mapear(row);
  }

  async cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<Cliente> {
    const row = await this.prisma.cliente.update({ where: { id }, data: { activo } });
    return mapear(row);
  }

  async existeIdentificacion(empresaId: string, identificacionEmpresa: string, excluirId?: string): Promise<boolean> {
    const count = await this.prisma.cliente.count({
      where: {
        empresaId,
        identificacionEmpresa,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
    });
    return count > 0;
  }

  async buscarPorIdentificacion(identificacion: string, empresaId: string): Promise<Cliente | null> {
    const row = await this.prisma.cliente.findFirst({ where: { empresaId, identificacionEmpresa: identificacion } });
    return row ? mapear(row) : null;
  }
}
