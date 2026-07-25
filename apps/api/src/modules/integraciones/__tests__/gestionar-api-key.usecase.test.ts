import { describe, it, expect, vi, beforeEach } from "vitest";
import { GestionarApiKeyUseCase } from "../application/casos-uso/gestionar-api-key.usecase";
import { ApiKeyNoEncontradaError } from "../domain/integraciones.errors";
import type { ApiKeyRepositoryPort } from "../domain/api-key.repository.port";

function apiKey(overrides: Partial<{ activa: boolean }> = {}) {
  return {
    id: "k1", empresaId: "e1", nombre: "ERP Cliente XYZ", claveHash: "hash-guardado",
    activa: overrides.activa ?? true, ultimoUsoEn: null, creadoPorId: "u1", creadoEn: new Date("2026-07-24T00:00:00.000Z"),
  };
}

describe("GestionarApiKeyUseCase", () => {
  let repo: ApiKeyRepositoryPort;
  let uc: GestionarApiKeyUseCase;

  beforeEach(() => {
    repo = {
      listar: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(),
      revocar: vi.fn(), obtenerActivaPorHash: vi.fn(), marcarUso: vi.fn(),
    } as any;
    uc = new GestionarApiKeyUseCase(repo);
  });

  it("crear() genera una clave en texto plano, guarda solo el hash, y devuelve ambos por separado", async () => {
    (repo.crear as any).mockResolvedValue(apiKey());

    const { apiKey: creada, claveTextoPlano } = await uc.crear("e1", "u1", { nombre: "ERP Cliente XYZ" });

    expect(claveTextoPlano.startsWith("dnf_live_")).toBe(true);
    expect(creada).toEqual(apiKey());
    const datosGuardados = (repo.crear as any).mock.calls[0][0];
    expect(datosGuardados.claveHash).not.toBe(claveTextoPlano);
    expect(datosGuardados).toEqual({ empresaId: "e1", nombre: "ERP Cliente XYZ", claveHash: datosGuardados.claveHash, creadoPorId: "u1" });
  });

  it("listar() reenvía la llamada al repositorio", async () => {
    (repo.listar as any).mockResolvedValue([apiKey()]);
    const resultado = await uc.listar("e1");
    expect(repo.listar).toHaveBeenCalledWith("e1");
    expect(resultado).toEqual([apiKey()]);
  });

  it("revocar() lanza ApiKeyNoEncontradaError si no existe o no pertenece a la empresa", async () => {
    (repo.obtenerPorId as any).mockResolvedValue(null);
    await expect(uc.revocar("k1", "e1")).rejects.toThrow(ApiKeyNoEncontradaError);
    expect(repo.revocar).not.toHaveBeenCalled();
  });

  it("revocar() llama repo.revocar(id, empresaId) cuando la key existe", async () => {
    (repo.obtenerPorId as any).mockResolvedValue(apiKey());
    (repo.revocar as any).mockResolvedValue(apiKey({ activa: false }));

    const resultado = await uc.revocar("k1", "e1");

    expect(repo.revocar).toHaveBeenCalledWith("k1", "e1");
    expect(resultado.activa).toBe(false);
  });
});
