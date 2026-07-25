import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { ItemAtencion } from "@doonflow/shared";
import { TablaAtencionRequerida } from "../_components/tabla-atencion-requerida";

describe("TablaAtencionRequerida", () => {
  it("muestra el mensaje de vacío cuando no hay items", () => {
    render(<TablaAtencionRequerida items={[]} />);
    expect(screen.getByText("Nada requiere atención en este momento.")).toBeInTheDocument();
  });

  it("renderiza una certificación por vencer con sus días restantes", () => {
    const items: ItemAtencion[] = [
      { tipo: "certificacion_por_vencer", sucursal: "Sucursal Cartago", cliente: "Distribuidora Sur", diasRestantes: 5 },
    ];
    render(<TablaAtencionRequerida items={items} />);
    expect(screen.getByText("Certificación por vencer")).toBeInTheDocument();
    expect(screen.getByText("Sucursal Cartago — Distribuidora Sur")).toBeInTheDocument();
    expect(screen.getByText("5 día(s)")).toBeInTheDocument();
  });

  it("renderiza una acción vencida con su descripción y días vencida", () => {
    const items: ItemAtencion[] = [
      { tipo: "accion_vencida", sucursal: "Sucursal Heredia", cliente: "Agro Norte", descripcion: "Sustituir extintor", diasVencida: 3 },
    ];
    render(<TablaAtencionRequerida items={items} />);
    expect(screen.getByText('Acción vencida: "Sustituir extintor"')).toBeInTheDocument();
    expect(screen.getByText("3 día(s) vencida")).toBeInTheDocument();
  });
});
