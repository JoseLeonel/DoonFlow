import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { GestionarPlanCumplimientoUseCase } from "../application/casos-uso/gestionar-plan-cumplimiento.usecase";
import {
  PlanCumplimientoConHallazgosSinAccionError,
  PlanCumplimientoSinHallazgosError,
  PlanCumplimientoYaExisteError,
  SinPermisoVerificacionError,
} from "../domain/inspeccion.errors";
import type { PlanCumplimientoRepositoryPort } from "../domain/plan-cumplimiento.repository.port";
import type { HallazgoRepositoryPort } from "../domain/hallazgo.repository.port";
import type { AccionCorrectivaRepositoryPort } from "../domain/accion-correctiva.repository.port";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";

function crearMocks() {
  const planRepo: Mocked<PlanCumplimientoRepositoryPort> = {
    obtenerPorInspeccion: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(),
    cerrar: vi.fn(), reabrir: vi.fn(), obtenerIndicadores: vi.fn(),
  };
  const hallazgoRepo = {
    listarPorInspeccion: vi.fn(), listarDetalleIdsConHallazgo: vi.fn(), crear: vi.fn(), crearVarios: vi.fn(),
    obtenerPorId: vi.fn(), actualizar: vi.fn(), agregarEvidencia: vi.fn(), anularPorApelacion: vi.fn(),
  } as unknown as Mocked<HallazgoRepositoryPort>;
  const accionRepo = { listarPorPlan: vi.fn() } as unknown as Mocked<AccionCorrectivaRepositoryPort>;
  const certificacionRepo = { obtenerCompleta: vi.fn() } as unknown as Mocked<CertificacionRepositoryPort>;
  return { planRepo, hallazgoRepo, accionRepo, certificacionRepo };
}

describe("GestionarPlanCumplimientoUseCase", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let uc: GestionarPlanCumplimientoUseCase;

  beforeEach(() => {
    mocks = crearMocks();
    mocks.certificacionRepo.obtenerCompleta.mockResolvedValue({ id: "cert1" } as any);
    uc = new GestionarPlanCumplimientoUseCase(mocks.planRepo, mocks.hallazgoRepo, mocks.accionRepo, mocks.certificacionRepo);
  });

  describe("generar", () => {
    it("sin hallazgos lanza PlanCumplimientoSinHallazgosError", async () => {
      mocks.planRepo.obtenerPorInspeccion.mockResolvedValue(null);
      mocks.hallazgoRepo.listarPorInspeccion.mockResolvedValue([]);

      await expect(uc.generar("cert1", "e1")).rejects.toThrow(PlanCumplimientoSinHallazgosError);
      expect(mocks.planRepo.crear).not.toHaveBeenCalled();
    });

    it("con un plan ya existente para la inspección lanza PlanCumplimientoYaExisteError", async () => {
      mocks.planRepo.obtenerPorInspeccion.mockResolvedValue({ id: "plan1" } as any);

      await expect(uc.generar("cert1", "e1")).rejects.toThrow(PlanCumplimientoYaExisteError);
      expect(mocks.planRepo.crear).not.toHaveBeenCalled();
    });

    it("con al menos un hallazgo crea el plan", async () => {
      mocks.planRepo.obtenerPorInspeccion.mockResolvedValue(null);
      mocks.hallazgoRepo.listarPorInspeccion.mockResolvedValue([{ id: "h1" }] as any);
      mocks.planRepo.crear.mockResolvedValue({ id: "plan1", estado: "EN_SEGUIMIENTO" } as any);

      const plan = await uc.generar("cert1", "e1");

      expect(mocks.planRepo.crear).toHaveBeenCalledWith("cert1");
      expect(plan.estado).toBe("EN_SEGUIMIENTO");
    });
  });

  describe("cerrar", () => {
    it("llamado por un usuario sin permiso de verificación lanza SinPermisoVerificacionError", async () => {
      await expect(uc.cerrar("plan1", "e1", { id: "u1", rol: "usuario_sucursal" })).rejects.toThrow(SinPermisoVerificacionError);
      expect(mocks.planRepo.obtenerPorId).not.toHaveBeenCalled();
    });

    it("con hallazgos sin cubrir lanza PlanCumplimientoConHallazgosSinAccionError", async () => {
      mocks.planRepo.obtenerPorId.mockResolvedValue({ id: "plan1", inspeccionId: "cert1" } as any);
      mocks.hallazgoRepo.listarPorInspeccion.mockResolvedValue([{ id: "h1" }] as any);
      mocks.accionRepo.listarPorPlan.mockResolvedValue([{ hallazgoId: "h1", estado: "EN_PROCESO" }] as any);

      await expect(uc.cerrar("plan1", "e1", { id: "auditor1", rol: "auditor" })).rejects.toThrow(
        PlanCumplimientoConHallazgosSinAccionError,
      );
      expect(mocks.planRepo.cerrar).not.toHaveBeenCalled();
    });

    it("con todos los hallazgos cubiertos cierra el plan", async () => {
      mocks.planRepo.obtenerPorId.mockResolvedValue({ id: "plan1", inspeccionId: "cert1" } as any);
      mocks.hallazgoRepo.listarPorInspeccion.mockResolvedValue([{ id: "h1" }] as any);
      mocks.accionRepo.listarPorPlan.mockResolvedValue([{ hallazgoId: "h1", estado: "CUMPLIDO" }] as any);
      mocks.planRepo.cerrar.mockResolvedValue({ id: "plan1", estado: "CERRADO" } as any);

      const plan = await uc.cerrar("plan1", "e1", { id: "auditor1", rol: "auditor" });

      expect(mocks.planRepo.cerrar).toHaveBeenCalledWith("plan1", "auditor1");
      expect(plan.estado).toBe("CERRADO");
    });
  });
});
