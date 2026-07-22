import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FormularioUsuario } from "../_components/formulario-usuario";
import type { RolCatalogo } from "../_servicios/usuario.servicio";
import type { Cliente } from "../../clientes/_servicios/cliente.servicio";

const ROLES: RolCatalogo[] = [
  { id: "rol-admin", nombre: "administrador" },
  { id: "rol-admin-cliente", nombre: "administrador_cliente" },
  { id: "rol-usuario-sucursal", nombre: "usuario_sucursal" },
];

const CLIENTES: Cliente[] = [
  { id: "c1", empresaId: "e1", nombreResponsable: "Ana", empresa: "Distribuidora Sur S.A.", correo1: "a@a.com", activo: true, creadoEn: "2026-01-01", actualizadoEn: "2026-01-01" },
];

describe("FormularioUsuario", () => {
  it("renderiza los campos base (Nombre, Correo, Rol)", () => {
    render(
      <FormularioUsuario modo="crear" roles={ROLES} clientes={CLIENTES} guardando={false} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText("Carlos Mora")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("carlos@dist.com")).toBeInTheDocument();
    expect(screen.getByText("Rol")).toBeInTheDocument();
  });

  it("al elegir 'Administrador general' no aparece ningún campo condicional", async () => {
    render(
      <FormularioUsuario modo="crear" roles={ROLES} clientes={CLIENTES} guardando={false} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );
    await userEvent.selectOptions(screen.getByDisplayValue("Seleccionar rol..."), "rol-admin");
    expect(screen.queryByText("Cliente")).toBeNull();
    expect(screen.queryByText("Sucursal principal")).toBeNull();
  });

  it("al elegir 'Administrador de cliente' aparece el select Cliente", async () => {
    render(
      <FormularioUsuario modo="crear" roles={ROLES} clientes={CLIENTES} guardando={false} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );
    await userEvent.selectOptions(screen.getByDisplayValue("Seleccionar rol..."), "rol-admin-cliente");
    expect(screen.getByText("Cliente")).toBeInTheDocument();
  });

  it("al elegir 'Usuario de sucursal' aparecen Cliente (filtro) y Sucursal principal", async () => {
    render(
      <FormularioUsuario modo="crear" roles={ROLES} clientes={CLIENTES} guardando={false} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );
    await userEvent.selectOptions(screen.getByDisplayValue("Seleccionar rol..."), "rol-usuario-sucursal");
    expect(screen.getByText("Cliente (para filtrar)")).toBeInTheDocument();
    expect(screen.getByText("Sucursal principal")).toBeInTheDocument();
  });

  it("no llama onGuardar si el rol requiere alcance y no se seleccionó ninguno", async () => {
    const onGuardar = vi.fn();
    render(
      <FormularioUsuario modo="crear" roles={ROLES} clientes={CLIENTES} guardando={false} error={null} onGuardar={onGuardar} onCancelar={vi.fn()} />,
    );
    await userEvent.type(screen.getByPlaceholderText("Carlos Mora"), "Carlos Mora");
    await userEvent.type(screen.getByPlaceholderText("carlos@dist.com"), "carlos@dist.com");
    const inputPassword = document.querySelector('input[type="password"]') as HTMLInputElement;
    await userEvent.type(inputPassword, "Cliente2026!");
    await userEvent.selectOptions(screen.getByDisplayValue("Seleccionar rol..."), "rol-admin-cliente");

    await userEvent.click(screen.getByText("Guardar"));
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("contraseña requerida solo en modo crear", () => {
    const { rerender } = render(
      <FormularioUsuario modo="crear" roles={ROLES} clientes={CLIENTES} guardando={false} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();

    rerender(
      <FormularioUsuario
        modo="editar"
        roles={ROLES}
        clientes={CLIENTES}
        valoresIniciales={{ nombre: "Ana", email: "ana@doonflow.demo", rolId: "rol-admin", clienteId: null, sucursalId: null, sucursalesAdicionalesIds: [] }}
        guardando={false}
        error={null}
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.getByText(/restablecimiento de contraseña/i)).toBeInTheDocument();
  });
});
