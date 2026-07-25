import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { HallazgoFrecuente } from "@doonflow/shared";
import { SelectorHallazgoFrecuente } from "../_components/selector-hallazgo-frecuente";

const ITEMS: HallazgoFrecuente[] = [
  { id: "h1", descripcionHallazgo: "Extintor vencido", severidadSugerida: "CRITICA", descripcionAccionSugerida: null, activo: true, empresaId: "e1", creadoEn: "", actualizadoEn: "" },
  { id: "h2", descripcionHallazgo: "Etiqueta ilegible", severidadSugerida: "MENOR", descripcionAccionSugerida: null, activo: true, empresaId: "e1", creadoEn: "", actualizadoEn: "" },
];

describe("SelectorHallazgoFrecuente", () => {
  it("muestra el estado de carga", () => {
    render(<SelectorHallazgoFrecuente items={[]} cargando={true} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay coincidencias", () => {
    render(<SelectorHallazgoFrecuente items={[]} cargando={false} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.getByText("No hay hallazgos frecuentes que coincidan.")).toBeInTheDocument();
  });

  it("lista los items recibidos por props", () => {
    render(<SelectorHallazgoFrecuente items={ITEMS} cargando={false} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.getByText("Extintor vencido")).toBeInTheDocument();
    expect(screen.getByText("Etiqueta ilegible")).toBeInTheDocument();
  });

  it("la búsqueda filtra por descripción", () => {
    render(<SelectorHallazgoFrecuente items={ITEMS} cargando={false} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("🔍 Buscar..."), { target: { value: "extintor" } });
    expect(screen.getByText("Extintor vencido")).toBeInTheDocument();
    expect(screen.queryByText("Etiqueta ilegible")).not.toBeInTheDocument();
  });

  it("elegir un item llama onElegir con descripción y severidad", () => {
    const onElegir = vi.fn();
    render(<SelectorHallazgoFrecuente items={ITEMS} cargando={false} onElegir={onElegir} onCerrar={vi.fn()} />);
    fireEvent.click(screen.getByText("Extintor vencido"));
    expect(onElegir).toHaveBeenCalledWith({ descripcion: "Extintor vencido", severidad: "CRITICA" });
  });

  it("clic en el botón de cerrar llama onCerrar", () => {
    const onCerrar = vi.fn();
    render(<SelectorHallazgoFrecuente items={ITEMS} cargando={false} onElegir={vi.fn()} onCerrar={onCerrar} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
