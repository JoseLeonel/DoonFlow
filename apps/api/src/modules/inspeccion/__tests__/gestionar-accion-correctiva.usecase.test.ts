import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { GestionarAccionCorrectivaUseCase } from "../application/casos-uso/gestionar-accion-correctiva.usecase";
import { SinPermisoActualizarAvanceError, SinPermisoVerificacionError } from "../domain/inspeccion.errors";
import type { AccionCorrectivaRepositoryPort } from "../domain/accion-correctiva.repository.port";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";

function accionOrigen(parcial: Record<string, unknown> = {}) {
  return {
    id: "a1", planCumplimientoId: "plan1", hallazgoId: "h1", descripcion: "Acción",
    responsableId: "u1", responsableNombre: "Juan", fechaLimite: new Date(), estado: "EN_PROCESO",
    porcentajeAvance: 50, verificadoPorId: null, verificadoEn: null, comentarioVerificacion: null,
    creadoEn: new Date(), actualizadoEn: new Date(), evidencias: [],
    inspeccionId: "cert1", sucursalId: "s1", clienteId: "c1",
    ...parcial,
  };
}

function crearRepoMock(): AccionCorrectivaRepositoryPort & Record<string, Mock> {
  return {
    crear: vi.fn(), obtenerPorId: vi.fn(), actualizar: vi.fn(), actualizarAvance: vi.fn(),
    enviarARevision: vi.fn(), verificar: vi.fn(), listarPorPlan: vi.fn(),
    listarPorResponsable: vi.fn(), listarEnRevision: vi.fn(), agregarEvidencia: vi.fn(),
  } as unknown as AccionCorrectivaRepositoryPort & Record<string, Mock>;
}

describe("GestionarAccionCorrectivaUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let almacenamiento: AlmacenamientoEvidenciasPort & Record<string, Mock>;
  let uc: GestionarAccionCorrectivaUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    almacenamiento = { subirArchivo: vi.fn() } as unknown as AlmacenamientoEvidenciasPort & Record<string, Mock>;
    uc = new GestionarAccionCorrectivaUseCase(repo, almacenamiento);
  });

  describe("actualizarAvance", () => {
    it("llamado por el propio responsable funciona", async () => {
      repo.obtenerPorId.mockResolvedValue(accionOrigen({ responsableId: "u1" }));
      repo.actualizarAvance.mockResolvedValue(accionOrigen({ porcentajeAvance: 80 }));

      await uc.actualizarAvance("a1", "e1", { id: "u1", rol: "usuario_sucursal" }, undefined, { porcentajeAvance: 80 });

      expect(repo.actualizarAvance).toHaveBeenCalledWith("a1", "e1", 80);
    });

    it("llamado por otro usuario_sucursal (no responsable) lanza SinPermisoActualizarAvanceError", async () => {
      repo.obtenerPorId.mockResolvedValue(accionOrigen({ responsableId: "u1" }));

      await expect(
        uc.actualizarAvance("a1", "e1", { id: "u2", rol: "usuario_sucursal" }, undefined, { porcentajeAvance: 80 }),
      ).rejects.toThrow(SinPermisoActualizarAvanceError);
      expect(repo.actualizarAvance).not.toHaveBeenCalled();
    });

    it("llamado por administrador general funciona aunque no sea el responsable", async () => {
      repo.obtenerPorId.mockResolvedValue(accionOrigen({ responsableId: "u1" }));
      repo.actualizarAvance.mockResolvedValue(accionOrigen({ porcentajeAvance: 50 }));

      await uc.actualizarAvance("a1", "e1", { id: "admin1", rol: "administrador" }, undefined, { porcentajeAvance: 50 });

      expect(repo.actualizarAvance).toHaveBeenCalledWith("a1", "e1", 50);
    });
  });

  describe("verificar", () => {
    it("llamado por un usuario sin permiso de verificación lanza SinPermisoVerificacionError", async () => {
      await expect(
        uc.verificar("a1", "e1", { id: "u1", rol: "usuario_sucursal" }, { resultado: "CUMPLIDO", comentario: "ok" }),
      ).rejects.toThrow(SinPermisoVerificacionError);
      expect(repo.verificar).not.toHaveBeenCalled();
    });

    it("con resultado NO_CUMPLIDO regresa la acción a EN_PROCESO y acepta nuevaFechaLimite", async () => {
      repo.obtenerPorId.mockResolvedValue(accionOrigen());
      const nuevaFechaLimite = new Date("2026-08-01");
      repo.verificar.mockResolvedValue(accionOrigen({ estado: "EN_PROCESO", fechaLimite: nuevaFechaLimite }));

      const resultado = await uc.verificar(
        "a1", "e1", { id: "auditor1", rol: "auditor" },
        { resultado: "NO_CUMPLIDO", comentario: "Falta evidencia", nuevaFechaLimite },
      );

      expect(repo.verificar).toHaveBeenCalledWith("a1", "e1", {
        resultado: "NO_CUMPLIDO", comentario: "Falta evidencia", verificadoPorId: "auditor1", nuevaFechaLimite,
      });
      expect(resultado.estado).toBe("EN_PROCESO");
    });
  });
});
