import { describe, it, expect, vi } from "vitest";
import { crearMiddlewareAlcance } from "../alcance.middleware";
import type { UsuarioConRol } from "../../modules/auth/domain/usuario.entity";

function usuario(parcial: Partial<UsuarioConRol> = {}): UsuarioConRol {
  return {
    id: "u1",
    empresaId: "e1",
    authUserId: "u1",
    email: "u@doonflow.demo",
    nombre: "Usuario Demo",
    rol: "administrador",
    activo: true,
    clienteId: null,
    sucursalId: null,
    ...parcial,
  };
}

function crearPrismaMock(accesosAdicionales: { sucursalId: string }[] = []) {
  return {
    usuarioSucursalAcceso: { findMany: vi.fn().mockResolvedValue(accesosAdicionales) },
  } as any;
}

describe("resolverAlcance", () => {
  it("retorna { tipo: TOTAL } para administrador", async () => {
    const resolverAlcance = crearMiddlewareAlcance(crearPrismaMock());
    const req: any = { usuario: usuario({ rol: "administrador" }) };
    const next = vi.fn();

    await resolverAlcance(req, {} as any, next);

    expect(req.alcance).toEqual({ tipo: "TOTAL" });
    expect(next).toHaveBeenCalledWith();
  });

  it("retorna { tipo: CLIENTE, clienteId } para administrador_cliente", async () => {
    const resolverAlcance = crearMiddlewareAlcance(crearPrismaMock());
    const req: any = { usuario: usuario({ rol: "administrador_cliente", clienteId: "c1" }) };
    const next = vi.fn();

    await resolverAlcance(req, {} as any, next);

    expect(req.alcance).toEqual({ tipo: "CLIENTE", clienteId: "c1" });
  });

  it("retorna { tipo: SUCURSAL, sucursalIds } incluyendo adicionales para usuario_sucursal", async () => {
    const prisma = crearPrismaMock([{ sucursalId: "s2" }, { sucursalId: "s3" }]);
    const resolverAlcance = crearMiddlewareAlcance(prisma);
    const req: any = { usuario: usuario({ rol: "usuario_sucursal", sucursalId: "s1" }) };
    const next = vi.fn();

    await resolverAlcance(req, {} as any, next);

    expect(req.alcance).toEqual({ tipo: "SUCURSAL", sucursalIds: ["s1", "s2", "s3"] });
    expect(prisma.usuarioSucursalAcceso.findMany).toHaveBeenCalledWith({ where: { usuarioId: "u1" } });
  });

  it("llama next(error) con 401 si no hay req.usuario", async () => {
    const resolverAlcance = crearMiddlewareAlcance(crearPrismaMock());
    const req: any = {};
    const next = vi.fn();

    await resolverAlcance(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
