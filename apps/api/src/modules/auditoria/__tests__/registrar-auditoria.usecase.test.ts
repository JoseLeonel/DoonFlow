import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { RegistrarAuditoriaUseCase } from "../application/casos-uso/registrar-auditoria.usecase";
import { AccionAuditoriaInvalidaError } from "../domain/registro-auditoria.errors";
import type { RegistroAuditoriaRepositoryPort } from "../domain/registro-auditoria.repository.port";

function crearRepoMock(): RegistroAuditoriaRepositoryPort & Record<string, Mock> {
  return { registrar: vi.fn(), listar: vi.fn() } as unknown as RegistroAuditoriaRepositoryPort & Record<string, Mock>;
}

describe("RegistrarAuditoriaUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: RegistrarAuditoriaUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    uc = new RegistrarAuditoriaUseCase(repo);
  });

  it("registrar() llama repo.registrar() con los datos exactos del input", async () => {
    const datos = { empresaId: "e1", usuarioId: "u1", accion: "LOGIN", entidadTipo: "usuario", entidadId: "u1" };
    repo.registrar.mockResolvedValue({ id: "r1", ...datos, valorAntes: null, valorDespues: null, ip: null, creadoEn: new Date() });

    await uc.registrar(datos);

    expect(repo.registrar).toHaveBeenCalledWith(datos);
  });

  it("lanza AccionAuditoriaInvalidaError si accion viene vacía", async () => {
    await expect(
      uc.registrar({ empresaId: "e1", usuarioId: "u1", accion: "", entidadTipo: "usuario", entidadId: "u1" }),
    ).rejects.toThrow(AccionAuditoriaInvalidaError);
    expect(repo.registrar).not.toHaveBeenCalled();
  });

  it("lanza AccionAuditoriaInvalidaError si entidadTipo viene vacío", async () => {
    await expect(
      uc.registrar({ empresaId: "e1", usuarioId: "u1", accion: "LOGIN", entidadTipo: "", entidadId: "u1" }),
    ).rejects.toThrow(AccionAuditoriaInvalidaError);
  });
});
