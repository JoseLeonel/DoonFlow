"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaginaVerificar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  const verificar = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.trim()) router.push(`/verificar/${codigo.trim()}`);
  };

  return (
    <form
      onSubmit={verificar}
      className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card"
    >
      <h1 className="mb-1 text-heading-6 font-bold text-dark dark:text-white">Verificar certificación</h1>
      <p className="mb-4 text-body-sm text-dark-4 dark:text-dark-6">
        Ingresa el código de verificación impreso en el certificado.
      </p>

      <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Código de verificación</label>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Ej. A1B2C3D4E5"
        className="mb-4 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm uppercase text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
      />

      <button
        type="submit"
        disabled={!codigo.trim()}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Verificar
      </button>
    </form>
  );
}
