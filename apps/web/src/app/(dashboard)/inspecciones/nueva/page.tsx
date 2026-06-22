"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton, GrupoInput } from "@doonflow/ui";

const TIPOS = [
  { valor: "MINISTERIO_SALUD",     etiqueta: "Ministerio de Salud" },
  { valor: "AUDITORIA_INTERNA",    etiqueta: "Auditoría interna" },
  { valor: "CALIDAD",              etiqueta: "Calidad" },
  { valor: "SEGURIDAD_OCUPACIONAL",etiqueta: "Seguridad ocupacional" },
  { valor: "SUPERVISION_OPERATIVA",etiqueta: "Supervisión operativa" },
  { valor: "OTRO",                 etiqueta: "Otro" },
];

export default function PaginaNuevaPlantilla() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "", descripcion: "", tipo: "MINISTERIO_SALUD", puntajeMaximo: 100, observaciones: "",
  });

  const set = (campo: string, valor: string | number) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true); setError(null);
    const res = await fetch("/api/inspeccion/plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setCargando(false);
    if (!res.ok) { setError(json?.error?.mensaje ?? "Error"); return; }
    router.push(`/inspecciones/${json.data.id}`);
  };

  return (
    <div className="p-6 md:p-7.5">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-6 text-heading-6 font-bold text-dark dark:text-white">
          Nueva plantilla de inspección
        </h1>

        <form onSubmit={enviar} className="space-y-5">
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card space-y-5">
            <GrupoInput label="Nombre de la plantilla" name="nombre" required
              value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Inspección Ministerio de Salud 2026" />

            <div>
              <label className="mb-1.5 block font-medium text-dark dark:text-white">
                Tipo de inspección
              </label>
              <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
            </div>

            <GrupoInput label="Puntaje máximo" name="puntajeMaximo" type="number"
              value={String(form.puntajeMaximo)} onChange={(e) => set("puntajeMaximo", Number(e.target.value))}
              placeholder="100" />

            <div>
              <label className="mb-1.5 block font-medium text-dark dark:text-white">Descripción</label>
              <textarea rows={3} value={form.descripcion}
                onChange={(e) => set("descripcion", e.target.value)}
                placeholder="Descripción breve de la plantilla..."
                className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white resize-none" />
            </div>

            <div>
              <label className="mb-1.5 block font-medium text-dark dark:text-white">Observaciones generales</label>
              <textarea rows={2} value={form.observaciones}
                onChange={(e) => set("observaciones", e.target.value)}
                placeholder="Instrucciones generales para el inspector..."
                className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white resize-none" />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-light/[0.08] px-4 py-3 text-sm text-red">{error}</p>}

          <div className="flex gap-3">
            <Boton type="submit" cargando={cargando}>Crear plantilla</Boton>
            <Boton type="button" variante="secundario" onClick={() => router.push("/inspecciones")}>
              Cancelar
            </Boton>
          </div>
        </form>
      </div>
    </div>
  );
}
