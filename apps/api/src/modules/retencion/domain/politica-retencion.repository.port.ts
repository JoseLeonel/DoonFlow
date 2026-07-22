import type { AccionAlVencer, PoliticaRetencion, TipoDatoRetencion } from "./politica-retencion.entity";

export interface PoliticaRetencionRepositoryPort {
  /** Las 3 filas fijas de la empresa (una por `TipoDatoRetencion`). */
  obtenerPorEmpresa(empresaId: string): Promise<PoliticaRetencion[]>;

  actualizar(
    empresaId: string,
    tipoDato: TipoDatoRetencion,
    datos: { mesesRetencion: number; accionAlVencer: AccionAlVencer },
  ): Promise<PoliticaRetencion>;
}
