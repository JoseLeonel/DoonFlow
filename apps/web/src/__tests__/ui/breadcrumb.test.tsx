import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Breadcrumb } from "@doonflow/ui";

describe("Breadcrumb", () => {
  it("renderiza todos los segmentos", () => {
    render(
      <Breadcrumb
        segmentos={[
          { label: "Inicio", href: "/" },
          { label: "Inspecciones", href: "/inspecciones" },
          { label: "Ficha" },
        ]}
      />,
    );

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Inspecciones")).toBeInTheDocument();
    expect(screen.getByText("Ficha")).toBeInTheDocument();
  });

  it("el último segmento tiene aria-current='page'", () => {
    render(
      <Breadcrumb
        segmentos={[
          { label: "Inicio", href: "/" },
          { label: "Ficha" },
        ]}
      />,
    );

    const actual = screen.getByText("Ficha");
    expect(actual).toHaveAttribute("aria-current", "page");
  });

  it("los segmentos intermedios con href renderizan como enlaces", () => {
    render(
      <Breadcrumb
        segmentos={[
          { label: "Inicio", href: "/" },
          { label: "Inspecciones", href: "/inspecciones" },
          { label: "Estructura" },
        ]}
      />,
    );

    const enlaceInicio = screen.getByRole("link", { name: "Inicio" });
    expect(enlaceInicio).toHaveAttribute("href", "/");

    const enlaceInsp = screen.getByRole("link", { name: "Inspecciones" });
    expect(enlaceInsp).toHaveAttribute("href", "/inspecciones");
  });

  it("el último segmento NO renderiza como enlace aunque tenga href", () => {
    render(
      <Breadcrumb
        segmentos={[
          { label: "Único", href: "/ruta" },
        ]}
      />,
    );

    const enlace = screen.queryByRole("link", { name: "Único" });
    expect(enlace).toBeNull();
    expect(screen.getByText("Único")).toBeInTheDocument();
  });

  it("tiene navegación accesible con aria-label", () => {
    render(
      <Breadcrumb segmentos={[{ label: "Página" }]} />,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("muestra separadores '/' entre segmentos", () => {
    render(
      <Breadcrumb
        segmentos={[
          { label: "A", href: "/a" },
          { label: "B" },
        ]}
      />,
    );

    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("con un único segmento no muestra separadores", () => {
    render(<Breadcrumb segmentos={[{ label: "Solo" }]} />);

    expect(screen.queryByText("/")).toBeNull();
  });
});
