import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mocked } from "vitest";
import { IniciarCertificacionUseCase } from "../application/casos-uso/iniciar-certificacion.usecase";
import { PeriodoCertificacionVigenteError, PlantillaInactivaError, SucursalFueraDeAlcanceError, SucursalRequeridaError } from "../domain/inspeccion.errors";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";
import type { PlantillaRepositoryPort } from "../domain/plantilla.repository.port";
import type { PlantillaCompleta } from "../domain/plantilla.entity";

function crearCertificacionRepoMock(): Mocked<CertificacionRepositoryPort> {
  return {
    iniciar: vi.fn(), obtenerCompleta: vi.fn(), listar: vi.fn(), guardarRespuestasSeccion: vi.fn(),
    guardarEvidencia: vi.fn(), obtenerSucursalParaAlcance: vi.fn(), upsertDetallesConResolucionConflicto: vi.fn(),
    marcarSincronizado: vi.fn(), firmar: vi.fn(), establecerPdfUrl: vi.fn(), aceptar: vi.fn(), actualizarResultadoFinal: vi.fn(), actualizarResumenProgreso: vi.fn(),
    buscarPeriodoVigente: vi.fn(), finalizar: vi.fn(),
  };
}

function crearPlantillaRepoMock(): Mocked<PlantillaRepositoryPort> {
  return {
    listar: vi.fn(), obtenerCompleta: vi.fn(), crear: vi.fn(), actualizar: vi.fn(),
    cambiarEstado: vi.fn(), eliminar: vi.fn(), clonar: vi.fn(), crearNodo: vi.fn(),
    actualizarNodo: vi.fn(), contarHijosNodo: vi.fn(), eliminarNodo: vi.fn(),
    reordenarNodos: vi.fn(), guardarRangos: vi.fn(), cambiarEstadoAprobacion: vi.fn(),
    listarPendientesAprobacion: vi.fn(),
  };
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

  const input = { plantillaId: "p1", sucursalId: "s1", fechaInicioPeriodo: new Date("2026-07-01"), fechaFinPeriodo: new Date("2026-07-31") };

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
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", nombre: "Sucursal X", clienteId: "clienteX", activo: true });

    await expect(
      uc.ejecutar("e1", "insp1", input, { tipo: "CLIENTE", clienteId: "clienteY" }),
    ).rejects.toThrow(SucursalFueraDeAlcanceError);
  });

  it("crea la certificación con la plantillaVersion congelada cuando todo es válido", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva({ version: 5 }));
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", nombre: "Sucursal Y", clienteId: "clienteY", activo: true });
    certificacionRepo.buscarPeriodoVigente.mockResolvedValue(null);
    certificacionRepo.iniciar.mockResolvedValue({ id: "cert1" } as any);

    const resultado = await uc.ejecutar("e1", "insp1", input, { tipo: "CLIENTE", clienteId: "clienteY" });

    expect(certificacionRepo.iniciar).toHaveBeenCalledWith({
      empresaId: "e1",
      plantillaId: "p1",
      plantillaVersion: 5,
      inspectorId: "insp1",
      sucursalId: "s1",
      fechaInicioPeriodo: input.fechaInicioPeriodo,
      fechaFinPeriodo: input.fechaFinPeriodo,
    });
    expect(resultado).toEqual({ id: "cert1" });
  });

  it("lanza PeriodoCertificacionVigenteError si ya hay una certificación vigente para esa sucursal+plantilla", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva());
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", nombre: "Sucursal Y", clienteId: "clienteY", activo: true });
    certificacionRepo.buscarPeriodoVigente.mockResolvedValue({ id: "cert-anterior", fechaFinPeriodo: new Date("2026-08-31") });

    await expect(uc.ejecutar("e1", "insp1", input)).rejects.toThrow(PeriodoCertificacionVigenteError);
    expect(certificacionRepo.iniciar).not.toHaveBeenCalled();
  });

  it("014-panel-calendario-biblioteca: con planId, llama marcarPlanEjecutado con el id de la certificación recién creada", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva());
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", nombre: "Sucursal Y", clienteId: "clienteY", activo: true });
    certificacionRepo.iniciar.mockResolvedValue({ id: "cert1" } as any);
    const marcarPlanEjecutado = vi.fn();
    const ucConPlan = new IniciarCertificacionUseCase(certificacionRepo, plantillaRepo, marcarPlanEjecutado);

    await ucConPlan.ejecutar("e1", "insp1", { ...input, planId: "plan1" });

    expect(marcarPlanEjecutado).toHaveBeenCalledWith("plan1", "e1", "cert1");
  });

  it("sin planId, no llama marcarPlanEjecutado", async () => {
    plantillaRepo.obtenerCompleta.mockResolvedValue(plantillaActiva());
    certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", nombre: "Sucursal Y", clienteId: "clienteY", activo: true });
    certificacionRepo.iniciar.mockResolvedValue({ id: "cert1" } as any);
    const marcarPlanEjecutado = vi.fn();
    const ucConPlan = new IniciarCertificacionUseCase(certificacionRepo, plantillaRepo, marcarPlanEjecutado);

    await ucConPlan.ejecutar("e1", "insp1", input);

    expect(marcarPlanEjecutado).not.toHaveBeenCalled();
  });
});
