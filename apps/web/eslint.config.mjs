import nextConfig from "eslint-config-next";

/**
 * Flat config (ESLint 9 / Next 16) — reemplaza el .eslintrc.json legado.
 *
 * `react-hooks/set-state-in-effect` desactivada: marca el patrón universal de este proyecto
 * "cargar datos al montar vía efecto" (usado en ~19 hooks, documentado en CLAUDE.md → arquitectura
 * de _hooks/). La solución oficial de React (`useEffectEvent`, requiere React 19, ya instalado)
 * se probó explícitamente y NO satisface esta regla en eslint-plugin-react-hooks@7.1.1 — además
 * prohíbe devolver la función envuelta fuera del hook, lo que rompe el patrón `recargar()` que
 * usan los botones de "reintentar"/recarga manual en toda la app. No es un caso de pereza: se
 * verificó con una prueba real antes de desactivarla (ver memoria del proyecto, sprint 013).
 */
const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
