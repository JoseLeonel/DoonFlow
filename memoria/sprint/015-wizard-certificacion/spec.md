# Especificación — 015-wizard-certificacion

> ## ⭐ HU PRINCIPAL DE TODO EL DESARROLLO
> Este sprint es la historia de usuario central de DoonFlow: es la acción que un usuario real ejecuta una y otra vez, y para la que existen todas las demás — Clientes/Sucursales (002/003) le dan un destino, Usuarios/Roles (004) le dan un dueño, Hallazgos/Plan (013) le dan seguimiento, Notificaciones/Portal (006/014) le dan visibilidad externa, Reportes (008) la resumen. Al planificar o priorizar trabajo entre sprints, esta HU no se pospone ni se recorta.

> **Nota de alcance (2026-07-16, a pedido explícito del usuario):** este sprint es **solo el formulario** — el wizard de captura de respuestas, paso a paso por sección. **No incluye firma digital, PDF ni código de verificación.** Esa parte (antes HU-2 de este mismo sprint cuando compartía carpeta con `005-certificacion-plan-cumplimiento`) sigue documentada en [[005-certificacion-plan-cumplimiento]], marcada explícitamente como **pausada / no implementar todavía**. Este sprint termina cuando el usuario completa y guarda el formulario — no firma nada.

## Historia de usuario

> **HU-1 (⭐ principal).** Como **usuario autorizado**, quiero completar una certificación como un **asistente paso a paso (wizard)** — indicando primero el período que voy a certificar y luego avanzando sección por sección (por título) del formulario base configurado en Mantenimientos — de manera que pueda completarla sin perderme en un formulario largo, y pueda hacerlo tantas veces como se requiera (N certificaciones por sucursal a lo largo del tiempo).

---

## Contexto

- El **formulario base** (Ficha BPM) se configura en Mantenimientos (`InspeccionPlantilla` + `InspeccionNodo`, editor en `/inspecciones/[id]` — ver [[project-bpm-editor]]). Este sprint no toca el editor de estructura, solo **consume** la plantilla vigente para completar certificaciones sobre ella.
- El modelo de ejecución (RF-08) **ya existe parcialmente** en `packages/db/prisma/schema.prisma`: `Inspeccion` (cabecera con puntaje/clasificación/observaciones), `InspeccionDetalle` (respuesta por pregunta, con snapshot de la estructura), `InspeccionEvidencia`. Este sprint es el que estaba señalado como **pendiente** ("motor de ejecución de inspección") en [[001-crud-formulario]] y [[003-sucursales-certificacion]] — cubre la captura de respuestas; **no** cubre la firma (deliberadamente fuera de alcance, ver nota arriba).
- Depende de [[003-sucursales-certificacion]]: todo formulario se completa sobre una `Sucursal` específica (Cliente → Sucursal → Período → formulario), no sobre `Inspeccion.establecimiento` (campo de texto libre actual, que debe migrarse a `sucursalId`). Si sprint 003 no está implementado todavía, este sprint queda bloqueado en ese punto.
- Depende de [[004-usuarios-roles-alcance]] para saber quién puede ver/completar cada certificación según su alcance (administrador general, administrador de cliente, usuario de sucursal).
- **No depende de firma digital ni de código de verificación** — esos campos (`firmadoPorId`, `firmadoEn`, `codigoVerificacion`, `pdfUrl`, `fechaVencimiento`, `resultadoFinal`) pertenecen a [[005-certificacion-plan-cumplimiento]] (pausado) y no se tocan en este sprint.

---

## Alcance de este sprint

1. **⭐ Wizard de formulario**: Paso 0 (Selector Cliente → Sucursal → Período, construye sobre el selector de sucursal ya definido en [[003-sucursales-certificacion]], Pantalla 2) seguido de un paso por cada sección de nivel 0 de la plantilla vigente, con navegación Anterior/Siguiente, guardado incremental por paso y barra de progreso.
2. **Ejecución del formulario por secciones**: generar las preguntas de cada sección desde la plantilla vigente y guardar las respuestas paso a paso — esta parte ya tiene modelo de datos (`InspeccionDetalle`); este sprint define el wizard y el flujo, no el modelo de respuestas en sí.
3. **Evidencia genérica compartida**: entidad y validaciones de dominio (`domain/evidencia.entity.ts`: tipo de archivo permitido, tamaño máximo, convención de ruta de almacenamiento) reutilizadas por `InspeccionEvidencia` (este sprint) y, más adelante, por `HallazgoEvidencia`/`AccionCorrectivaEvidencia` (013).
4. **Paso final: Revisión (sin firma)**: resumen de puntaje/clasificación por sección, indicador de secciones sin responder, botón **"Guardar y finalizar"** — deja la certificación con todas sus respuestas guardadas, sin firmar.

Este sprint **no** incluye: firma/confirmación de la certificación, generación de PDF, código de verificación, cálculo de `resultadoFinal`, `fechaVencimiento` (todo esto pertenece a **HU-2**, pausada en [[005-certificacion-plan-cumplimiento]] — no implementar hasta que se retome explícitamente), hallazgos, plan de cumplimiento, seguimiento del responsable, verificación/cierre por el auditor (cubierto en [[013-hallazgos-plan-cumplimiento]], que a su vez depende de que la firma exista), notificaciones automáticas, verificación pública del PDF, ni reportes comparativos entre sucursales o clientes.

---

## Entidad Certificación (ampliación de `Inspeccion`) — solo los campos de este sprint

`Inspeccion` ya existe con `plantillaId`, `plantillaVersion`, `inspectorId`, `establecimiento`, `fechaInicio`, `fechaFin`, `estado`, `puntajeObtenido`, `puntajeMaximo`, `porcentajeCumplimiento`, `clasificacion`, `observaciones`. Este sprint agrega **únicamente**:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `sucursalId` | UUID FK → `sucursal(id)` | Sí (reemplaza a `establecimiento` como texto libre) | Viene de [[003-sucursales-certificacion]]. Todo formulario nuevo se asocia a una sucursal; migración de datos existentes a cargo de `agente-basededatos`. |
| `periodoEtiqueta` | Texto (50) | Sí | Período que cubre el formulario (ej. "Julio 2026", "Q3 2026") — texto libre o generado según la periodicidad que defina el negocio. |

`estado` se mantiene en `EN_PROGRESO` durante todo este sprint (mientras se responde). Los campos de firma (`firmadoPorId`, `firmadoEn`, `codigoVerificacion`, `pdfUrl`, `fechaVencimiento`, `resultadoFinal`) y el valor `FIRMADA` de `estado` **no se agregan en este sprint** — están documentados y pausados en [[005-certificacion-plan-cumplimiento]].

---

## Entidad Evidencia (genérica, compartida)

`InspeccionEvidencia` ya existe en el modelo (evidencia adjunta a una respuesta del formulario). Este sprint formaliza las **reglas de dominio compartidas** que también reutilizará [[013-hallazgos-plan-cumplimiento]] para `HallazgoEvidencia` y `AccionCorrectivaEvidencia`, y que [[005-certificacion-plan-cumplimiento]] reutilizará cuando se retome la firma:

- **Tipos de archivo permitidos**: imágenes (jpg/png/heic) y documentos (pdf/doc/docx).
- **Tamaño máximo por archivo**: a definir por `agente-backend` (ej. 10 MB), validado en el backend, no solo en el input del frontend.
- **Convención de ruta de almacenamiento**: `certificaciones/{empresaId}/{inspeccionId}/{detalleId}/{archivo}` — permite ubicar todos los archivos de una certificación en una sola carpeta.
- El acceso a un archivo respeta el mismo alcance de [[004-usuarios-roles-alcance]]: un `usuario_sucursal` solo puede ver/descargar evidencias de certificaciones de su(s) sucursal(es).
- No se elimina físicamente ninguna evidencia una vez cargada.

Estas reglas viven en `domain/evidencia.entity.ts` (funciones puras, sin dependencia de `Express`/`Prisma`), consumidas por el adaptador `infrastructure/almacenamiento-evidencias.adapter.ts` (Supabase Storage).

---

## Pantallas — Wizard de formulario (⭐ flujo principal, alto nivel — a detallar por `agente-frontend` antes de implementar)

Una sola experiencia continua, un paso a la vez, con barra de progreso fija ("Paso 3 de 8 · Áreas verdes") y navegación **Anterior / Siguiente**. El usuario nunca ve el formulario completo de una sola vez — solo la sección (título de nivel 0 de la plantilla, ver [[project-bpm-editor]]) del paso actual.

### Paso 0 — Indicar el período (arranque del wizard)
- Selector: Cliente → Sucursal (según acceso del usuario, [[004-usuarios-roles-alcance]]) → **Período** (`periodoEtiqueta`, ej. "Julio 2026").
- Botón "Iniciar formulario" → crea la `Inspeccion` en estado `EN_PROGRESO` con la plantilla vigente y avanza al Paso 1. A partir de aquí el período queda fijo (no se puede cambiar a mitad del wizard).

### Pasos 1..N — Una sección por paso
- Cada paso muestra **una sola sección de nivel 0** de la plantilla (su título como cabecera del paso) con todas sus preguntas/sub-secciones anidadas — mismo renderizado de fila que `TablaFicha` de [[001-crud-formulario]], pero en modo "responder" y acotado a esa sección únicamente.
- Guardado incremental por paso: al presionar "Siguiente" se guardan las respuestas del paso actual (`InspeccionDetalle`) antes de avanzar — no hay que llegar al final para no perder el trabajo.
- "Anterior" navega al paso previo sin perder lo ya respondido; se puede volver atrás a corregir una sección anterior en cualquier momento.
- La barra de progreso permite saltar directamente a un paso ya visitado.
- El usuario puede salir del wizard en cualquier paso y retomarlo después — el formulario queda en `EN_PROGRESO` con lo ya guardado.

### Paso final — Revisión (sin firma)
- Resumen de todas las secciones: puntaje obtenido/máximo, porcentaje, clasificación, e indicador de qué secciones quedaron sin responder (si alguna).
- Botón **"Guardar y finalizar"** — no firma, no genera PDF, no genera código de verificación. Solo confirma que las respuestas quedaron guardadas.
- No hay enlace de descarga ni código de verificación en este sprint — eso se agrega cuando se retome [[005-certificacion-plan-cumplimiento]] (firma, pausada).

---

## Reglas de negocio

1. Una `Sucursal` puede tener **N formularios** a lo largo del tiempo (uno por período); cada uno es independiente, con su propio puntaje.
2. Un formulario en estado `EN_PROGRESO` puede editarse libremente (respuestas) en este sprint — no existe todavía el estado `FIRMADA` (pausado en 005), así que no hay bloqueo de edición por firma.
3. El período (`periodoEtiqueta`) se fija en el Paso 0 y no puede modificarse una vez creada la `Inspeccion` — cambiar de período implica iniciar un formulario nuevo, no editar el existente.
4. Cada paso del wizard (una sección de nivel 0) guarda sus respuestas al presionar "Siguiente", de forma independiente a los demás pasos — perder la conexión o cerrar el navegador después de completar el paso 3 no hace perder los pasos 1 y 2 ya guardados.
5. El usuario puede navegar libremente entre pasos ya visitados (no es un flujo de un solo sentido) mientras el formulario esté `EN_PROGRESO`.
6. No se elimina físicamente ninguna certificación ni evidencia — es historial.
7. El `empresaId` viene siempre del JWT; el filtrado adicional por `sucursalId`/`clienteId` sigue las reglas de alcance de [[004-usuarios-roles-alcance]].

---

## Decisiones pendientes (a confirmar antes de implementar)

- **Periodicidad**: si `periodoEtiqueta` es texto libre o si se deriva de una periodicidad configurable por plantilla (mensual, trimestral, anual) — a definir con negocio.
- **Granularidad del paso del wizard**: este sprint asume "un paso = una sección de nivel 0" de la plantilla. Si una plantilla tiene secciones muy desiguales (una con 2 preguntas, otra con 40), puede convenir permitir que `agente-frontend` sub-divida un paso pesado en dos.
- **Qué pasa después de "Guardar y finalizar"**: en este sprint el formulario queda `EN_PROGRESO` indefinidamente (no hay un estado "completado sin firmar" formal). Si negocio quiere distinguir "completado, pendiente de firma" de "a medio llenar", es un ajuste menor a considerar cuando se retome 005.

---

## Fuera de alcance (este sprint)

- **Firma digital, PDF, código de verificación, `resultadoFinal`, `fechaVencimiento`** — pausado explícitamente en [[005-certificacion-plan-cumplimiento]] a pedido del usuario (2026-07-16). No implementar hasta que se retome esa decisión.
- Hallazgos, plan de cumplimiento, seguimiento del responsable y verificación/cierre por el auditor — [[013-hallazgos-plan-cumplimiento]] (depende de que la firma exista, así que también queda bloqueado hasta retomar 005).
- Notificaciones automáticas, verificación pública, panel ejecutivo, calendario, biblioteca de hallazgos frecuentes, reportes comparativos, importación masiva, API pública — sin cambios respecto a lo ya documentado en sus sprints respectivos.

---

## Ver también

- [[005-certificacion-plan-cumplimiento]] — HU-2 (firma/PDF/código de verificación), **pausada, no implementar todavía**.
- [[013-hallazgos-plan-cumplimiento]] — hallazgos, plan de cumplimiento, seguimiento y verificación/cierre. Depende de que 005 (firma) se retome.
