import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mocked } from "vitest";
import { GestionarMatrizPermisosUseCase } from "../application/casos-uso/gestionar-matriz-permisos.usecase";
import { PermisoInvalidoError, RolNoEditableError, RolNoEncontradoError } from "../domain/rol-permiso.errors";
import type { RolPermisoRepositoryPort } from "../domain/rol-permiso.repository.port";

function crearRepoMock(): Mocked<RolPermisoRepositoryPort> {
  return {
    obtenerMatriz: vi.fn(),
    obtenerRolPorId: vi.fn(),
    listarPermisosPorIds: vi.fn(),
    asignarPermisos: vi.fn(),
    listarCodigosPermisoDelRol: vi.fn(),
  };
}

describe("GestionarMatrizPermisosUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: GestionarMatrizPermisosUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    uc = new GestionarMatrizPermisosUseCase(repo);
  });

  describe("obtenerMatriz", () => {
    it("marca al rol administrador como no editable y con todos los permisos", async () => {
      repo.obtenerMatriz.mockResolvedValue({
        roles: [{ id: "r-admin", nombre: "administrador" }, { id: "r-aud", nombre: "auditor" }],
        permisos: [{ id: "p1", codigo: "plantillas.aprobar" }, { id: "p2", codigo: "permisos.administrar" }],
        asignaciones: [{ rolId: "r-aud", permisoId: "p1" }],
      });

      const matriz = await uc.obtenerMatriz();

      const admin = matriz.roles.find((r) => r.nombre === "administrador")!;
      const auditor = matriz.roles.find((r) => r.nombre === "auditor")!;
      expect(admin.editable).toBe(false);
      expect(admin.permisoIds).toEqual(["p1", "p2"]);
      expect(auditor.editable).toBe(true);
      expect(auditor.permisoIds).toEqual(["p1"]);
    });
  });

  describe("asignarPermisos", () => {
    it("lanza RolNoEncontradoError si el rol no existe", async () => {
      repo.obtenerRolPorId.mockResolvedValue(null);

      await expect(uc.asignarPermisos("r1", ["p1"])).rejects.toThrow(RolNoEncontradoError);
      expect(repo.asignarPermisos).not.toHaveBeenCalled();
    });

    it("lanza RolNoEditableError si el rol es administrador", async () => {
      repo.obtenerRolPorId.mockResolvedValue({ id: "r-admin", nombre: "administrador" });

      await expect(uc.asignarPermisos("r-admin", ["p1"])).rejects.toThrow(RolNoEditableError);
      expect(repo.asignarPermisos).not.toHaveBeenCalled();
    });

    it("lanza PermisoInvalidoError si algún permisoId no existe en el catálogo", async () => {
      repo.obtenerRolPorId.mockResolvedValue({ id: "r-aud", nombre: "auditor" });
      repo.listarPermisosPorIds.mockResolvedValue([{ id: "p1", codigo: "plantillas.aprobar" }]);

      await expect(uc.asignarPermisos("r-aud", ["p1", "p2-inexistente"])).rejects.toThrow(PermisoInvalidoError);
      expect(repo.asignarPermisos).not.toHaveBeenCalled();
    });

    it("con datos válidos llama repo.asignarPermisos exactamente una vez", async () => {
      repo.obtenerRolPorId.mockResolvedValue({ id: "r-aud", nombre: "auditor" });
      repo.listarPermisosPorIds.mockResolvedValue([{ id: "p1", codigo: "plantillas.aprobar" }]);

      await uc.asignarPermisos("r-aud", ["p1"]);

      expect(repo.asignarPermisos).toHaveBeenCalledTimes(1);
      expect(repo.asignarPermisos).toHaveBeenCalledWith("r-aud", ["p1"]);
    });

    it("con permisoIds vacío no valida catálogo y limpia los permisos del rol", async () => {
      repo.obtenerRolPorId.mockResolvedValue({ id: "r-aud", nombre: "auditor" });

      await uc.asignarPermisos("r-aud", []);

      expect(repo.listarPermisosPorIds).not.toHaveBeenCalled();
      expect(repo.asignarPermisos).toHaveBeenCalledWith("r-aud", []);
    });
  });
});
