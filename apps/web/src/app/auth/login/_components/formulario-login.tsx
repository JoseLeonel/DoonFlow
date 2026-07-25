"use client";

import { Boton, Casilla, GrupoInput } from "@doonflow/ui";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useFormularioLogin } from "../_hooks/use-formulario-login";

/** Presentación pura: no llama a _servicios/ directamente, solo usa el hook de la página. */
export function FormularioLogin() {
  const { enviar, cargando, error } = useFormularioLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const sesionExpirada = useSearchParams().get("motivo") === "sesion_expirada";

  function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    enviar(email, password);
  }

  return (
    <form onSubmit={alEnviar}>
      {sesionExpirada && (
        <p className="mb-4 rounded-lg bg-yellow-light/[0.08] px-4 py-3 text-sm text-yellow-dark">
          Tu sesión expiró, inicia sesión de nuevo.
        </p>
      )}

      <GrupoInput
        type="email"
        label="Email"
        className="mb-4"
        placeholder="tu@empresa.com"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <GrupoInput
        type="password"
        label="Contraseña"
        className="mb-5"
        placeholder="Tu contraseña"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="mb-6 flex items-center justify-between gap-2 py-2 font-medium">
        <Casilla label="Recordarme" name="recordar" />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-light/[0.08] px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}

      <Boton type="submit" cargando={cargando}>
        Iniciar sesión
      </Boton>
    </form>
  );
}
