import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PanelResolucionApelacion } from "../_components/panel-resolucion-apelacion";

function apelacion(estado: "ABIERTA" | "ACEPTADA" | "RECHAZADA" = "ABIERTA") {
  return {
    id: "a1", empresaId: "e1", inspeccionId: "c1", hallazgoId: "h1",
    tipo: "SOBRE_HALLAZGO" as const, motivo: "El extintor fue reemplazado el mismo día.",
    solicitadoPorId: "u1", solicitadoEn: "2026-07-01T00:00:00.000Z",
    estado, resueltoPorId: null, resueltoEn: null, resolucionComentario: null,
    solicitadoPorNombre: "Juan Pérez", inspeccionEtiqueta: "Planta Central — Julio 2026",
  };
}

describe("PanelResolucionApelacion", () => {
  it("los botones de resolución están deshabilitados sin justificación", () => {
    render(<PanelResolucionApelacion apelacion={apelacion()} guardando={false} error={null} onResolver={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Aceptar apelación" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rechazar apelación" })).toBeDisabled();
  });

  it("con justificación escrita, Aceptar llama onResolver con estado ACEPTADA", () => {
    const onResolver = vi.fn();
    render(<PanelResolucionApelacion apelacion={apelacion()} guardando={false} error={null} onResolver={onResolver} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Se verificó la evidencia." } });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar apelación" }));
    expect(onResolver).toHaveBeenCalledWith("ACEPTADA", "Se verificó la evidencia.");
  });

  it("cuando ya está resuelta, no muestra el formulario de resolución", () => {
    render(<PanelResolucionApelacion apelacion={apelacion("ACEPTADA")} guardando={false} error={null} onResolver={vi.fn()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
