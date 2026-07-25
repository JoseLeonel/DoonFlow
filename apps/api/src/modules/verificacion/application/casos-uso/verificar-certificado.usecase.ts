import type { CertificadoPublicoCrudo, VerificacionRepositoryPort } from "../../domain/verificacion.repository.port";

export interface CertificadoPublico {
  estado: "VIGENTE" | "VENCIDA";
  cliente: string;
  sucursal: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
  nombrePlantilla: string;
}

/**
 * Resuelve el estado público de una certificación por su `codigoVerificacion` exacto — HU-3,
 * portal sin autenticación. `estado` es un cálculo de presentación (regla 3 de la spec): no
 * cambia el `estado` interno (`FIRMADA`) de la `Inspeccion`.
 */
export class VerificarCertificadoUseCase {
  constructor(private readonly repo: VerificacionRepositoryPort) {}

  async ejecutar(codigo: string, ahora: Date = new Date()): Promise<CertificadoPublico | null> {
    const crudo = await this.repo.obtenerPorCodigo(codigo);
    if (!crudo) return null;

    return { ...this.mapear(crudo), estado: crudo.fechaVencimiento < ahora ? "VENCIDA" : "VIGENTE" };
  }

  private mapear(crudo: CertificadoPublicoCrudo) {
    return {
      cliente: crudo.cliente,
      sucursal: crudo.sucursal,
      fechaEmision: crudo.fechaEmision,
      fechaVencimiento: crudo.fechaVencimiento,
      nombrePlantilla: crudo.nombrePlantilla,
    };
  }
}
