import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablaAprobaciones } from "../_components/tabla-aprobaciones";
import type { Plantilla } from "../../_servicios/inspeccion.servicio";

function plantilla(parcial: Partial<Plantilla> = {}): Plantilla {
  return {
    id: "pl1",
    empresaId: "e1",
    nombre: "Ficha BPM Planta Norte",
    tipo: "CALIDAD",
    activa: true,
    puntajeMaximo: 100,
    version: 1,
    creadoEn: "2026-07-01T00:00:00.000Z",
    actualizadoEn: "2026-07-01T00:00:00.000Z",
    estadoAprobacion: "EN_REVISION",
    solicitadoPorId: "u-1",
    solicitadoEn: "2026-07-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("TablaAprobaciones", () => {
  it("con lista vacía muestra el mensaje de 'no hay plantillas pendientes'", () => {
    render(<TablaAprobaciones pendientes={[]} cargando={false} procesandoId={null} onAprobar={vi.fn()} onRechazar={vi.fn()} />);
    expect(screen.getByText("No hay plantillas pendientes de aprobación.")).toBeInTheDocument();
  });

  it("muestra 'Cargando...' mientras cargando es true, sin importar pendientes", () => {
    render(<TablaAprobaciones pendientes={[]} cargando={true} procesandoId={null} onAprobar={vi.fn()} onRechazar={vi.fn()} />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("botón Aprobar llama a onAprobar con el id de la plantilla", () => {
    const onAprobar = vi.fn();
    render(
      <TablaAprobaciones
        pendientes={[plantilla({ id: "pl9" })]}
        cargando={false}
        procesandoId={null}
        onAprobar={onAprobar}
        onRechazar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Aprobar"));
    expect(onAprobar).toHaveBeenCalledWith("pl9");
  });

  it("el botón Rechazar de la fila abre el diálogo de rechazo con el nombre de la plantilla", () => {
    render(
      <TablaAprobaciones
        pendientes={[plantilla({ nombre: "Ficha BPM Planta Norte" })]}
        cargando={false}
        procesandoId={null}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Rechazar"));

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toBeInTheDocument();
    expect(dialogo).toHaveTextContent("Ficha BPM Planta Norte");
  });
});
