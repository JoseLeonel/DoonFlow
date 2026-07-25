import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PanelVerificacionAccion } from "../_components/panel-verificacion-accion";
import type { AccionCorrectiva } from "@doonflow/shared";

const accion: AccionCorrectiva = {
  id: "a1", planCumplimientoId: "plan1", hallazgoId: "h1", descripcion: "Sustituir el extintor",
  responsableId: "u1", responsableNombre: "Juan Pérez", fechaLimite: "2026-08-01",
  estado: "EN_REVISION", porcentajeAvance: 100, evidencias: [],
};

describe("PanelVerificacionAccion", () => {
  it("con comentario lleno, al marcar 'No cumplido' sin fecha nueva pide la fecha en vez de enviar datos inválidos", async () => {
    const onVerificar = vi.fn();
    render(<PanelVerificacionAccion accion={accion} onVerificar={onVerificar} />);

    fireEvent.change(screen.getByLabelText(/comentario de verificación/i), {
      target: { value: "No se corrigió correctamente." },
    });
    fireEvent.click(screen.getByRole("button", { name: /marcar no cumplido/i }));

    expect(onVerificar).not.toHaveBeenCalled();
    expect(await screen.findByText(/debe indicar la nueva fecha límite/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nueva fecha límite/i)).toBeInTheDocument();
  });

  it("con comentario y nueva fecha límite, marcar 'No cumplido' sí envía ambos datos", () => {
    const onVerificar = vi.fn();
    render(<PanelVerificacionAccion accion={accion} onVerificar={onVerificar} />);

    fireEvent.change(screen.getByLabelText(/comentario de verificación/i), {
      target: { value: "No se corrigió correctamente." },
    });
    fireEvent.click(screen.getByRole("button", { name: /marcar no cumplido/i }));
    fireEvent.change(screen.getByLabelText(/nueva fecha límite/i), { target: { value: "2026-09-30" } });
    fireEvent.click(screen.getByRole("button", { name: /marcar no cumplido/i }));

    expect(onVerificar).toHaveBeenCalledWith("NO_CUMPLIDO", "No se corrigió correctamente.", "2026-09-30");
  });

  it("marcar 'Cumplido' con comentario no requiere fecha nueva", () => {
    const onVerificar = vi.fn();
    render(<PanelVerificacionAccion accion={accion} onVerificar={onVerificar} />);

    fireEvent.change(screen.getByLabelText(/comentario de verificación/i), {
      target: { value: "Corregido, evidencia confirmada." },
    });
    fireEvent.click(screen.getByRole("button", { name: /marcar cumplido/i }));

    expect(onVerificar).toHaveBeenCalledWith("CUMPLIDO", "Corregido, evidencia confirmada.", undefined);
  });
});
