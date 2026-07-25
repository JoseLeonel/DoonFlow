import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TablaFicha } from "../_components/tabla-ficha";
import type { NodoArbol } from "@doonflow/shared";

function panel(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "s1",
    padreId: null,
    tipo: "PANEL",
    codigo: "S1",
    titulo: "Sección de higiene",
    orden: 0,
    nivel: 0,
    activo: true,
    puntajeMaximo: 0,
    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 0,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

function pregunta(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "p1",
    padreId: "s1",
    tipo: "PREGUNTA",
    codigo: "P1",
    titulo: "¿Cumple la normativa?",
    orden: 0,
    nivel: 1,
    activo: true,
    tipoRespuesta: "SI_NO",
    modalidadPuntaje: "FIJO",
    puntajeMaximo: 10,
    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 5,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

const defaultProps = {
  modoEdicion: false,
  seccionesColapsadas: new Set<string>(),
  onToggleColapso: vi.fn(),
  onExpandirTodo: vi.fn(),
  onContraerTodo: vi.fn(),
  onEditar: vi.fn(),
  onAgregarHijo: vi.fn(),
  onAgregarSeccion: vi.fn(),
  onSubir: vi.fn(),
  onBajar: vi.fn(),
  onEliminar: vi.fn(),
  onActualizarPuntaje: vi.fn().mockResolvedValue(undefined),
};

describe("TablaFicha", () => {
  it("muestra estado vacío cuando no hay nodos", () => {
    render(<TablaFicha nodos={[]} {...defaultProps} />);

    expect(screen.getByText(/no tiene secciones/i)).toBeInTheDocument();
  });

  it("no muestra el CTA 'Agregar primera sección' en modo lectura con nodos vacíos", () => {
    render(<TablaFicha nodos={[]} {...defaultProps} modoEdicion={false} />);

    expect(screen.queryByText(/Agregar primera sección/i)).toBeNull();
  });

  it("muestra el CTA en estado vacío cuando modoEdicion=true", () => {
    render(<TablaFicha nodos={[]} {...defaultProps} modoEdicion />);

    expect(screen.getByText(/Agregar primera sección/i)).toBeInTheDocument();
  });

  it("llama onAgregarSeccion al hacer clic en el CTA del estado vacío", async () => {
    const onAgregarSeccion = vi.fn();
    render(<TablaFicha nodos={[]} {...defaultProps} modoEdicion onAgregarSeccion={onAgregarSeccion} />);

    await userEvent.click(screen.getByText(/Agregar primera sección/i));

    expect(onAgregarSeccion).toHaveBeenCalledTimes(1);
  });

  it("renderiza los headers de la tabla cuando hay nodos", () => {
    render(<TablaFicha nodos={[panel()]} {...defaultProps} />);

    expect(screen.getByText(/Aspecto/i)).toBeInTheDocument();
    expect(screen.getByText(/Criterio/i)).toBeInTheDocument();
    expect(screen.getByText(/Puntos/i)).toBeInTheDocument();
  });

  it("renderiza el título de la sección PANEL", () => {
    render(<TablaFicha nodos={[panel()]} {...defaultProps} />);

    expect(screen.getByText("Sección de higiene")).toBeInTheDocument();
  });

  it("renderiza las preguntas anidadas cuando la sección está expandida", () => {
    const seccion = panel({
      hijos: [pregunta()],
    });

    render(
      <TablaFicha
        nodos={[seccion]}
        {...defaultProps}
        seccionesColapsadas={new Set()}
      />,
    );

    expect(screen.getByText("¿Cumple la normativa?")).toBeInTheDocument();
  });

  it("oculta las preguntas cuando la sección está colapsada", () => {
    const seccion = panel({ id: "s1", hijos: [pregunta()] });

    render(
      <TablaFicha
        nodos={[seccion]}
        {...defaultProps}
        seccionesColapsadas={new Set(["s1"])}
      />,
    );

    expect(screen.queryByText("¿Cumple la normativa?")).toBeNull();
  });

  it("muestra el botón 'Agregar sección' al pie en modo edición", () => {
    render(<TablaFicha nodos={[panel()]} {...defaultProps} modoEdicion />);

    expect(screen.getByText(/Agregar sección/i)).toBeInTheDocument();
  });

  it("oculta el botón 'Agregar sección' en modo lectura", () => {
    render(<TablaFicha nodos={[panel()]} {...defaultProps} modoEdicion={false} />);

    expect(screen.queryByText(/Agregar sección/i)).toBeNull();
  });
});
