import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TablaApelaciones } from "../_components/tabla-apelaciones";

function apelacion(overrides: Partial<{ id: string; solicitadoEn: string; motivo: string }> = {}) {
  return {
    id: overrides.id ?? "a1", empresaId: "e1", inspeccionId: "c1", hallazgoId: null,
    tipo: "SOBRE_RESULTADO" as const, motivo: overrides.motivo ?? "Motivo",
    solicitadoPorId: "u1", solicitadoEn: overrides.solicitadoEn ?? "2026-07-01T00:00:00.000Z",
    estado: "ABIERTA" as const, resueltoPorId: null, resueltoEn: null, resolucionComentario: null,
    solicitadoPorNombre: "Juan Pérez", inspeccionEtiqueta: "Planta Central — Julio 2026",
  };
}

describe("TablaApelaciones", () => {
  it("con apelaciones = [] muestra estado vacío", () => {
    render(<TablaApelaciones apelaciones={[]} />);
    expect(screen.getByText("No hay apelaciones abiertas.")).toBeInTheDocument();
  });

  it("renderiza filas ordenadas por antigüedad (la más antigua primero, según el orden recibido)", () => {
    const antigua = apelacion({ id: "a1", solicitadoEn: "2026-07-01T00:00:00.000Z", motivo: "Más antigua" });
    const reciente = apelacion({ id: "a2", solicitadoEn: "2026-07-10T00:00:00.000Z", motivo: "Más reciente" });
    render(<TablaApelaciones apelaciones={[antigua, reciente]} />);

    const filas = screen.getAllByRole("row").slice(1); // sin la fila de encabezado
    expect(filas[0]).toHaveTextContent("Planta Central — Julio 2026");
    expect(filas[0]).toHaveTextContent("Juan Pérez");
  });
});
