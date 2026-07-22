import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModalImportarExcel } from "../modal-importar-excel";

const propsBase = {
  abierto: true,
  tipo: "CLIENTE" as const,
  estado: "INACTIVO" as const,
  archivo: null,
  preview: null,
  lote: null,
  error: null,
  resumen: null,
  puedeConfirmar: false,
  onCerrar: vi.fn(),
  onDescargarPlantilla: vi.fn(),
  onSeleccionarArchivo: vi.fn(),
  onPrevisualizar: vi.fn(),
  onVolver: vi.fn(),
  onConfirmar: vi.fn(),
  onDescargarErrores: vi.fn(),
};

describe("ModalImportarExcel", () => {
  it("no renderiza nada cuando abierto=false", () => {
    render(<ModalImportarExcel {...propsBase} abierto={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el botón 'Descargar plantilla' llama onDescargarPlantilla", () => {
    const onDescargarPlantilla = vi.fn();
    render(<ModalImportarExcel {...propsBase} onDescargarPlantilla={onDescargarPlantilla} />);

    fireEvent.click(screen.getByText("⬇ Descargar plantilla"));

    expect(onDescargarPlantilla).toHaveBeenCalledTimes(1);
  });

  it("tras previsualizar, muestra el conteo de filas válidas y con error", () => {
    render(
      <ModalImportarExcel
        {...propsBase}
        estado="PREVISUALIZADO"
        resumen={{ totalFilas: 3, filasValidas: 2, filasConError: 1 }}
        preview={{ totalFilas: 3, filasValidas: [{}, {}], filasConError: [{ fila: 4, datos: {}, error: "correo inválido" }] }}
      />,
    );

    expect(screen.getByText("✓ 2 filas listas para importar")).toBeInTheDocument();
    expect(screen.getByText("⚠ 1 filas con error")).toBeInTheDocument();
    expect(screen.getByText(/Fila 4/)).toBeInTheDocument();
  });

  it("el botón 'Confirmar importación' está deshabilitado si puedeConfirmar es false", () => {
    render(
      <ModalImportarExcel
        {...propsBase}
        estado="PREVISUALIZADO"
        puedeConfirmar={false}
        resumen={{ totalFilas: 1, filasValidas: 0, filasConError: 1 }}
      />,
    );

    expect(screen.getByText("Confirmar importación")).toBeDisabled();
  });

  it("el botón 'Descargar detalle de errores' solo aparece si filasConError > 0", () => {
    const { rerender } = render(
      <ModalImportarExcel {...propsBase} estado="COMPLETADO" lote={{ id: "l1", filasExitosas: 3, filasConError: 0 } as any} />,
    );
    expect(screen.queryByText("⬇ Descargar detalle de errores")).not.toBeInTheDocument();

    rerender(
      <ModalImportarExcel {...propsBase} estado="COMPLETADO" lote={{ id: "l1", filasExitosas: 2, filasConError: 1 } as any} />,
    );
    expect(screen.getByText("⬇ Descargar detalle de errores")).toBeInTheDocument();
  });
});
