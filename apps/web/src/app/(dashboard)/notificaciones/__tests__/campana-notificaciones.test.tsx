import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampanaNotificaciones } from "@doonflow/ui";

describe("CampanaNotificaciones", () => {
  it("el badge no se renderiza cuando contador === 0", () => {
    render(<CampanaNotificaciones contador={0} abierto={false} onToggle={vi.fn()} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("el badge muestra 9+ cuando contador > 9", () => {
    render(<CampanaNotificaciones contador={12} abierto={false} onToggle={vi.fn()} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("click en la campana llama onToggle", () => {
    const onToggle = vi.fn();
    render(<CampanaNotificaciones contador={0} abierto={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renderiza los children solo cuando abierto = true", () => {
    const { rerender } = render(
      <CampanaNotificaciones contador={0} abierto={false} onToggle={vi.fn()}><p>Dropdown</p></CampanaNotificaciones>,
    );
    expect(screen.queryByText("Dropdown")).not.toBeInTheDocument();

    rerender(<CampanaNotificaciones contador={0} abierto={true} onToggle={vi.fn()}><p>Dropdown</p></CampanaNotificaciones>);
    expect(screen.getByText("Dropdown")).toBeInTheDocument();
  });
});
