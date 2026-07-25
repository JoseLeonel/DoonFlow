import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { Sidebar } from "../sidebar";
import { ProveedorSidebar } from "../sidebar-contexto";

vi.mock("next/navigation", () => ({
  usePathname: () => "/mantenimientos",
}));

vi.mock("../../../../lib/sesion.servicio", () => ({
  obtenerSesionActual: () =>
    Promise.resolve({
      usuario: { id: "u1", email: "admin@doonflow.demo", nombre: "Admin", rol: "administrador" },
      alcance: { tipo: "TOTAL" },
    }),
}));

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
});

describe("Sidebar", () => {
  it("muestra el subitem Usuarios bajo Mantenimientos con el href correcto", async () => {
    render(
      <ProveedorSidebar>
        <Sidebar />
      </ProveedorSidebar>,
    );

    await userEvent.click(await screen.findByText("Mantenimientos"));

    const link = screen.getByText("Usuarios").closest("a");
    expect(link).toHaveAttribute("href", "/mantenimientos/usuarios");
  });
});
