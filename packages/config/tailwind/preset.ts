import type { Config } from "tailwindcss";

/**
 * Preset de Tailwind compartido por DoonFlow.
 * Estructura de tokens portada de la plantilla `nextjs-admin-dashboard-main`
 * (ver CLAUDE.md → "Sistema de diseño"), con paleta adaptada a la identidad
 * de DoonFlow. apps/web la consume como `presets: [doonflowPreset]`.
 */
const doonflowPreset: Pick<Config, "darkMode" | "theme"> = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        current: "currentColor",
        transparent: "transparent",
        white: "#FFFFFF",
        primary: "#2F9E44", // verde agro — identidad DoonFlow
        stroke: "#E6EBF1",
        "stroke-dark": "#27303E",
        dark: {
          DEFAULT: "#111928",
          2: "#1F2A37",
          3: "#374151",
          4: "#4B5563",
          5: "#6B7280",
          6: "#9CA3AF",
          7: "#D1D5DB",
          8: "#E5E7EB",
        },
        gray: {
          DEFAULT: "#EFF4FB",
          dark: "#122031",
          1: "#F9FAFB",
          2: "#F3F4F6",
          3: "#E5E7EB",
          4: "#D1D5DB",
          5: "#9CA3AF",
          6: "#6B7280",
          7: "#374151",
        },
        green: {
          DEFAULT: "#22AD5C",
          dark: "#1A8245",
          light: { DEFAULT: "#2CD673", 1: "#10B981" },
        },
        red: {
          DEFAULT: "#F23030",
          dark: "#E10E0E",
          light: { DEFAULT: "#F56060" },
        },
        yellow: {
          dark: { DEFAULT: "#F59E0B" },
          light: { DEFAULT: "#FCD34D" },
        },
      },
      fontSize: {
        "heading-1": ["60px", "72px"],
        "heading-2": ["48px", "58px"],
        "heading-3": ["40px", "48px"],
        "heading-4": ["35px", "45px"],
        "heading-5": ["28px", "40px"],
        "heading-6": ["24px", "30px"],
        "body-2xlg": ["22px", "28px"],
        "body-sm": ["14px", "22px"],
        "body-xs": ["12px", "20px"],
      },
      spacing: {
        4.5: "1.125rem",
        7.5: "1.875rem",
        12.5: "3.125rem",
        15: "3.75rem",
      },
      boxShadow: {
        card: "0px 1px 2px 0px rgba(0, 0, 0, 0.12)",
        1: "0px 1px 2px 0px rgba(84, 87, 118, 0.12)",
        2: "0px 2px 3px 0px rgba(84, 87, 118, 0.15)",
      },
    },
  },
};

export default doonflowPreset;
