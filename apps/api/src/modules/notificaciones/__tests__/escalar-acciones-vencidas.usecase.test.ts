import { describe, it, expect, vi } from "vitest";
import { EscalarAccionesVencidasUseCase } from "../application/casos-uso/escalar-acciones-vencidas.usecase";

describe("EscalarAccionesVencidasUseCase", () => {
  it("llama repo.escalarAccionesVencidas() una sola vez y retorna { escaladas: N }", async () => {
    const repo = { escalarAccionesVencidas: vi.fn().mockResolvedValue(2) } as any;
    const uc = new EscalarAccionesVencidasUseCase(repo);

    const resultado = await uc.ejecutar();

    expect(repo.escalarAccionesVencidas).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ escaladas: 2 });
  });
});
