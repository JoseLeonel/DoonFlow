import { TIPOS_DATO_RETENCION, type AccionAlVencer, type TipoDatoRetencion } from "../../domain/politica-retencion.entity";
import { TipoDatoRetencionInvalidoError } from "../../domain/politica-retencion.errors";
import type { PoliticaRetencionRepositoryPort } from "../../domain/politica-retencion.repository.port";

export class GestionarPoliticaRetencionUseCase {
  constructor(private readonly repo: PoliticaRetencionRepositoryPort) {}

  obtenerPorEmpresa(empresaId: string) {
    return this.repo.obtenerPorEmpresa(empresaId);
  }

  async actualizar(empresaId: string, tipoDato: string, datos: { mesesRetencion: number; accionAlVencer: AccionAlVencer }) {
    if (!TIPOS_DATO_RETENCION.includes(tipoDato as TipoDatoRetencion)) {
      throw new TipoDatoRetencionInvalidoError(tipoDato);
    }
    return this.repo.actualizar(empresaId, tipoDato as TipoDatoRetencion, datos);
  }
}
