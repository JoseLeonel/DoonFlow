import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DoonFlow",
  description: "Plataforma agroalimentaria DoonFlow",
};

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
