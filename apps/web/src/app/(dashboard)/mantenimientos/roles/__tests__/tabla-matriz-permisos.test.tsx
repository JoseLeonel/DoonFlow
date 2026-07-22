import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablaMatrizPermisos } from "../_components/tabla-matriz-permisos";
import type { MatrizPermisos } from "../_servicios/permisos.servicio";

function matriz(parcial: Partial<MatrizPermisos> = {}): MatrizPermisos {
  return {
    permisos: [
      { id: "p1", codigo: "plantillas.enviar_revision", descripcion: null },
      { id: "p2", codigo: "plantillas.aprobar", descripcion: null },
      { id: "p3", codigo: "permisos.administrar", descripcion: null },
    ],
    roles: [
      { id: "r-admin", nombre: "administrador", editable: false, permisoIds: ["p1", "p2", "p3"] },
      { id: "r-auditor", nombre: "auditor", editable: true, permisoIds: ["p2"] },
    ],
    ...parcial,
  };
}

describe("TablaMatrizPermisos", () => {
  it("la fila del rol administrador muestra checkboxes marcados y deshabilitados", () => {
    render(<TablaMatrizPermisos matriz={matriz()} onToggle={vi.fn()} />);

    const fila = screen.getByText("Administrador general").closest("tr")!;
    const checkboxes = fila.querySelectorAll("input[type=checkbox]");
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach((cb) => {
      expect(cb).toBeChecked();
      expect(cb).toBeDisabled();
    });
  });

  it("togglear un checkbox de un rol editable llama a onToggle con rolId y permisoId", () => {
    const onToggle = vi.fn();
    render(<TablaMatrizPermisos matriz={matriz()} onToggle={onToggle} />);

    const fila = screen.getByText("Auditor").closest("tr")!;
    const checkboxes = fila.querySelectorAll("input[type=checkbox]");
    fireEvent.click(checkboxes[0]!);

    expect(onToggle).toHaveBeenCalledWith("r-auditor", "p1");
  });

  it("el checkbox de un rol editable no está deshabilitado", () => {
    render(<TablaMatrizPermisos matriz={matriz()} onToggle={vi.fn()} />);

    const fila = screen.getByText("Auditor").closest("tr")!;
    const checkboxes = fila.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach((cb) => expect(cb).not.toBeDisabled());
  });
});
