import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { GestionarPlanAuditoriaUseCase } from "../application/casos-uso/gestionar-plan-auditoria.usecase";
import { PlanAuditoriaNoEncontradoError, PlanAuditoriaNoReprogramableError } from "../domain/plan-auditoria.errors";
import type { PlanAuditoriaConDetalle, PlanAuditoriaRepositoryPort } from "../domain/plan-auditoria.repository.port";
import type { EstadoPlanAuditoria } from "../domain/plan-auditoria.entity";

function plan(overrides: Partial<{ estado: EstadoPlanAuditoria }> = {}): PlanAuditoriaConDetalle {
  return {
    id: "p1", sucursalId: "s1", fechaObjetivo: new Date("2026-08-01"),
    responsableSugeridoId: null, estado: overrides.estado ?? "PROGRAMADA",
    inspeccionId: null, creadoEn: new Date(), empresaId: "e1",
    sucursalNombre: "Planta Central", clienteNombre: "Distribuidora Sur", responsableSugeridoNombre: null,
  };
}

describe("GestionarPlanAuditoriaUseCase", () => {
  let repo: Mocked<PlanAuditoriaRepositoryPort>;
  let uc: GestionarPlanAuditoriaUseCase;

  beforeEach(() => {
    repo = { listar: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(), reprogramar: vi.fn(), marcarEjecutada: vi.fn() };
    uc = new GestionarPlanAuditoriaUseCase(repo);
  });

  it("reprogramar() lanza PlanAuditoriaNoEncontradoError si no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    await expect(uc.reprogramar("p1", "e1", new Date("2026-09-01"))).rejects.toThrow(PlanAuditoriaNoEncontradoError);
  });

  it("reprogramar() lanza PlanAuditoriaNoReprogramableError si ya fue EJECUTADA", async () => {
    repo.obtenerPorId.mockResolvedValue(plan({ estado: "EJECUTADA" }));
    await expect(uc.reprogramar("p1", "e1", new Date("2026-09-01"))).rejects.toThrow(PlanAuditoriaNoReprogramableError);
    expect(repo.reprogramar).not.toHaveBeenCalled();
  });

  it("iniciarAhora() no lanza error aunque la fechaObjetivo sea futura (regla de negocio 2: no bloquea)", async () => {
    repo.obtenerPorId.mockResolvedValue(plan());
    const resultado = await uc.iniciarAhora("p1", "e1");
    expect(resultado.redirigirA).toBe("/certificaciones/nueva?sucursalId=s1&planId=p1");
  });

  it("programar() llama repo.crear() con los datos del input", async () => {
    repo.crear.mockResolvedValue(plan());
    await uc.programar("e1", { sucursalId: "s1", fechaObjetivo: new Date("2026-08-01"), responsableSugeridoId: "u1" });
    expect(repo.crear).toHaveBeenCalledWith({
      empresaId: "e1", sucursalId: "s1", fechaObjetivo: new Date("2026-08-01"), responsableSugeridoId: "u1",
    });
  });

  it("marcarEjecutada() llama repo.marcarEjecutada(id, empresaId, inspeccionId)", async () => {
    repo.obtenerPorId.mockResolvedValue(plan());
    repo.marcarEjecutada.mockResolvedValue(plan({ estado: "EJECUTADA" }));
    await uc.marcarEjecutada("p1", "e1", "insp1");
    expect(repo.marcarEjecutada).toHaveBeenCalledWith("p1", "e1", "insp1");
  });

  it("listar() reenvía el alcance del usuario al repositorio (un administrador_cliente no debe ver planes de otro cliente)", async () => {
    repo.listar.mockResolvedValue([plan()]);
    const alcance = { tipo: "CLIENTE" as const, clienteId: "c1" };
    await uc.listar("e1", {}, alcance);
    expect(repo.listar).toHaveBeenCalledWith("e1", {}, alcance);
  });
});
