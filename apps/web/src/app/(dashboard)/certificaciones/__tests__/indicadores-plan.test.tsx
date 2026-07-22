import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IndicadoresPlan } from "../_components/indicadores-plan";

describe("IndicadoresPlan", () => {
  it("muestra total/pendientes/vencidas/% cumplimiento a partir de las props recibidas", () => {
    render(
      <IndicadoresPlan
        indicadores={{
          total: 3, pendientes: 1, enProceso: 1, enRevision: 0, cumplidas: 1,
          noCumplidas: 0, vencidas: 1, porcentajeCumplimiento: 33.33, proximasAVencer: 1,
        }}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("33.33%")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(3); // pendientes, vencidas, próximas a vencer
  });

  it("no recalcula: si las props cambian, muestra los nuevos valores sin lógica propia", () => {
    const { rerender } = render(
      <IndicadoresPlan
        indicadores={{
          total: 0, pendientes: 0, enProceso: 0, enRevision: 0, cumplidas: 0,
          noCumplidas: 0, vencidas: 0, porcentajeCumplimiento: 0, proximasAVencer: 0,
        }}
      />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(
      <IndicadoresPlan
        indicadores={{
          total: 5, pendientes: 2, enProceso: 1, enRevision: 1, cumplidas: 1,
          noCumplidas: 0, vencidas: 0, porcentajeCumplimiento: 20, proximasAVencer: 0,
        }}
      />,
    );
    expect(screen.getByText("20%")).toBeInTheDocument();
  });
});
