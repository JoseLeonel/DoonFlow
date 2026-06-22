import doonflowPreset from "@doonflow/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [doonflowPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
