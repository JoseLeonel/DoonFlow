import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ApiKey } from "@doonflow/shared";
import { TablaApiKeys } from "../_components/tabla-api-keys";

const KEYS: ApiKey[] = [
  { id: "k1", empresaId: "e1", nombre: "ERP Cliente XYZ", activa: true, ultimoUsoEn: "2026-07-24T10:00:00.000Z", creadoPorId: "u1", creadoEn: "2026-07-24T00:00:00.000Z" },
  { id: "k2", empresaId: "e1", nombre: "Sistema viejo", activa: false, ultimoUsoEn: null, creadoPorId: "u1", creadoEn: "2026-06-01T00:00:00.000Z" },
];

describe("TablaApiKeys", () => {
  it("muestra el estado de carga", () => {
    render(<TablaApiKeys apiKeys={[]} cargando={true} onSolicitarRevocar={vi.fn()} />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("muestra el estado vacío", () => {
    render(<TablaApiKeys apiKeys={[]} cargando={false} onSolicitarRevocar={vi.fn()} />);
    expect(screen.getByText("No hay claves de API generadas.")).toBeInTheDocument();
  });

  it("renderiza una fila por clave con nombre, estado y último uso", () => {
    render(<TablaApiKeys apiKeys={KEYS} cargando={false} onSolicitarRevocar={vi.fn()} />);
    expect(screen.getByText("ERP Cliente XYZ")).toBeInTheDocument();
    expect(screen.getByText("Sistema viejo")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Revocada")).toBeInTheDocument();
    expect(screen.getByText("Nunca")).toBeInTheDocument();
  });

  it("el botón Revocar solo aparece en claves activas y llama onSolicitarRevocar con id y nombre", () => {
    const onSolicitarRevocar = vi.fn();
    render(<TablaApiKeys apiKeys={KEYS} cargando={false} onSolicitarRevocar={onSolicitarRevocar} />);
    const botones = screen.getAllByRole("button", { name: "Revocar" });
    expect(botones).toHaveLength(1);
    fireEvent.click(botones[0]!);
    expect(onSolicitarRevocar).toHaveBeenCalledWith("k1", "ERP Cliente XYZ");
  });
});
