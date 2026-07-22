# Especificación — 001-crud-formulario

## Historia de usuario

> Como **administrador**, quiero un mantenimiento interactivo donde pueda gestionar de forma fácil el formulario de certificación de empresas (Ficha de Inspección), para poder crear, organizar y mantener las secciones y preguntas que componen cada ficha.

---

## Alcance de este sprint

Este sprint cubre únicamente la **gestión del formulario/plantilla**: crear una ficha, editar sus metadatos, y construir su estructura interna (secciones y preguntas). La **ejecución** de una inspección (RF-08 en adelante) queda fuera de este sprint.

---

## Pantallas

### 1. Lista de plantillas (`/inspecciones`)
- Tabla con: nombre, tipo, puntaje máximo, estado (activa/inactiva), fecha de vigencia, acciones.
- Filtro rápido: Todas / Activas / Inactivas.
- Acciones por fila: Editar, Activar/Desactivar, Clonar, Eliminar.
- Botón "Nueva plantilla" → navega a pantalla 2.

### 2. Formulario de cabecera (`/inspecciones/nueva` y `/inspecciones/[id]/editar`)
Campos:
| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre de la plantilla | Texto | Sí |
| Tipo de inspección | Selector (6 opciones) | Sí |
| Puntaje máximo | Numérico | Sí |
| Fecha de vigencia | Fecha | No |
| Descripción | Texto largo | No |
| Observaciones generales | Texto largo | No |

- Al guardar → redirige al editor de estructura (pantalla 3).

### 3. Editor de estructura (`/inspecciones/[id]`)
Vista principal del sprint. El editor reproduce visualmente la forma final de la ficha: el administrador ve exactamente cómo se verá la inspección mientras la construye.

**Strip de resumen (cabecera fija sobre la tabla):**
- Muestra en una sola línea: tipo de inspección · puntaje máximo · fecha de vigencia · estado (badge Activa/Inactiva).
- Botones "Editar cabecera" (outline) y "Editar estructura" (toggle modo edición, primario).
- Siempre visible; no desaparece al hacer scroll.

**Tabla jerárquica de la ficha (cuerpo principal):**
- Columnas: ASPECTO | REQUERIMIENTOS | CRITERIO | PUNTOS.
- Fila de sección nivel 0 (PANEL): fondo `bg-primary text-white`, ancho completo.
- Fila de subsección nivel 1+ (PANEL): fondo `bg-gray-1 dark:bg-dark-2`, indentada por nivel.
- Fila de pregunta (PREGUNTA): celdas ASPECTO (con rowspan si hay sub-ítems), REQUERIMIENTOS, CRITERIO (opciones), PUNTOS en verde. Para preguntas de tipo `SI_NO`, la columna CRITERIO muestra los badges `Sí` (verde) y `No` (rojo) si el nodo no tiene criterio textual; en caso contrario, muestra el criterio textual.
- **Modo vista**: tabla limpia, sin controles de edición.
- **Modo edición**: acciones por fila al hacer hover (✏️ editar, ➕ agregar hijo, ⬆⬇ reordenar, 🗑️ eliminar). Botón "Agregar sección" flotante al final del listado.

**Estado vacío (cero nodos):**
- La tabla muestra un estado vacío centrado con ilustración, texto "Esta ficha no tiene secciones todavía" y botón primario "Agregar primera sección" — no una tabla vacía sin contexto.

**Panel lateral de edición (deslizable desde la derecha):**
- Se abre al hacer clic en ✏️ de cualquier nodo. No navega a otra página.
- Campos comunes (PANEL y PREGUNTA): Código, Título, Criterio, Activo.
- Campos adicionales solo para PREGUNTA:
  - Tipo de respuesta: Sí/No, Selección única, Selección múltiple, Texto libre, Numérico, Puntaje manual.
  - Modalidad de puntaje: Fijo, Parcial, Manual, Por opciones.
  - Puntaje máximo del nodo.
  - Regla de comentario: Nunca, Siempre, Cuando negativo, Cuando puntaje menor al máximo, Configurable.
  - Evidencia obligatoria (switch), cantidad mínima y máxima (solo si switch activo).
  - Opciones de respuesta (solo si tipo = Selección única o Selección múltiple): lista con etiqueta, criterio y puntaje.
- **Estrategia de guardado: explícito** — botón "Guardar" dentro del panel. No autoguardar al perder foco (evita guardados accidentales al navegar entre campos). Botón "Cancelar" descarta cambios y cierra el panel.

**Rangos de resultado** (sección debajo de la tabla):
- Tabla editable inline: Desde, Hasta, Clasificación, dot de color (verde/amarillo/naranja/rojo).
- Validación en tiempo real: filas con solapamiento se resaltan con borde rojo.
- Botón "Agregar rango".

**Indicador de puntaje acumulado (mejora 7):**
- El strip muestra la suma real de puntajes de todas las PREGUNTAs de la ficha junto al puntaje máximo declarado en la cabecera.
- Si la suma coincide con el máximo → indicador verde `✓ 100 / 100 pts`.
- Si la suma difiere → indicador amarillo `⚠️ 85 / 100 pts` con tooltip: "Las preguntas suman 85 pts. El máximo declarado es 100. Ajusta los puntajes o el máximo de la ficha."
- El indicador se recalcula en tiempo real cada vez que se guarda un nodo.
- No bloquea el guardado ni la activación, pero es permanentemente visible mientras haya diferencia.
- Calculado en el frontend con la función de dominio `sumarPuntajes(nodos)` (nueva, paralela a `contarPreguntas()`).

**Breadcrumb de navegación (mejora 4):**
- Visible en la parte superior de todas las páginas del módulo inspecciones.
- Ruta clickeable: `Inspecciones > [nombre de la plantilla] > Estructura`
- El segmento "Inspecciones" navega a `/inspecciones`; el nombre de la plantilla navega a `/inspecciones/[id]`; "Estructura" es la página actual (no es link).
- Componente `Breadcrumb` en `packages/ui` — reutilizable por todos los módulos.

**Guardia de navegación — cambios sin guardar (mejora 5):**
- Si el panel lateral está abierto con cambios no guardados y el usuario intenta navegar fuera (breadcrumb, botón volver, enlace del sidebar), aparece un diálogo de confirmación:
  > "Tienes cambios sin guardar en '[nombre del nodo]'. ¿Salir de todos modos?"  
  > Botones: "Quedarse" (primario) · "Salir sin guardar" (outline)
- Si el panel no está abierto o no hay cambios, la navegación ocurre sin diálogo.
- Aplica tanto a navegación interna (Next.js router) como al botón "← Volver".

**Colapso de secciones (mejora 6):**
- Las secciones de nivel 0 (PANEL raíz) arrancan **colapsadas** al cargar la página — solo se ve la fila de cabecera verde.
- El clic en la fila o en el icono `▶/▼` expande/colapsa todos los hijos de esa sección.
- El estado de colapso es local (no se persiste en BD); al recargar, vuelven a estar colapsadas.
- Beneficio: fichas con 100+ preguntas son navegables sin scroll excesivo.

---

**Accesibilidad:**
- El panel lateral deslizable tiene `role="dialog"` con foco al primer campo al abrir, y foco de retorno al botón ✏️ al cerrar.
- Los botones de acción de fila llevan `aria-label` con el nombre del nodo.
- Los íconos de colapso `▶/▼` llevan `aria-expanded` indicando el estado actual de la sección.
- Mínimo requerido: navegable con teclado (Tab entre campos del panel, Escape para cerrar).

---

## Reglas de negocio

1. Una plantilla **inactiva** no puede usarse para ejecutar inspecciones.
2. Una plantilla con fecha de vigencia vencida tampoco puede ejecutarse (validación en dominio: `puedeIniciarInspeccion()`).
3. El código de cada nodo debe ser único dentro de la plantilla.
4. Un nodo PANEL puede contener PANELes hijos o PREGUNTAs; un nodo PREGUNTA es siempre hoja (sin hijos).
5. Los rangos de resultado no deben solaparse (validado por `validarRangos()` en dominio).
6. Clonar una plantilla copia toda la estructura de nodos con un nombre nuevo; la copia queda inactiva por defecto.
7. Eliminar una plantilla elimina en cascada todos sus nodos (no permitido si tiene inspecciones ejecutadas asociadas — validar en backend).

---

## Fuera de alcance (este sprint)

- Ejecución de inspección (RF-08).
- Cálculo automático de puntajes (RF-09).
- Rangos de resultado configurables fuera del editor (RF-10).
- Reinspecciones (RF-11).
- Historial/auditoría de cambios (RF-12).
- Reportes (RF-13).
- Drag & drop de nodos (deseable futuro, no bloqueante).
