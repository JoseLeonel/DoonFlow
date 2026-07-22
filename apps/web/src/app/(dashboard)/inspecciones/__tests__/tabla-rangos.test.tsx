import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TablaRangos } from "../_components/tabla-rangos";
import type { RangoResultado } from "@doonflow/shared";

function rango(parcial: Partial<RangoResultado> = {}): RangoResultado {
  return {
    id: "r1",
    desde: 0,
    hasta: 59,
    clasificacion: "Reprobado",
    color: "red",
    orden: 0,
    ...parcial,
  };
}

describe("TablaRangos", () => {
  it("muestra estado vacío cuando no hay rangos", () => {
    render(<TablaRangos rangos={[]} onGuardar={vi.fn()} />);

    expect(screen.getByText(/Sin rangos definidos/i)).toBeInTheDocument();
  });

  it("renderiza los rangos existentes", () => {
    render(
      <TablaRangos
        rangos={[
          rango({ id: "r1", clasificacion: "Reprobado", desde: 0,  hasta: 59 }),
          rango({ id: "r2", clasificacion: "Aprobado",  desde: 60, hasta: 100, color: "green", orden: 1 }),
        ]}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Reprobado")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Aprobado")).toBeInTheDocument();
  });

  it("permite agregar un rango nuevo al hacer clic en '+ Agregar rango'", async () => {
    render(<TablaRangos rangos={[rango()]} onGuardar={vi.fn()} />);

    await userEvent.click(screen.getByText("+ Agregar rango"));

    expect(screen.getByDisplayValue("Nueva clasificación")).toBeInTheDocument();
  });

  it("permite eliminar un rango existente", async () => {
    render(
      <TablaRangos
        rangos={[rango({ clasificacion: "Borrable" })]}
        onGuardar={vi.fn()}
      />,
    );

    const btnEliminar = screen.getByRole("button", { name: /Eliminar rango Borrable/i });
    await userEvent.click(btnEliminar);

    expect(screen.queryByDisplayValue("Borrable")).toBeNull();
  });

  it("muestra error de validación cuando los rangos se solapan", async () => {
    render(
      <TablaRangos
        rangos={[
          rango({ id: "r1", desde: 0,  hasta: 70,  clasificacion: "A", orden: 0 }),
          rango({ id: "r2", desde: 60, hasta: 100, clasificacion: "B", color: "green", orden: 1 }),
        ]}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByText(/solapan/i)).toBeInTheDocument();
  });

  it("el botón 'Guardar rangos' está deshabilitado cuando hay error de validación", () => {
    render(
      <TablaRangos
        rangos={[
          rango({ id: "r1", desde: 0,  hasta: 70,  clasificacion: "A", orden: 0 }),
          rango({ id: "r2", desde: 60, hasta: 100, clasificacion: "B", color: "green", orden: 1 }),
        ]}
        onGuardar={vi.fn()}
      />,
    );

    const btnGuardar = screen.getByRole("button", { name: "Guardar rangos" });
    expect(btnGuardar).toBeDisabled();
  });

  it("llama onGuardar con los rangos actualizados cuando no hay errores", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);

    render(
      <TablaRangos
        rangos={[
          rango({ id: "r1", desde: 0, hasta: 59, clasificacion: "Reprobado", orden: 0 }),
          rango({ id: "r2", desde: 60, hasta: 100, clasificacion: "Aprobado", color: "green", orden: 1 }),
        ]}
        onGuardar={onGuardar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Guardar rangos" }));

    await waitFor(() => {
      expect(onGuardar).toHaveBeenCalledTimes(1);
    });

    const [llamadaRangos] = onGuardar.mock.calls[0] as [Omit<RangoResultado, "id">[]];
    expect(llamadaRangos).toHaveLength(2);
    expect(llamadaRangos[0]).toMatchObject({ clasificacion: "Reprobado" });
    expect(llamadaRangos[1]).toMatchObject({ clasificacion: "Aprobado" });
  });

  it("muestra error de guardado cuando onGuardar rechaza la promesa", async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error("Error de servidor"));

    render(
      <TablaRangos
        rangos={[rango()]}
        onGuardar={onGuardar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Guardar rangos" }));

    await waitFor(() => {
      expect(screen.getByText("Error de servidor")).toBeInTheDocument();
    });
  });
});
