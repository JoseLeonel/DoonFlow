import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { PlanAuditoria } from "@doonflow/shared";
import { TarjetaPlanAuditoria } from "../_components/tarjeta-plan-auditoria";

const PLAN_BASE: PlanAuditoria = {
  id: "p1",
  sucursalId: "s1",
  fechaObjetivo: "2026-08-01T00:00:00.000Z",
  responsableSugeridoId: null,
  estado: "PROGRAMADA",
  inspeccionId: null,
  creadoEn: "2026-07-01T00:00:00.000Z",
  empresaId: "e1",
  sucursalNombre: "Sucursal Cartago",
  clienteNombre: "Distribuidora Sur S.A.",
  responsableSugeridoNombre: null,
};

describe("TarjetaPlanAuditoria", () => {
  it("muestra la sucursal y el responsable (o guion si no hay)", () => {
    render(<TarjetaPlanAuditoria plan={PLAN_BASE} onIniciarAhora={vi.fn()} />);
    expect(screen.getByText("Sucursal Cartago")).toBeInTheDocument();
    expect(screen.getByText(/Resp: —/)).toBeInTheDocument();
  });

  it("muestra el badge 'Programada' para estado PROGRAMADA", () => {
    render(<TarjetaPlanAuditoria plan={PLAN_BASE} onIniciarAhora={vi.fn()} />);
    expect(screen.getByText("● Programada")).toBeInTheDocument();
  });

  it("el botón 'Iniciar ahora' llama onIniciarAhora con el id del plan", () => {
    const onIniciarAhora = vi.fn();
    render(<TarjetaPlanAuditoria plan={PLAN_BASE} onIniciarAhora={onIniciarAhora} />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar ahora" }));
    expect(onIniciarAhora).toHaveBeenCalledWith("p1");
  });

  it("no muestra el botón 'Iniciar ahora' cuando el estado es EJECUTADA", () => {
    render(<TarjetaPlanAuditoria plan={{ ...PLAN_BASE, estado: "EJECUTADA" }} onIniciarAhora={vi.fn()} />);
    expect(screen.getByText("✓ Ejecutada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar ahora" })).not.toBeInTheDocument();
  });
});
