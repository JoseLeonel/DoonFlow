import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TablaUsuarios } from "../_components/tabla-usuarios";
import type { UsuarioConAlcance } from "../_servicios/usuario.servicio";

function usuario(parcial: Partial<UsuarioConAlcance> = {}): UsuarioConAlcance {
  return {
    id: "u1",
    empresaId: "e1",
    email: "ana@doonflow.demo",
    nombre: "Ana Solano",
    rolId: "rol-admin",
    rolNombre: "administrador",
    clienteId: null,
    sucursalId: null,
    clienteNombre: null,
    sucursalNombre: null,
    sucursalesAdicionales: [],
    activo: true,
    creadoEn: "2026-01-01T00:00:00.000Z",
    actualizadoEn: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("TablaUsuarios", () => {
  it("muestra 'No hay usuarios registrados' con usuarios = []", () => {
    render(<TablaUsuarios usuarios={[]} cargando={false} />);
    expect(screen.getByText("No hay usuarios registrados.")).toBeInTheDocument();
  });

  it("columna Alcance muestra 'Todos' para administrador", () => {
    render(<TablaUsuarios usuarios={[usuario({ rolNombre: "administrador" })]} cargando={false} />);
    expect(screen.getByText("Todos")).toBeInTheDocument();
  });

  it("columna Alcance muestra el nombre del cliente para administrador_cliente", () => {
    render(
      <TablaUsuarios
        usuarios={[usuario({ rolNombre: "administrador_cliente", clienteNombre: "Distribuidora Sur S.A." })]}
        cargando={false}
      />,
    );
    expect(screen.getByText("Distribuidora Sur S.A.")).toBeInTheDocument();
  });

  it("columna Alcance muestra sucursal + 'y N más' para usuario_sucursal con adicionales", () => {
    render(
      <TablaUsuarios
        usuarios={[
          usuario({
            rolNombre: "usuario_sucursal",
            sucursalNombre: "Planta Central",
            sucursalesAdicionales: [{ id: "s2", nombre: "Sucursal Norte" }],
          }),
        ]}
        cargando={false}
      />,
    );
    expect(screen.getByText("Planta Central y 1 más")).toBeInTheDocument();
  });

  it("el botón Modificar tiene el href correcto", () => {
    render(<TablaUsuarios usuarios={[usuario({ id: "u9" })]} cargando={false} />);
    expect(screen.getByText("Modificar")).toHaveAttribute("href", "/mantenimientos/usuarios/u9/editar");
  });
});
