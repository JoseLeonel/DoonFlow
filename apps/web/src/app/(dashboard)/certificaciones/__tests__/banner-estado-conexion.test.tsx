import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BannerEstadoConexion } from "../_components/banner-estado-conexion";

describe("BannerEstadoConexion", () => {
  it("no renderiza nada si estado es null (nada que comunicar)", () => {
    const { container } = render(<BannerEstadoConexion estado={null} pendientes={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("estado DESCONECTADO renderiza 'Sin conexión — guardando localmente'", () => {
    render(<BannerEstadoConexion estado="DESCONECTADO" pendientes={2} />);
    expect(screen.getByText("Sin conexión — guardando localmente")).toBeInTheDocument();
  });

  it("estado SINCRONIZANDO renderiza 'Sincronizando...' con indicador de progreso", () => {
    render(<BannerEstadoConexion estado="SINCRONIZANDO" pendientes={0} />);
    expect(screen.getByText("Sincronizando...")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Sincronizando" })).toBeInTheDocument();
  });

  it("estado SINCRONIZADO renderiza 'Sincronizado'", () => {
    render(<BannerEstadoConexion estado="SINCRONIZADO" pendientes={0} />);
    expect(screen.getByText("Sincronizado")).toBeInTheDocument();
  });

  it("estado ERROR_PARCIAL renderiza mensaje de reintento en curso, no un error bloqueante", () => {
    render(<BannerEstadoConexion estado="ERROR_PARCIAL" pendientes={1} />);
    expect(screen.getByText("Reintentando sincronización...")).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it("muestra la advertencia de datos antiguos solo si alertaDatosAntiguos es true", () => {
    const { rerender } = render(<BannerEstadoConexion estado="ERROR_PARCIAL" pendientes={1} alertaDatosAntiguos={false} />);
    expect(screen.queryByText(/más de 24h/)).not.toBeInTheDocument();

    rerender(<BannerEstadoConexion estado="ERROR_PARCIAL" pendientes={1} alertaDatosAntiguos={true} />);
    expect(screen.getByText(/más de 24h/)).toBeInTheDocument();
  });
});
