import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablaPlantillas } from "../_components/tabla-plantillas";
import type { Plantilla } from "../_servicios/inspeccion.servicio";

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
    estadoAprobacion: "BORRADOR",
    ...parcial,
  };
}

describe("TablaPlantillas", () => {
  it("con plantillas = [] muestra el mensaje de lista vacía", () => {
    render(<TablaPlantillas plantillas={[]} onToggleEstado={vi.fn()} onClonar={vi.fn()} />);
    expect(screen.getByText("No hay plantillas registradas aún.")).toBeInTheDocument();
  });

  it.each([
    ["BORRADOR", "Borrador"],
    ["EN_REVISION", "En revisión"],
    ["APROBADA", "Aprobada"],
    ["RECHAZADA", "Rechazada"],
  ] as const)("muestra el badge de estadoAprobacion=%s como '%s'", (estado, textoEsperado) => {
    render(
      <TablaPlantillas
        plantillas={[plantilla({ estadoAprobacion: estado })]}
        onToggleEstado={vi.fn()}
        onClonar={vi.fn()}
      />,
    );
    expect(screen.getByText(new RegExp(textoEsperado))).toBeInTheDocument();
  });

  it("el enlace 'Certificar' apunta a /certificaciones/nueva", () => {
    render(
      <TablaPlantillas plantillas={[plantilla()]} onToggleEstado={vi.fn()} onClonar={vi.fn()} />,
    );
    expect(screen.getByText("Certificar")).toHaveAttribute("href", "/certificaciones/nueva");
  });
});
