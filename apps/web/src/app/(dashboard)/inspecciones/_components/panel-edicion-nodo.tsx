"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@doonflow/shared";
import type { NodoArbol, NodoOpcion, TipoNodo, TipoRespuesta, ModalidadPuntaje } from "@doonflow/shared";
import { Boton } from "@doonflow/ui";
import type { DatosCrearNodo } from "../_servicios/inspeccion.servicio";

const OPCIONES_TIPO_RESPUESTA: { value: TipoRespuesta; label: string }[] = [
  { value: "SI_NO",              label: "Sí / No" },
  { value: "SELECCION_UNICA",    label: "Selección única" },
  { value: "SELECCION_MULTIPLE", label: "Selección múltiple" },
  { value: "TEXTO_LIBRE",        label: "Texto libre" },
  { value: "NUMERICO",           label: "Numérico" },
  { value: "PUNTAJE_MANUAL",     label: "Puntaje manual" },
];

const OPCIONES_MODALIDAD: { value: ModalidadPuntaje; label: string }[] = [
  { value: "FIJO",        label: "Fijo" },
  { value: "PARCIAL",     label: "Parcial" },
  { value: "MANUAL",      label: "Manual" },
  { value: "POR_OPCIONES", label: "Por opciones" },
];

interface PropsPanelEdicionNodo {
  nodo: NodoArbol;
  abierto: boolean;
  guardando: boolean;
  error: string | null;
  onGuardar: (datos: DatosCrearNodo & { id: string }) => void;
  onCancelar: () => void;
  onCambio: () => void;
}

export function PanelEdicionNodo({
  nodo,
  abierto,
  guardando,
  error,
  onGuardar,
  onCancelar,
  onCambio,
}: PropsPanelEdicionNodo) {
  const tituloId = useId();
  const primerInputRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo]           = useState<TipoNodo>(nodo.tipo);
  const [codigo, setCodigo]       = useState(nodo.codigo);
  const [titulo, setTitulo]       = useState(nodo.titulo);
  const [criterio, setCriterio]   = useState(nodo.criterio ?? "");

  // Campos de pregunta
  const [tipoRespuesta, setTipoRespuesta]       = useState<TipoRespuesta>(nodo.tipoRespuesta ?? "SI_NO");
  const [modalidadPuntaje, setModalidadPuntaje] = useState<ModalidadPuntaje>(nodo.modalidadPuntaje ?? "FIJO");
  const [puntajeMaximo, setPuntajeMaximo]       = useState(nodo.puntajeMaximo);

  // Evidencia
  const [evidenciaObligatoria, setEvidenciaObligatoria] = useState(nodo.evidenciaObligatoria);
  const [evidenciaMinima, setEvidenciaMinima]           = useState(nodo.evidenciaMinima);
  const [evidenciaMaxima, setEvidenciaMaxima]           = useState(nodo.evidenciaMaxima);

  // Opciones de respuesta
  const [opciones, setOpciones] = useState<Omit<NodoOpcion, "id">[]>(
    nodo.opciones.map(({ etiqueta, criterio: c, puntaje, orden }) => ({ etiqueta, criterio: c, puntaje, orden })),
  );

  // Sincronizar cuando el nodo cambia
  useEffect(() => {
    setTipo(nodo.tipo);
    setCodigo(nodo.codigo);
    setTitulo(nodo.titulo);
    setCriterio(nodo.criterio ?? "");
    setTipoRespuesta(nodo.tipoRespuesta ?? "SI_NO");
    setModalidadPuntaje(nodo.modalidadPuntaje ?? "FIJO");
    setPuntajeMaximo(nodo.puntajeMaximo);
    setEvidenciaObligatoria(nodo.evidenciaObligatoria);
    setEvidenciaMinima(nodo.evidenciaMinima);
    setEvidenciaMaxima(nodo.evidenciaMaxima);
    setOpciones(nodo.opciones.map(({ etiqueta, criterio: c, puntaje, orden }) => ({ etiqueta, criterio: c, puntaje, orden })));
  }, [nodo]);

  useEffect(() => {
    if (abierto) primerInputRef.current?.focus();
  }, [abierto]);

  const esPregunta   = tipo === "PREGUNTA";
  const tieneOpciones = esPregunta && (tipoRespuesta === "SELECCION_UNICA" || tipoRespuesta === "SELECCION_MULTIPLE");
  const tieneHijos   = nodo.hijos.length > 0;

  const cambio = (fn: () => void) => { fn(); onCambio(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar({
      id: nodo.id,
      tipo,
      padreId: nodo.padreId ?? undefined,
      codigo,
      titulo,
      criterio: criterio || undefined,
      ...(esPregunta && {
        tipoRespuesta,
        modalidadPuntaje,
        puntajeMaximo,
        evidenciaObligatoria,
        evidenciaMinima: evidenciaObligatoria ? evidenciaMinima : 0,
        evidenciaMaxima: evidenciaObligatoria ? evidenciaMaxima : 5,
      }),
    });
  };

  if (!abierto) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-dark/40" aria-hidden="true" onClick={onCancelar} />

      {/* Panel lateral */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-white shadow-card dark:bg-gray-dark"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-dark-3">
          <h2 id={tituloId} className="font-bold text-dark dark:text-white">
            {esPregunta ? "Editar pregunta" : "Editar sección"}
          </h2>
          <button
            onClick={onCancelar}
            aria-label="Cerrar panel"
            className="text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 p-5">

            {/* ── Tipo de nodo ─────────────────────────────────────── */}
            <div>
              <p className="mb-2 text-body-xs font-medium text-dark-4 dark:text-dark-6">
                Tipo de nodo
              </p>
              <div className="flex overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
                <TipoBtn
                  activo={tipo === "PANEL"}
                  onClick={() => cambio(() => setTipo("PANEL"))}
                  disabled={tieneHijos && tipo === "PREGUNTA"}
                >
                  <span className="text-sm font-semibold">1.1</span>
                  <span className="text-body-xs">Sección / Título</span>
                </TipoBtn>
                <TipoBtn
                  activo={tipo === "PREGUNTA"}
                  onClick={() => cambio(() => setTipo("PREGUNTA"))}
                  disabled={tieneHijos && tipo === "PANEL"}
                >
                  <span className="text-sm font-semibold">1.1.1</span>
                  <span className="text-body-xs">Pregunta</span>
                </TipoBtn>
              </div>
              {tieneHijos && (
                <p className="mt-1 text-body-xs text-dark-5 dark:text-dark-6">
                  No se puede cambiar el tipo porque este nodo tiene subelementos.
                </p>
              )}
            </div>

            <hr className="border-stroke dark:border-dark-3" />

            {/* ── Campos comunes ───────────────────────────────────── */}
            <Campo label="Código" requerido>
              <input
                ref={primerInputRef}
                value={codigo}
                onChange={(e) => cambio(() => setCodigo(e.target.value))}
                placeholder={esPregunta ? "1.1.1" : "1.1"}
                className={inputCls}
                required
              />
            </Campo>

            <Campo label="Título" requerido>
              <input
                value={titulo}
                onChange={(e) => cambio(() => setTitulo(e.target.value))}
                placeholder={esPregunta ? "Texto de la pregunta" : "Nombre de la sección"}
                className={inputCls}
                required
              />
            </Campo>

            <Campo label="Criterio de evaluación">
              <textarea
                value={criterio}
                onChange={(e) => cambio(() => setCriterio(e.target.value))}
                rows={2}
                placeholder="Descripción del criterio (opcional)"
                className={cn(inputCls, "resize-none")}
              />
            </Campo>

            {/* ── Campos solo para PREGUNTA ────────────────────────── */}
            {esPregunta && (
              <>
                <hr className="border-stroke dark:border-dark-3" />
                <p className="text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                  Configuración de respuesta
                </p>

                <Campo label="Tipo de respuesta">
                  <select
                    value={tipoRespuesta}
                    onChange={(e) => cambio(() => setTipoRespuesta(e.target.value as TipoRespuesta))}
                    className={inputCls}
                  >
                    {OPCIONES_TIPO_RESPUESTA.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Campo>

                <div className="flex gap-3">
                  <Campo label="Modalidad de puntaje">
                    <select
                      value={modalidadPuntaje}
                      onChange={(e) => cambio(() => setModalidadPuntaje(e.target.value as ModalidadPuntaje))}
                      className={inputCls}
                    >
                      {OPCIONES_MODALIDAD.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Puntaje máximo">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={puntajeMaximo}
                      onChange={(e) => cambio(() => setPuntajeMaximo(Number(e.target.value)))}
                      className={inputCls}
                    />
                  </Campo>
                </div>

                {tieneOpciones && (
                  <>
                    <hr className="border-stroke dark:border-dark-3" />
                    <p className="text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                      Opciones de respuesta
                    </p>
                    <ListaOpciones
                      opciones={opciones}
                      onChange={(ops) => cambio(() => setOpciones(ops))}
                    />
                  </>
                )}

                {/* ── Evidencia ─────────────────────────────────── */}
                <hr className="border-stroke dark:border-dark-3" />

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="evidencia-oblig"
                    checked={evidenciaObligatoria}
                    onChange={(e) => cambio(() => setEvidenciaObligatoria(e.target.checked))}
                    className="h-4 w-4 accent-primary"
                  />
                  <label htmlFor="evidencia-oblig" className="text-body-sm font-medium text-dark dark:text-white">
                    Evidencia obligatoria
                  </label>
                </div>

                {evidenciaObligatoria && (
                  <div className="flex gap-3">
                    <Campo label="Mín. evidencias">
                      <input
                        type="number" min={0} value={evidenciaMinima}
                        onChange={(e) => cambio(() => setEvidenciaMinima(Number(e.target.value)))}
                        className={inputCls}
                      />
                    </Campo>
                    <Campo label="Máx. evidencias">
                      <input
                        type="number" min={0} value={evidenciaMaxima}
                        onChange={(e) => cambio(() => setEvidenciaMaxima(Number(e.target.value)))}
                        className={inputCls}
                      />
                    </Campo>
                  </div>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-red-light/[0.08] px-4 py-3 text-body-sm text-red">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-stroke px-5 py-4 dark:border-dark-3">
            <Boton type="submit" variante="primario" cargando={guardando} className="flex-1 py-2.5 text-sm">
              Guardar
            </Boton>
            <Boton type="button" variante="secundario" onClick={onCancelar} className="flex-1 py-2.5 text-sm">
              Cancelar
            </Boton>
          </div>
        </form>
      </aside>
    </>
  );
}

// ── Selector de tipo ──────────────────────────────────────────────────────────

function TipoBtn({
  activo,
  onClick,
  disabled,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors",
        activo
          ? "bg-primary text-white"
          : "bg-white text-dark-4 hover:bg-gray-1 dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-dark-3",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

// ── Lista de opciones ─────────────────────────────────────────────────────────

function ListaOpciones({
  opciones,
  onChange,
}: {
  opciones: Omit<NodoOpcion, "id">[];
  onChange: (ops: Omit<NodoOpcion, "id">[]) => void;
}) {
  const actualizar = (idx: number, campo: keyof Omit<NodoOpcion, "id">, valor: string | number) => {
    onChange(opciones.map((o, i) => i === idx ? { ...o, [campo]: valor } : o));
  };

  const agregar = () => {
    onChange([...opciones, { etiqueta: "", criterio: undefined, puntaje: 0, orden: opciones.length }]);
  };

  const eliminar = (idx: number) => {
    onChange(opciones.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {opciones.map((op, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            value={op.etiqueta}
            placeholder="Etiqueta"
            onChange={(e) => actualizar(idx, "etiqueta", e.target.value)}
            className={cn(inputCls, "flex-1")}
          />
          <input
            type="number"
            value={op.puntaje}
            min={0}
            step={0.5}
            onChange={(e) => actualizar(idx, "puntaje", Number(e.target.value))}
            className={cn(inputCls, "w-20")}
          />
          <button
            type="button"
            onClick={() => eliminar(idx)}
            aria-label={`Eliminar opción ${op.etiqueta}`}
            className="text-dark-4 hover:text-red transition-colors"
          >✕</button>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        className="text-body-sm text-primary hover:underline"
      >
        + Agregar opción
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none transition-colors focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary";

function Campo({
  label, requerido, children,
}: {
  label: string; requerido?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-body-xs font-medium text-dark-4 dark:text-dark-6">
        {label}{requerido && <span className="text-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
