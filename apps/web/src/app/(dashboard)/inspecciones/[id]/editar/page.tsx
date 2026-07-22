"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb, Boton } from "@doonflow/ui";
import { GrupoInput } from "@doonflow/ui";
import type { Plantilla, TipoInspeccion } from "@doonflow/shared";
import { obtenerPlantillaCompleta, actualizarPlantilla } from "../../_servicios/inspeccion.servicio";

const TIPOS_INSPECCION: { value: TipoInspeccion; label: string }[] = [
  { value: "MINISTERIO_SALUD", label: "Ministerio de Salud" },
  { value: "AUDITORIA_INTERNA", label: "Auditoría interna" },
  { value: "CALIDAD", label: "Calidad" },
  { value: "SEGURIDAD_OCUPACIONAL", label: "Seguridad ocupacional" },
  { value: "SUPERVISION_OPERATIVA", label: "Supervisión operativa" },
  { value: "OTRO", label: "Otro" },
];

export default function PaginaEditarCabecera() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoInspeccion>("CALIDAD");
  const [puntajeMaximo, setPuntajeMaximo] = useState(100);
  const [fechaVigencia, setFechaVigencia] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    setCargando(true);
    obtenerPlantillaCompleta(id)
      .then((p) => {
        setPlantilla(p);
        setNombre(p.nombre);
        setTipo(p.tipo);
        setPuntajeMaximo(p.puntajeMaximo);
        setFechaVigencia(p.fechaVigencia ? p.fechaVigencia.split("T")[0]! : "");
        setDescripcion(p.descripcion ?? "");
        setObservaciones(p.observaciones ?? "");
      })
      .catch(() => setError("No se pudo cargar la plantilla."))
      .finally(() => setCargando(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setExito(false);
    try {
      await actualizarPlantilla(id, {
        nombre,
        tipo,
        puntajeMaximo,
        fechaVigencia: fechaVigencia || undefined,
        descripcion: descripcion || undefined,
        observaciones: observaciones || undefined,
      });
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
      </div>
    );
  }

  if (!plantilla) {
    return (
      <div className="p-8 text-center text-red">
        {error ?? "Plantilla no encontrada."}
      </div>
    );
  }

  const breadcrumb = [
    { label: "Inspecciones", href: "/inspecciones" },
    { label: plantilla.nombre, href: `/inspecciones/${id}` },
    { label: "Editar cabecera" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Breadcrumb segmentos={breadcrumb} className="mb-6" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
          <h1 className="font-bold text-dark dark:text-white">Editar cabecera</h1>
          <p className="mt-0.5 text-body-sm text-dark-4 dark:text-dark-6">
            Los cambios se aplican sin afectar la estructura de nodos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <GrupoInput
            label="Nombre de la plantilla"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <div>
            <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">
              Tipo de inspección <span className="text-red">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoInspeccion)}
              required
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-sm text-dark outline-none transition-colors focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            >
              {TIPOS_INSPECCION.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <GrupoInput
            label="Puntaje máximo"
            type="number"
            value={String(puntajeMaximo)}
            onChange={(e) => setPuntajeMaximo(Number(e.target.value))}
            required
          />

          <GrupoInput
            label="Fecha de vigencia (opcional)"
            type="date"
            value={fechaVigencia}
            onChange={(e) => setFechaVigencia(e.target.value)}
          />

          <div>
            <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-stroke bg-white px-4 py-3 text-sm text-dark outline-none transition-colors focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">
              Observaciones generales (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-stroke bg-white px-4 py-3 text-sm text-dark outline-none transition-colors focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-light/[0.08] px-4 py-3 text-body-sm text-red">{error}</p>
          )}
          {exito && (
            <p className="rounded-lg bg-green-light/[0.08] px-4 py-3 text-body-sm text-green">
              ✓ Cambios guardados correctamente.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Boton type="submit" variante="primario" cargando={guardando} className="flex-1 py-3">
              Guardar cambios
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              onClick={() => router.push(`/inspecciones/${id}`)}
              className="flex-1 py-3"
            >
              Cancelar
            </Boton>
          </div>
        </form>
      </div>
    </div>
  );
}
