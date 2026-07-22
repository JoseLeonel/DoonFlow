import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormularioRetencion } from "../_components/formulario-retencion";
import type { PoliticaRetencion } from "../_servicios/retencion.servicio";

function politicas(): PoliticaRetencion[] {
  return [
    { id: "p1", empresaId: "e1", tipoDato: "EVIDENCIA", mesesRetencion: 24, accionAlVencer: "ANONIMIZAR", actualizadoEn: "2026-07-01T00:00:00.000Z" },
    { id: "p2", empresaId: "e1", tipoDato: "PDF_CERTIFICACION", mesesRetencion: 60, accionAlVencer: "ANONIMIZAR", actualizadoEn: "2026-07-01T00:00:00.000Z" },
    { id: "p3", empresaId: "e1", tipoDato: "DATO_PERSONAL_CONTACTO", mesesRetencion: 36, accionAlVencer: "ANONIMIZAR", actualizadoEn: "2026-07-01T00:00:00.000Z" },
  ];
}

describe("FormularioRetencion", () => {
  it("renderiza las 3 filas fijas", () => {
    render(
      <FormularioRetencion politicas={politicas()} cambios={new Map()} guardando={false} hayCambiosPendientes={false} onEditar={vi.fn()} onGuardar={vi.fn()} />,
    );

    expect(screen.getByText("Evidencia de certificación")).toBeInTheDocument();
    expect(screen.getByText("PDF de certificación")).toBeInTheDocument();
    expect(screen.getByText("Datos personales de contacto")).toBeInTheDocument();
  });

  it("el botón 'Guardar cambios' está deshabilitado sin cambios pendientes", () => {
    render(
      <FormularioRetencion politicas={politicas()} cambios={new Map()} guardando={false} hayCambiosPendientes={false} onEditar={vi.fn()} onGuardar={vi.fn()} />,
    );

    expect(screen.getByText("Guardar cambios")).toBeDisabled();
  });

  it("el botón 'Guardar cambios' se habilita con cambios pendientes y llama a onGuardar", () => {
    const onGuardar = vi.fn();
    const cambios = new Map([["EVIDENCIA" as const, { mesesRetencion: 30, accionAlVencer: "ELIMINAR" as const }]]);
    render(
      <FormularioRetencion politicas={politicas()} cambios={cambios} guardando={false} hayCambiosPendientes={true} onEditar={vi.fn()} onGuardar={onGuardar} />,
    );

    const boton = screen.getByText("Guardar cambios");
    expect(boton).not.toBeDisabled();
    fireEvent.click(boton);
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  it("muestra spinner mientras guardando es true", () => {
    render(
      <FormularioRetencion politicas={politicas()} cambios={new Map()} guardando={true} hayCambiosPendientes={true} onEditar={vi.fn()} onGuardar={vi.fn()} />,
    );

    expect(screen.getByText("Guardar cambios")).toBeDisabled();
  });

  it("editar el campo de meses llama a onEditar con el tipoDato y el valor nuevo", () => {
    const onEditar = vi.fn();
    render(
      <FormularioRetencion politicas={politicas()} cambios={new Map()} guardando={false} hayCambiosPendientes={false} onEditar={onEditar} onGuardar={vi.fn()} />,
    );

    const inputs = screen.getAllByDisplayValue("24");
    fireEvent.change(inputs[0]!, { target: { value: "30" } });

    expect(onEditar).toHaveBeenCalledWith("EVIDENCIA", "mesesRetencion", 30);
  });
});
