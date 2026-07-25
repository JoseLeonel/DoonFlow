import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { HallazgoFrecuente } from "@doonflow/shared";
import { TablaHallazgosFrecuentes } from "../_components/tabla-hallazgos-frecuentes";

const ITEMS: HallazgoFrecuente[] = [
  {
    id: "h1", descripcionHallazgo: "Extintor vencido", severidadSugerida: "CRITICA",
    descripcionAccionSugerida: "Sustituir el extintor", activo: true,
    empresaId: "e1", creadoEn: "2026-01-01", actualizadoEn: "2026-01-01",
  },
  {
    id: "h2", descripcionHallazgo: "Etiqueta ilegible", severidadSugerida: "MENOR",
    descripcionAccionSugerida: null, activo: false,
    empresaId: "e1", creadoEn: "2026-01-01", actualizadoEn: "2026-01-01",
  },
];

describe("TablaHallazgosFrecuentes", () => {
  it("muestra el estado de carga", () => {
    render(<TablaHallazgosFrecuentes hallazgosFrecuentes={[]} cargando={true} onAlternarActivo={vi.fn()} />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("muestra el estado vacío con enlace para agregar el primero", () => {
    render(<TablaHallazgosFrecuentes hallazgosFrecuentes={[]} cargando={false} onAlternarActivo={vi.fn()} />);
    expect(screen.getByText("No hay hallazgos frecuentes registrados.")).toBeInTheDocument();
    expect(screen.getByText(/Agregar primer hallazgo frecuente/)).toHaveAttribute("href", "/mantenimientos/hallazgos-frecuentes/nuevo");
  });

  it("renderiza una fila por hallazgo con su descripción, severidad y estado", () => {
    render(<TablaHallazgosFrecuentes hallazgosFrecuentes={ITEMS} cargando={false} onAlternarActivo={vi.fn()} />);
    expect(screen.getByText("Extintor vencido")).toBeInTheDocument();
    expect(screen.getByText("Etiqueta ilegible")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("el botón Desactivar/Activar llama onAlternarActivo con el id y el estado actual", () => {
    const onAlternarActivo = vi.fn();
    render(<TablaHallazgosFrecuentes hallazgosFrecuentes={ITEMS} cargando={false} onAlternarActivo={onAlternarActivo} />);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    expect(onAlternarActivo).toHaveBeenCalledWith("h1", true);
    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    expect(onAlternarActivo).toHaveBeenCalledWith("h2", false);
  });
});
