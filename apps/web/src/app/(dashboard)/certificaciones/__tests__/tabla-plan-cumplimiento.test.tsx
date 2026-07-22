import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablaPlanCumplimiento } from "../_components/tabla-plan-cumplimiento";
import type { AccionCorrectiva, Hallazgo } from "@doonflow/shared";

const hallazgos: Hallazgo[] = [
  { id: "h1", inspeccionId: "c1", descripcion: "Extintor vencido", severidad: "CRITICA", creadoEn: "2026-01-01", evidencias: [] },
];

const acciones: AccionCorrectiva[] = [
  {
    id: "a1", planCumplimientoId: "plan1", hallazgoId: "h1", descripcion: "Sustituir el extintor",
    responsableId: "u1", responsableNombre: "Juan Pérez", fechaLimite: "2026-08-01",
    estado: "EN_PROCESO", porcentajeAvance: 50, evidencias: [],
  },
];

describe("TablaPlanCumplimiento", () => {
  it("con acciones = [] muestra estado vacío", () => {
    render(<TablaPlanCumplimiento hallazgos={[]} acciones={[]} planCerrado={false} onAgregarAccion={vi.fn()} />);
    expect(screen.getByText(/no hay acciones correctivas/i)).toBeInTheDocument();
  });

  it("con acciones renderiza una fila por cada una con hallazgo, responsable, fecha límite, estado, avance y evidencias", () => {
    render(<TablaPlanCumplimiento hallazgos={hallazgos} acciones={acciones} planCerrado={false} onAgregarAccion={vi.fn()} />);

    expect(screen.getByText("Extintor vencido")).toBeInTheDocument();
    expect(screen.getByText("Sustituir el extintor")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("En proceso")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument(); // evidencias
  });
});
