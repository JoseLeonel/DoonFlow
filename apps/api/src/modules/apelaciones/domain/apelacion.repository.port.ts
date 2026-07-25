import type { Apelacion } from "./apelacion.entity";

/** DTO de lectura enriquecido para listados — mismo criterio que `HallazgoConEvidencias`/`AccionCorrectivaConOrigen`. */
export interface ApelacionConDetalle extends Apelacion {
  solicitadoPorNombre: string;
  inspeccionEtiqueta: string;
}

export interface DatosCrearApelacion {
  empresaId: string;
  inspeccionId: string;
  hallazgoId: string | null;
  tipo: Apelacion["tipo"];
  motivo: string;
  solicitadoPorId: string;
}

export interface DatosResolverApelacion {
  estado: "ACEPTADA" | "RECHAZADA";
  resueltoPorId: string;
  resolucionComentario: string;
}

export interface ApelacionRepositoryPort {
  crear(datos: DatosCrearApelacion): Promise<ApelacionConDetalle>;
  obtenerPorId(id: string, empresaId: string): Promise<ApelacionConDetalle | null>;

  /** Apelaciones `ABIERTA`/`EN_REVISION` de la empresa, más antigua primero. */
  listarAbiertas(empresaId: string): Promise<ApelacionConDetalle[]>;

  /** Historial completo (cualquier estado) de apelaciones de una certificación. */
  listarPorInspeccion(inspeccionId: string, empresaId: string): Promise<ApelacionConDetalle[]>;

  resolver(id: string, empresaId: string, datos: DatosResolverApelacion): Promise<ApelacionConDetalle>;
}
