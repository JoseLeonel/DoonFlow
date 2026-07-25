import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormularioHallazgoFrecuente } from "../_components/formulario-hallazgo-frecuente";

describe("FormularioHallazgoFrecuente", () => {
  it("renderiza los campos base con MENOR como severidad por defecto", () => {
    render(<FormularioHallazgoFrecuente onGuardar={vi.fn()} />);
    expect(screen.getByPlaceholderText("Ej. Extintor vencido")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("MENOR");
  });

  it("precarga los valores iniciales en modo edición", () => {
    render(
      <FormularioHallazgoFrecuente
        valoresIniciales={{ descripcionHallazgo: "Etiqueta ilegible", severidadSugerida: "MAYOR", descripcionAccionSugerida: "Reimprimir etiqueta" }}
        onGuardar={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Etiqueta ilegible")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("MAYOR");
    expect(screen.getByDisplayValue("Reimprimir etiqueta")).toBeInTheDocument();
  });

  it("el botón Guardar está deshabilitado sin descripción", () => {
    render(<FormularioHallazgoFrecuente onGuardar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("con datos válidos, envía los datos correctos a onGuardar (accion vacía -> null)", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioHallazgoFrecuente onGuardar={onGuardar} />);

    fireEvent.change(screen.getByPlaceholderText("Ej. Extintor vencido"), { target: { value: "Piso resbaloso" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "CRITICA" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onGuardar).toHaveBeenCalledWith({
      descripcionHallazgo: "Piso resbaloso",
      severidadSugerida: "CRITICA",
      descripcionAccionSugerida: null,
    });
  });
});
