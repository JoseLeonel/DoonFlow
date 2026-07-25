"use client";

import { useParams } from "next/navigation";
import { Breadcrumb } from "@doonflow/ui";
import { DialogoConfirmacion } from "@doonflow/ui";
import { useEditorPlantilla } from "../_hooks/use-editor-plantilla";
import { StripResumenPlantilla } from "../_components/strip-resumen-plantilla";
import { TablaFicha } from "../_components/tabla-ficha";
import { PanelEdicionNodo } from "../_components/panel-edicion-nodo";
import { TablaRangos } from "../_components/tabla-rangos";

export default function PaginaEditorEstructura() {
  const { id } = useParams<{ id: string }>();
  const editor = useEditorPlantilla(id);

  // ── Estado de carga ────────────────────────────────────────────────────────

  if (editor.cargando) {
    return <SkeletonEditor />;
  }

  if (editor.error || !editor.plantilla) {
    return (
      <div
        className="-m-4 md:-m-6 2xl:-m-10 flex min-h-screen items-center justify-center p-8"
        style={{ background: "#eef1f5" }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #e6eaf0",
            boxShadow: "0 1px 2px rgba(16,24,40,.04)",
            padding: "32px",
            maxWidth: 380,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#1e293b", marginBottom: 16 }}>
            {editor.error ?? "Plantilla no encontrada."}
          </p>
          <button
            onClick={editor.recargar}
            style={{
              padding: "9px 22px",
              borderRadius: 9,
              background: "#15803d",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { plantilla } = editor;

  const breadcrumb = [
    { label: "Inspecciones", href: "/inspecciones" },
    { label: plantilla.nombre, href: `/inspecciones/${id}` },
    { label: "Estructura" },
  ];

  return (
    <div
      className="-m-4 md:-m-6 2xl:-m-10"
      style={{ background: "#eef1f5", minHeight: "100%" }}
    >
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Breadcrumb */}
        <Breadcrumb segmentos={breadcrumb} className="mb-4" />

        {/* Header de la ficha */}
        <StripResumenPlantilla
          plantilla={plantilla}
          puntajeAcumulado={editor.puntajeAcumulado}
          totalPreguntas={editor.totalPreguntas}
          totalSecciones={plantilla.nodos.length}
          modo={editor.modo}
          onToggleModo={editor.toggleModo}
          onEditarCabecera={() => editor.navegarCon(`/inspecciones/${id}/editar`)}
          onToggleEstado={editor.toggleEstado}
          onEnviarRevision={editor.enviarRevision}
        />

        {/* Árbol jerárquico */}
        <div className="mt-4">
          <TablaFicha
            nodos={plantilla.nodos}
            modoEdicion={editor.modo === "edicion"}
            seccionesColapsadas={editor.seccionesColapsadas}
            onToggleColapso={editor.toggleColapso}
            onExpandirTodo={editor.expandirTodo}
            onContraerTodo={editor.contraerTodo}
            onEditar={editor.abrirPanel}
            onAgregarHijo={(padreId) => editor.crearNuevoNodo("PREGUNTA", padreId)}
            onAgregarSeccion={() => editor.crearNuevoNodo("PANEL")}
            onSubir={(nodoId) => editor.moverNodo(nodoId, "arriba")}
            onBajar={(nodoId) => editor.moverNodo(nodoId, "abajo")}
            onEliminar={editor.borrarNodo}
            onActualizarPuntaje={editor.actualizarPuntaje}
          />
        </div>

        {/* Rangos de resultado */}
        <div className="mt-5">
          <TablaRangos
            rangos={plantilla.rangosResultado}
            onGuardar={editor.guardarRangosPlantilla}
          />
        </div>
      </div>

      {/* Panel lateral de edición */}
      {editor.nodoActivo && (
        <PanelEdicionNodo
          nodo={editor.nodoActivo}
          abierto={editor.panelAbierto}
          guardando={editor.guardandoNodo}
          error={editor.errorPanel}
          onGuardar={editor.guardarNodo}
          onCancelar={() => editor.cerrarPanel()}
          onCambio={editor.marcarPanelDirty}
        />
      )}

      {/* Diálogo de guardia de navegación */}
      <DialogoConfirmacion
        abierto={editor.mostrarDialogoSalida}
        titulo="¿Salir sin guardar?"
        mensaje={`Tienes cambios sin guardar en "${editor.nodoActivo?.titulo ?? "este nodo"}". ¿Salir de todos modos?`}
        labelConfirmar="Salir sin guardar"
        labelCancelar="Quedarse"
        onConfirmar={editor.confirmarSalida}
        onCancelar={editor.cancelarSalida}
      />
    </div>
  );
}

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function SkeletonEditor() {
  return (
    <div
      className="-m-4 md:-m-6 2xl:-m-10"
      style={{ background: "#eef1f5", minHeight: "100%" }}
    >
      <div className="mx-auto max-w-6xl animate-pulse p-4 md:p-6">
        {/* Breadcrumb skeleton */}
        <div className="mb-4 flex gap-2">
          <div className="h-4 w-24 rounded bg-white/60" />
          <div className="h-4 w-4 rounded bg-white/60" />
          <div className="h-4 w-40 rounded bg-white/60" />
          <div className="h-4 w-4 rounded bg-white/60" />
          <div className="h-4 w-20 rounded bg-white/60" />
        </div>

        {/* Header skeleton */}
        <div
          className="mb-4 flex items-center justify-between"
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #e6eaf0",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-2" style={{ width: 42, height: 42 }} />
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-gray-2" />
              <div className="h-3 w-32 rounded bg-gray-2" />
            </div>
          </div>
          <div className="h-12 w-48 rounded-xl bg-gray-2" />
          <div className="h-9 w-52 rounded-xl bg-gray-2" />
        </div>

        {/* Árbol skeleton */}
        <div
          style={{
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #e6eaf0",
            overflow: "hidden",
          }}
        >
          <div className="h-14 border-b border-[#eef1f5] bg-[#fafbfc]" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="border-b border-[#f4f6f9]"
              style={{ height: 50, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}
            />
          ))}
        </div>

        {/* Rangos skeleton */}
        <div
          className="mt-5"
          style={{
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #e6eaf0",
          }}
        >
          <div className="border-b border-[#eef1f5] p-5">
            <div className="h-4 w-36 rounded bg-gray-2" />
          </div>
          <div className="space-y-2 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-2" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
