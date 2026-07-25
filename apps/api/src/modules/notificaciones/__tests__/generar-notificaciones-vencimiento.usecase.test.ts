import { describe, it, expect, vi } from "vitest";
import { GenerarNotificacionesVencimientoUseCase } from "../application/casos-uso/generar-notificaciones-vencimiento.usecase";

describe("GenerarNotificacionesVencimientoUseCase", () => {
  it("llama repo.generarVencimientos() una sola vez y retorna { generadas: N }", async () => {
    const repo = { generarVencimientos: vi.fn().mockResolvedValue(4) } as any;
    const uc = new GenerarNotificacionesVencimientoUseCase(repo);

    const resultado = await uc.ejecutar();

    expect(repo.generarVencimientos).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ generadas: 4 });
  });
});
