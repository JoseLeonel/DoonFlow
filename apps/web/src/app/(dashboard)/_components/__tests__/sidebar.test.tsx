import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { Sidebar } from "../sidebar";
import { ProveedorSidebar } from "../sidebar-contexto";

vi.mock("next/navigation", () => ({
  usePathname: () => "/mantenimientos",
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

    await userEvent.click(screen.getByText("Mantenimientos"));

    const link = screen.getByText("Usuarios").closest("a");
    expect(link).toHaveAttribute("href", "/mantenimientos/usuarios");
  });
});
