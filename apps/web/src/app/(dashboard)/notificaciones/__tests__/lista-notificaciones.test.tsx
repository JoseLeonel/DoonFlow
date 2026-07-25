import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListaNotificaciones } from "../_components/lista-notificaciones";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function notificacion(overrides: Partial<{ referenciaTipo: "accion_correctiva" | "inspeccion" | "hallazgo"; leidaEn: string | null }> = {}) {
  return {
    id: "n1", usuarioId: "u1", tipo: "ACCION_ASIGNADA" as const,
    referenciaTipo: overrides.referenciaTipo ?? "accion_correctiva",
    referenciaId: "a1", mensaje: "Se te asignó la acción X",
    leidaEn: overrides.leidaEn === undefined ? null : overrides.leidaEn,
    enviadaPorCorreo: false, creadoEn: new Date().toISOString(), empresaId: "e1",
  };
}

describe("ListaNotificaciones", () => {
  it("con notificaciones = [] muestra 'No tienes notificaciones'", () => {
    render(<ListaNotificaciones notificaciones={[]} onMarcarLeida={vi.fn()} onMarcarTodasLeidas={vi.fn()} />);
    expect(screen.getByText("No tienes notificaciones")).toBeInTheDocument();
  });

  it("click en un ítem con referenciaTipo = accion_correctiva navega a la ruta esperada y llama marcarLeida", () => {
    const onMarcarLeida = vi.fn();
    render(
      <ListaNotificaciones
        notificaciones={[notificacion({ referenciaTipo: "accion_correctiva" })]}
        onMarcarLeida={onMarcarLeida}
        onMarcarTodasLeidas={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Se te asignó la acción X"));

    expect(onMarcarLeida).toHaveBeenCalledWith("n1");
    expect(push).toHaveBeenCalledWith("/certificaciones/seguimiento");
  });

  it("click en un ítem con referenciaTipo = inspeccion navega a /certificaciones/[id]/revision", () => {
    render(
      <ListaNotificaciones
        notificaciones={[notificacion({ referenciaTipo: "inspeccion" })]}
        onMarcarLeida={vi.fn()}
        onMarcarTodasLeidas={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Se te asignó la acción X"));
    expect(push).toHaveBeenCalledWith("/certificaciones/a1/revision");
  });

  it("una notificación ya leída no vuelve a llamar onMarcarLeida", () => {
    const onMarcarLeida = vi.fn();
    render(
      <ListaNotificaciones
        notificaciones={[notificacion({ leidaEn: new Date().toISOString() })]}
        onMarcarLeida={onMarcarLeida}
        onMarcarTodasLeidas={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Se te asignó la acción X"));
    expect(onMarcarLeida).not.toHaveBeenCalled();
  });
});
