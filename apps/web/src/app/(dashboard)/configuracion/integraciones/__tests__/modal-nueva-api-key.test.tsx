import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModalNuevaApiKey } from "../_components/modal-nueva-api-key";
import type { ApiKeyCreada } from "../_servicios/api-key.servicio";

const CREADA: ApiKeyCreada = {
  id: "k1", empresaId: "e1", nombre: "ERP Cliente XYZ", activa: true,
  ultimoUsoEn: null, creadoPorId: "u1", creadoEn: "2026-07-24T00:00:00.000Z",
  clave: "dnf_live_abc123",
};

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("ModalNuevaApiKey", () => {
  it("el botón Generar clave está deshabilitado sin nombre", () => {
    render(<ModalNuevaApiKey onGenerar={vi.fn()} onCerrar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Generar clave" })).toBeDisabled();
  });

  it("con nombre válido, llama onGenerar y luego muestra la clave en texto plano", async () => {
    const onGenerar = vi.fn().mockResolvedValue(CREADA);
    render(<ModalNuevaApiKey onGenerar={onGenerar} onCerrar={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Ej. ERP Cliente XYZ"), { target: { value: "ERP Cliente XYZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar clave" }));

    await waitFor(() => expect(screen.getByText("dnf_live_abc123")).toBeInTheDocument());
    expect(onGenerar).toHaveBeenCalledWith("ERP Cliente XYZ");
    expect(screen.getByText(/no se volverá a mostrar/i)).toBeInTheDocument();
  });

  it("el botón Copiar copia la clave al portapapeles", async () => {
    render(<ModalNuevaApiKey onGenerar={vi.fn().mockResolvedValue(CREADA)} onCerrar={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Ej. ERP Cliente XYZ"), { target: { value: "ERP Cliente XYZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar clave" }));
    await waitFor(() => expect(screen.getByText("dnf_live_abc123")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("dnf_live_abc123"));
  });

  it("Cancelar en el paso de formulario llama onCerrar", () => {
    const onCerrar = vi.fn();
    render(<ModalNuevaApiKey onGenerar={vi.fn()} onCerrar={onCerrar} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
