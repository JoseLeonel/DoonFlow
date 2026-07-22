import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GaleriaEvidencias } from "../_components/galeria-evidencias";
import type { EvidenciaConsolidada } from "@doonflow/shared";

const evidencias: EvidenciaConsolidada[] = [
  { id: "e1", origen: "RESPUESTA", tipo: "image/png", url: "http://x/foto.png", nombre: "foto.png", creadoEn: "2026-01-01" },
  { id: "e2", origen: "HALLAZGO", tipo: "application/pdf", url: "http://x/doc.pdf", nombre: "doc.pdf", creadoEn: "2026-01-02" },
  { id: "e3", origen: "ACCION_CORRECTIVA", tipo: "image/jpeg", url: "http://x/avance.jpg", nombre: "avance.jpg", creadoEn: "2026-01-03" },
];

describe("GaleriaEvidencias", () => {
  it("muestra un estado vacío sin evidencias", () => {
    render(<GaleriaEvidencias evidencias={[]} />);
    expect(screen.getByText(/no hay evidencias/i)).toBeInTheDocument();
  });

  it("agrupa por origen (respuesta/hallazgo/acción)", () => {
    render(<GaleriaEvidencias evidencias={evidencias} />);
    expect(screen.getByText("Respuestas")).toBeInTheDocument();
    expect(screen.getByText("Hallazgos")).toBeInTheDocument();
    expect(screen.getByText("Acciones correctivas")).toBeInTheDocument();
  });

  it("muestra ícono distinto para foto vs. documento", () => {
    render(<GaleriaEvidencias evidencias={evidencias} />);
    expect(screen.getByText("foto.png").previousSibling).toHaveTextContent("🖼️");
    expect(screen.getByText("doc.pdf").previousSibling).toHaveTextContent("📄");
  });
});
