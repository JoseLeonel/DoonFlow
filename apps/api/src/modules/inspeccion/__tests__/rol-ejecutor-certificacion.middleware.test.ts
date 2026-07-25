import { describe, it, expect, vi } from "vitest";
import { requiereRolEjecutorCertificacion } from "../infrastructure/rol-ejecutor-certificacion.middleware";
import { ErrorHttp } from "../../../shared/error-http";

describe("requiereRolEjecutorCertificacion", () => {
  it("llama next() sin error para administrador", () => {
    const req: any = { usuario: { rol: "administrador" } };
    const next = vi.fn();

    requiereRolEjecutorCertificacion(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("llama next(ErrorHttp 403 rol_no_autorizado) para administrador_cliente", () => {
    const req: any = { usuario: { rol: "administrador_cliente" } };
    const next = vi.fn();

    requiereRolEjecutorCertificacion(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(ErrorHttp));
    const error = next.mock.calls[0]![0] as ErrorHttp;
    expect(error.status).toBe(403);
    expect(error.codigo).toBe("rol_no_autorizado");
  });

  it("llama next(ErrorHttp 403 rol_no_autorizado) para usuario_sucursal", () => {
    const req: any = { usuario: { rol: "usuario_sucursal" } };
    const next = vi.fn();

    requiereRolEjecutorCertificacion(req, {} as any, next);

    const error = next.mock.calls[0]![0] as ErrorHttp;
    expect(error.status).toBe(403);
  });

  it("llama next(ErrorHttp 401) si no hay usuario autenticado", () => {
    const req: any = {};
    const next = vi.fn();

    requiereRolEjecutorCertificacion(req, {} as any, next);

    const error = next.mock.calls[0]![0] as ErrorHttp;
    expect(error.status).toBe(401);
    expect(error.codigo).toBe("no_autenticado");
  });
});
