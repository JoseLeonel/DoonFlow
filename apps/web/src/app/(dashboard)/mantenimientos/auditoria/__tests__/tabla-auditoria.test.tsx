import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablaAuditoria } from "../_components/tabla-auditoria";
import type { RegistroAuditoria } from "../_servicios/auditoria.servicio";

const FILTROS_VACIOS = { usuarioId: "", accion: "", desde: "", hasta: "" };

function registro(parcial: Partial<RegistroAuditoria> = {}): RegistroAuditoria {
  return {
    id: "r1",
    empresaId: "e1",
    usuarioId: "u1",
    accion: "LOGIN",
    entidadTipo: "usuario",
    entidadId: "u1",
    valorAntes: null,
    valorDespues: null,
    ip: null,
    creadoEn: "2026-07-21T10:00:00.000Z",
    ...parcial,
  };
}

describe("TablaAuditoria", () => {
  it("no renderiza ningún botón de editar/eliminar por fila (append-only)", () => {
    render(<TablaAuditoria registros={[registro()]} cargando={false} filtros={FILTROS_VACIOS} onAplicarFiltros={vi.fn()} />);

    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  it("con lista vacía muestra 'No hay eventos registrados'", () => {
    render(<TablaAuditoria registros={[]} cargando={false} filtros={FILTROS_VACIOS} onAplicarFiltros={vi.fn()} />);
    expect(screen.getByText("No hay eventos registrados.")).toBeInTheDocument();
  });

  it("muestra 'Cargando...' mientras cargando es true", () => {
    render(<TablaAuditoria registros={[]} cargando={true} filtros={FILTROS_VACIOS} onAplicarFiltros={vi.fn()} />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("aplicar un filtro llama a onAplicarFiltros con los parámetros correctos", () => {
    const onAplicarFiltros = vi.fn();
    render(<TablaAuditoria registros={[]} cargando={false} filtros={FILTROS_VACIOS} onAplicarFiltros={onAplicarFiltros} />);

    fireEvent.change(screen.getByPlaceholderText("uuid del usuario"), { target: { value: "u9" } });
    fireEvent.click(screen.getByText("Filtrar"));

    expect(onAplicarFiltros).toHaveBeenCalledWith({ usuarioId: "u9", accion: "", desde: "", hasta: "" });
  });

  it("renderiza la acción y la entidad de cada registro", () => {
    render(
      <TablaAuditoria
        registros={[registro({ accion: "PERMISO_MODIFICADO", entidadTipo: "rol" })]}
        cargando={false}
        filtros={FILTROS_VACIOS}
        onAplicarFiltros={vi.fn()}
      />,
    );

    expect(screen.getByRole("cell", { name: "PERMISO_MODIFICADO" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "rol" })).toBeInTheDocument();
  });
});
