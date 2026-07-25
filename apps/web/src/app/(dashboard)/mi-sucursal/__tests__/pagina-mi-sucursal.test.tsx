import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PaginaMiSucursal from "../page";
import { obtenerSesionActual } from "../../../../lib/sesion.servicio";
import { useHistoricoSucursal } from "../../mantenimientos/clientes/_hooks/use-historico-sucursal";

vi.mock("../../../../lib/sesion.servicio", () => ({
  obtenerSesionActual: vi.fn(),
}));

vi.mock("../../mantenimientos/clientes/_hooks/use-historico-sucursal", () => ({
  useHistoricoSucursal: vi.fn(),
}));

const obtenerSesionActualMock = vi.mocked(obtenerSesionActual);
const usarHistoricoSucursalMock = vi.mocked(useHistoricoSucursal);

describe("PaginaMiSucursal", () => {
  beforeEach(() => {
    usarHistoricoSucursalMock.mockReturnValue({ historico: { registros: [], puntajeVigente: null }, cargando: false, error: null });
  });

  it("con 1 sucursal no muestra selector", async () => {
    obtenerSesionActualMock.mockResolvedValue({
      usuario: { id: "u1", email: "lucia@dist.com", nombre: "Lucía", rol: "usuario_sucursal" },
      alcance: { tipo: "SUCURSAL", sucursales: [{ id: "s1", nombre: "Planta Central" }] },
    });

    render(<PaginaMiSucursal />);

    expect(await screen.findByText("Mi sucursal")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("con más de 1 sucursal muestra selector", async () => {
    obtenerSesionActualMock.mockResolvedValue({
      usuario: { id: "u1", email: "lucia@dist.com", nombre: "Lucía", rol: "usuario_sucursal" },
      alcance: {
        tipo: "SUCURSAL",
        sucursales: [{ id: "s1", nombre: "Planta Central" }, { id: "s2", nombre: "Sucursal Norte" }],
      },
    });

    render(<PaginaMiSucursal />);

    const selector = await screen.findByRole("combobox");
    expect(selector).toBeInTheDocument();
    await userEvent.selectOptions(selector, "s2");
    expect((selector as HTMLSelectElement).value).toBe("s2");
  });
});
