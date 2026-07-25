import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PanelEdicionNodo } from "../_components/panel-edicion-nodo";
import type { NodoArbol } from "@doonflow/shared";

function nodoPanel(parcial: Partial<NodoArbol> = {}): NodoArbol {
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

function nodoPregunta(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "p1",
    padreId: "s1",
    tipo: "PREGUNTA",
    codigo: "P1",
    titulo: "¿Cumple la normativa?",
    criterio: "Debe cumplir el artículo 5",
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
  abierto: true,
  guardando: false,
  error: null,
  onGuardar: vi.fn(),
  onCancelar: vi.fn(),
  onCambio: vi.fn(),
};

describe("PanelEdicionNodo", () => {
  it("no renderiza nada cuando abierto=false", () => {
    const { container } = render(
      <PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} abierto={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra 'Editar sección' en el título para un nodo PANEL", () => {
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} />);

    expect(screen.getByText("Editar sección")).toBeInTheDocument();
  });

  it("muestra 'Editar pregunta' en el título para un nodo PREGUNTA", () => {
    render(<PanelEdicionNodo nodo={nodoPregunta()} {...defaultProps} />);

    expect(screen.getByText("Editar pregunta")).toBeInTheDocument();
  });

  it("tiene role=dialog y aria-modal para accesibilidad", () => {
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} />);

    const panel = screen.getByRole("dialog");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute("aria-modal", "true");
  });

  it("pre-llena los campos del formulario con los datos del nodo", () => {
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} />);

    const inputCodigo = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    expect(inputCodigo.value).toBe("S1");
  });

  it("muestra los campos específicos de PREGUNTA: tipo respuesta, puntaje", () => {
    render(<PanelEdicionNodo nodo={nodoPregunta()} {...defaultProps} />);

    expect(screen.getByText("Tipo de respuesta")).toBeInTheDocument();
    expect(screen.getByText("Puntaje máximo")).toBeInTheDocument();
  });

  it("no muestra los campos de PREGUNTA para un nodo PANEL", () => {
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} />);

    expect(screen.queryByText("Tipo de respuesta")).toBeNull();
    expect(screen.queryByText("Puntaje máximo")).toBeNull();
  });

  it("llama onCancelar al hacer clic en el botón Cancelar", async () => {
    const onCancelar = vi.fn();
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} onCancelar={onCancelar} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("llama onCancelar al hacer clic en el botón ✕", async () => {
    const onCancelar = vi.fn();
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} onCancelar={onCancelar} />);

    await userEvent.click(screen.getByRole("button", { name: "Cerrar panel" }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("llama onGuardar con los datos del nodo al enviar el formulario", async () => {
    const onGuardar = vi.fn();
    render(
      <PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} onGuardar={onGuardar} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", tipo: "PANEL", codigo: "S1" }),
    );
  });

  it("muestra el mensaje de error cuando error no es null", () => {
    render(
      <PanelEdicionNodo
        nodo={nodoPanel()}
        {...defaultProps}
        error="Error de red al guardar."
      />,
    );

    expect(screen.getByText("Error de red al guardar.")).toBeInTheDocument();
  });

  it("llama onCambio al modificar un campo de entrada", async () => {
    const onCambio = vi.fn();
    render(<PanelEdicionNodo nodo={nodoPanel()} {...defaultProps} onCambio={onCambio} />);

    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0]!, "X");

    expect(onCambio).toHaveBeenCalled();
  });
});
