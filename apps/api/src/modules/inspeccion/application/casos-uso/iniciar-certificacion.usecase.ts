import { puedeIniciarInspeccion } from "../../domain/plantilla.entity";
import {
  PlantillaInactivaError,
  PlantillaNoEncontradaError,
  SucursalFueraDeAlcanceError,
  SucursalRequeridaError,
} from "../../domain/inspeccion.errors";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { PlantillaRepositoryPort } from "../../domain/plantilla.repository.port";
import type { IniciarCertificacionInput } from "../certificacion.schema";

export class IniciarCertificacionUseCase {
  constructor(
    private readonly certificacionRepo: CertificacionRepositoryPort,
    private readonly plantillaRepo: PlantillaRepositoryPort,
  ) {}

  async ejecutar(
    empresaId: string,
    inspectorId: string,
    input: IniciarCertificacionInput,
    alcance?: AlcanceConsulta,
  ) {
    const plantilla = await this.plantillaRepo.obtenerCompleta(input.plantillaId, empresaId);
    if (!plantilla) throw new PlantillaNoEncontradaError(input.plantillaId);
    if (!puedeIniciarInspeccion(plantilla)) throw new PlantillaInactivaError();

    const sucursal = await this.certificacionRepo.obtenerSucursalParaAlcance(input.sucursalId, empresaId);
    if (!sucursal || !sucursal.activo) throw new SucursalRequeridaError();
    this.validarAlcance(sucursal, alcance);

    return this.certificacionRepo.iniciar({
      empresaId,
      plantillaId: plantilla.id,
      plantillaVersion: plantilla.version,
      inspectorId,
      sucursalId: input.sucursalId,
      periodoEtiqueta: input.periodoEtiqueta,
    });
  }

  private validarAlcance(sucursal: { id: string; clienteId: string }, alcance?: AlcanceConsulta) {
    if (!alcance || alcance.tipo === "TOTAL") return;
    if (alcance.tipo === "CLIENTE" && sucursal.clienteId !== alcance.clienteId) {
      throw new SucursalFueraDeAlcanceError();
    }
    if (alcance.tipo === "SUCURSAL" && !alcance.sucursalIds.includes(sucursal.id)) {
      throw new SucursalFueraDeAlcanceError();
    }
  }
}
