import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { IniciarCertificacionUseCase } from "../application/casos-uso/iniciar-certificacion.usecase";
import { PlantillaInactivaError, SucursalFueraDeAlcanceError, SucursalRequeridaError } from "../domain/inspeccion.errors";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";
import type { PlantillaRepositoryPort } from "../domain/plantilla.repository.port";
import type { PlantillaCompleta } from "../domain/plantilla.entity";

function crearCertificacionRepoMock(): CertificacionRepositoryPort & Record<string, Mock> {
  return {
    iniciar: vi.fn(),
    obtenerCompleta: vi.fn(),
    listar: vi.fn(),
    guardarRespuestasSeccion: vi.fn(),
    guardarEvidencia: vi.fn(),
    obtenerSucursalParaAlcance: vi.fn(),
  } as unknown as CertificacionRepositoryPort & Record<string, Mock>;
}

function crearPlantillaRepoMock(): PlantillaRepositoryPort & Record<string, Mock> {
  return {
    listar: vi.fn(), obtenerCompleta: vi.fn(), crear: vi.fn(), actualizar: vi.fn(),
    cambiarEstado: vi.fn(), eliminar: vi.fn(), clonar: vi.fn(), crearNodo: vi.fn(),
    actualizarNodo: vi.fn(), contarHijosNodo: vi.fn(), eliminarNodo: vi.fn(),
    reordenarNodos: vi.fn(), guardarRangos: vi.fn(),
  } as unknown as PlantillaRepositoryPort & Record<string, Mock>;
}

function plantillaActiva(parcial: Partial<PlantillaCompleta> = {}): PlantillaCompleta {
  return {
    id: "p1", empresaId: "e1", nombre: "Ficha", tipo: "CALIDAD", activa: true,
    puntajeMaximo: 100, version: 3, creadoEn: new Date(), actualizadoEn: new Date(),
    estadoAprobacion: "APROBADA",
    nodos: [], rangosResultado: [], ...parcial,
  };
}

describe("IniciarCertificacionUseCase", () => {
  let certificacionRepo: ReturnType<typeof crearCertificacionRepoMock>;
  let plantillaRepo: ReturnType<typeof crearPlantillaRepoMock>;
  let uc: IniciarCertificacionUseCase;

  beforeEach(() => {
    certificacionRepo = crearCertificacionRepoMock();
    plantillaRepo = crearPlantillaRepoMock();
    uc = new IniciarCertificacionUseCase(certificacionRepo, plantillaRepo);
  });

  const input = { plantillaId: "p1", sucursalId: "s1", periodoEtiqueta: "Julio 2026" };

  it("lanza PlantillaInactivaError si la plantilla vigente no está activa", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva({ activa: false }));

    await expect(uc.ejecutar("e1", "insp1", input)).rejects.toThrow(PlantillaInactivaError);
    expect(certificacionRepo.iniciar).not.toHaveBeenCalled();
  });

  it("lanza SucursalRequeridaError si la sucursal no existe o está inactiva", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva());
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue(null);

    await expect(uc.ejecutar("e1", "insp1", input)).rejects.toThrow(SucursalRequeridaError);
  });

  it("lanza SucursalFueraDeAlcanceError si la sucursal no pertenece al cliente del alcance del usuario", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva());
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", clienteId: "clienteX", activo: true });

    await expect(
      uc.ejecutar("e1", "insp1", input, { tipo: "CLIENTE", clienteId: "clienteY" }),
    ).rejects.toThrow(SucursalFueraDeAlcanceError);
  });

  it("crea la certificación con la plantillaVersion congelada cuando todo es válido", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva({ version: 5 }));
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", clienteId: "clienteY", activo: true });
    certificacionRepo.iniciar.mockResolvedValue({ id: "cert1" });

    const resultado = await uc.ejecutar("e1", "insp1", input, { tipo: "CLIENTE", clienteId: "clienteY" });

    expect(certificacionRepo.iniciar).toHaveBeenCalledWith({
      empresaId: "e1",
      plantillaId: "p1",
      plantillaVersion: 5,
      inspectorId: "insp1",
      sucursalId: "s1",
      periodoEtiqueta: "Julio 2026",
    });
    expect(resultado).toEqual({ id: "cert1" });
  });
});
