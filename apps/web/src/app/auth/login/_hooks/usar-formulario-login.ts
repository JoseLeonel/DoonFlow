"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { iniciarSesion } from "../_servicios/auth.servicio";

/** Estado y orquestación del login. Los componentes solo leen lo que este hook expone. */
export function usarFormularioLogin() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(email: string, password: string) {
    setCargando(true);
    setError(null);

    const resultado = await iniciarSesion({ email, password });

    setCargando(false);

    if (!resultado.ok) {
      setError(resultado.mensajeError ?? "No se pudo iniciar sesión.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return { enviar, cargando, error };
}
