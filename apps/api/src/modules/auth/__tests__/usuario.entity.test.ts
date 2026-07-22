import { describe, it, expect } from "vitest";
import type { RolSistema } from "@doonflow/shared";
import {
  calcularAlcance,
  puedeIniciarSesion,
  requiereClienteId,
  requiereSucursalId,
  validarAlcancePorRol,
} from "../domain/usuario.entity";
import type { UsuarioConRol } from "../domain/usuario.entity";

const ROLES: RolSistema[] = [
  "administrador",
  "productor",
  "operario",
  "auditor",
  "cliente_externo",
  "administrador_cliente",
  "usuario_sucursal",
];

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

describe("puedeIniciarSesion", () => {
  it("retorna false para usuario inactivo", () => {
    expect(puedeIniciarSesion(usuario({ activo: false }))).toBe(false);
  });
});

describe("requiereClienteId / requiereSucursalId", () => {
  it.each(ROLES)("resuelve correctamente para el rol %s", (rol) => {
    expect(requiereClienteId(rol)).toBe(rol === "administrador_cliente");
    expect(requiereSucursalId(rol)).toBe(rol === "usuario_sucursal");
  });
});

describe("validarAlcancePorRol", () => {
  it("acepta administrador sin clienteId ni sucursalId", () => {
    expect(validarAlcancePorRol({ rol: "administrador", clienteId: null, sucursalId: null })).toBeNull();
  });

  it("rechaza administrador con clienteId", () => {
    expect(validarAlcancePorRol({ rol: "administrador", clienteId: "c1", sucursalId: null })).not.toBeNull();
  });

  it("acepta administrador_cliente con clienteId y sin sucursalId", () => {
    expect(validarAlcancePorRol({ rol: "administrador_cliente", clienteId: "c1", sucursalId: null })).toBeNull();
  });

  it("rechaza administrador_cliente sin clienteId", () => {
    expect(validarAlcancePorRol({ rol: "administrador_cliente", clienteId: null, sucursalId: null })).not.toBeNull();
  });

  it("rechaza administrador_cliente con sucursalId", () => {
    expect(validarAlcancePorRol({ rol: "administrador_cliente", clienteId: "c1", sucursalId: "s1" })).not.toBeNull();
  });

  it("acepta usuario_sucursal con sucursalId y sin clienteId", () => {
    expect(validarAlcancePorRol({ rol: "usuario_sucursal", clienteId: null, sucursalId: "s1" })).toBeNull();
  });

  it("rechaza usuario_sucursal con clienteId", () => {
    expect(validarAlcancePorRol({ rol: "usuario_sucursal", clienteId: "c1", sucursalId: null })).not.toBeNull();
  });
});

describe("calcularAlcance", () => {
  it("retorna TOTAL para administrador", () => {
    expect(calcularAlcance(usuario({ rol: "administrador" }), [])).toEqual({ tipo: "TOTAL" });
  });

  it("retorna CLIENTE con el clienteId del usuario", () => {
    const resultado = calcularAlcance(usuario({ rol: "administrador_cliente", clienteId: "c1" }), []);
    expect(resultado).toEqual({ tipo: "CLIENTE", clienteId: "c1" });
  });

  it("retorna SUCURSAL con sucursalId + adicionales", () => {
    const resultado = calcularAlcance(usuario({ rol: "usuario_sucursal", sucursalId: "s1" }), ["s2", "s3"]);
    expect(resultado).toEqual({ tipo: "SUCURSAL", sucursalIds: ["s1", "s2", "s3"] });
  });

  it("retorna SUCURSAL solo con adicionales cuando no hay sucursal principal", () => {
    const resultado = calcularAlcance(usuario({ rol: "usuario_sucursal", sucursalId: null }), ["s2"]);
    expect(resultado).toEqual({ tipo: "SUCURSAL", sucursalIds: ["s2"] });
  });
});
