import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Paginador } from "@doonflow/ui";

// packages/ui no tiene su propio runner de tests configurado (sin vitest.config ni RTL) —
// se prueba aquí, en apps/web, que ya resuelve @doonflow/ui directo a su código fuente
// (packages/ui/package.json → "main": "./src/index.ts") y tiene el entorno de test completo.
describe("Paginador", () => {
  it("deshabilita 'Anterior' en la página 1", () => {
    render(<Paginador pagina={1} porPagina={20} total={50} onCambiarPagina={vi.fn()} onCambiarPorPagina={vi.fn()} />);
    expect(screen.getByText("Anterior")).toBeDisabled();
  });

  it("deshabilita 'Siguiente' en la última página", () => {
    render(<Paginador pagina={3} porPagina={20} total={50} onCambiarPagina={vi.fn()} onCambiarPorPagina={vi.fn()} />);
    expect(screen.getByText("Siguiente")).toBeDisabled();
  });

  it("clic en 'Siguiente' llama onCambiarPagina con pagina+1", () => {
    const onCambiarPagina = vi.fn();
    render(<Paginador pagina={1} porPagina={20} total={50} onCambiarPagina={onCambiarPagina} onCambiarPorPagina={vi.fn()} />);

    fireEvent.click(screen.getByText("Siguiente"));

    expect(onCambiarPagina).toHaveBeenCalledWith(2);
  });

  it("clic en 'Anterior' llama onCambiarPagina con pagina-1", () => {
    const onCambiarPagina = vi.fn();
    render(<Paginador pagina={2} porPagina={20} total={50} onCambiarPagina={onCambiarPagina} onCambiarPorPagina={vi.fn()} />);

    fireEvent.click(screen.getByText("Anterior"));

    expect(onCambiarPagina).toHaveBeenCalledWith(1);
  });

  it("cambiar el selector de tamaño llama onCambiarPorPagina con el valor elegido", () => {
    const onCambiarPorPagina = vi.fn();
    render(<Paginador pagina={1} porPagina={20} total={50} onCambiarPagina={vi.fn()} onCambiarPorPagina={onCambiarPorPagina} />);

    fireEvent.change(screen.getByDisplayValue("20 / página"), { target: { value: "50" } });

    expect(onCambiarPorPagina).toHaveBeenCalledWith(50);
  });

  it("muestra 'Mostrando X–Y de Z'", () => {
    render(<Paginador pagina={2} porPagina={20} total={45} onCambiarPagina={vi.fn()} onCambiarPorPagina={vi.fn()} />);
    expect(screen.getByText("Mostrando 21–40 de 45")).toBeInTheDocument();
  });
});
