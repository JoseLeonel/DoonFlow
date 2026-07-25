import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { GestionarNotificacionesUseCase } from "../application/casos-uso/gestionar-notificaciones.usecase";
import { NotificacionNoEncontradaError } from "../domain/notificacion.errors";
import type { NotificacionRepositoryPort } from "../domain/notificacion.repository.port";

describe("GestionarNotificacionesUseCase", () => {
  let repo: Mocked<NotificacionRepositoryPort>;
  let uc: GestionarNotificacionesUseCase;

  beforeEach(() => {
    repo = {
      listarPorUsuario: vi.fn(), contarNoLeidas: vi.fn(), marcarLeida: vi.fn(), marcarTodasLeidas: vi.fn(),
      crear: vi.fn(), buscarAdministradoresCliente: vi.fn(), buscarAdministradoresGenerales: vi.fn(),
      generarVencimientos: vi.fn(), escalarAccionesVencidas: vi.fn(),
    };
    uc = new GestionarNotificacionesUseCase(repo);
  });

  it("marcarLeida() lanza NotificacionNoEncontradaError si el repo retorna null", async () => {
    repo.marcarLeida.mockResolvedValue(null);
    await expect(uc.marcarLeida("n1", "u1")).rejects.toThrow(NotificacionNoEncontradaError);
  });

  it("contarNoLeidas() retorna el valor del repositorio sin transformarlo", async () => {
    repo.contarNoLeidas.mockResolvedValue(5);
    await expect(uc.contarNoLeidas("u1", "e1")).resolves.toBe(5);
  });

  it("marcarTodasLeidas() llama repo.marcarTodasLeidas(usuarioId, empresaId)", async () => {
    repo.marcarTodasLeidas.mockResolvedValue(3);
    await uc.marcarTodasLeidas("u1", "e1");
    expect(repo.marcarTodasLeidas).toHaveBeenCalledWith("u1", "e1");
  });

  it("notificarCliente() usa administradoresCliente si existen, sin caer a los generales", async () => {
    repo.buscarAdministradoresCliente.mockResolvedValue(["u1", "u2"]);
    repo.crear.mockResolvedValue({} as any);

    await uc.notificarCliente("c1", "e1", "HALLAZGO_CRITICO", "hallazgo", "h1", { sucursal: "Planta Central" });

    expect(repo.buscarAdministradoresGenerales).not.toHaveBeenCalled();
    expect(repo.crear).toHaveBeenCalledTimes(2);
  });

  it("notificarCliente() cae a administradoresGenerales si no hay administrador_cliente", async () => {
    repo.buscarAdministradoresCliente.mockResolvedValue([]);
    repo.buscarAdministradoresGenerales.mockResolvedValue(["admin1"]);
    repo.crear.mockResolvedValue({} as any);

    await uc.notificarCliente("c1", "e1", "HALLAZGO_CRITICO", "hallazgo", "h1", { sucursal: "Planta Central" });

    expect(repo.buscarAdministradoresGenerales).toHaveBeenCalledWith("e1");
    expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: "admin1" }));
  });
});
