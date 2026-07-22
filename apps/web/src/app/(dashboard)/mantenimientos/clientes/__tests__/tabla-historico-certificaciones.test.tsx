import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TablaHistoricoCertificaciones } from "../_components/tabla-historico-certificaciones";
import type { RegistroCertificacion } from "../_servicios/sucursal.servicio";

function registro(parcial: Partial<RegistroCertificacion> = {}): RegistroCertificacion {
  return {
    fecha: "2026-06-15T00:00:00.000Z",
    plantillaNombre: "Ficha BPM — Ministerio de Salud Costa Rica",
    puntajeObtenido: 92,
    puntajeMaximo: 100,
    clasificacion: "Excelente",
    ...parcial,
  };
}

describe("TablaHistoricoCertificaciones", () => {
  it("muestra el texto de estado vacío cuando registros = []", () => {
    render(<TablaHistoricoCertificaciones registros={[]} />);
    expect(screen.getByText("Esta sucursal no tiene inspecciones registradas.")).toBeInTheDocument();
  });

  it("renderiza filas ordenadas por fecha descendente (orden recibido, sin reordenar)", () => {
    render(
      <TablaHistoricoCertificaciones
        registros={[
          registro({ fecha: "2026-06-15T00:00:00.000Z", clasificacion: "Excelente" }),
          registro({ fecha: "2026-03-10T00:00:00.000Z", clasificacion: "Aceptable" }),
        ]}
      />,
    );

    const filas = screen.getAllByRole("row").slice(1); // omite la fila de encabezado
    expect(filas[0]).toHaveTextContent("Excelente");
    expect(filas[1]).toHaveTextContent("Aceptable");
  });

  it("cada fila muestra plantilla, puntaje obtenido/máximo y clasificación", () => {
    render(<TablaHistoricoCertificaciones registros={[registro()]} />);

    expect(screen.getByText("Ficha BPM — Ministerio de Salud Costa Rica")).toBeInTheDocument();
    expect(screen.getByText("92 / 100")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();
  });
});
