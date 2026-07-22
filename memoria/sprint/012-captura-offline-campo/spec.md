# Especificación — 012-captura-offline-campo

## Historias de usuario

> **HU-1.** Como **auditor/inspector**, quiero poder responder el formulario de una certificación sin conexión a internet durante una visita en campo, para no depender de la señal disponible en la sucursal.

> **HU-2.** Como **auditor/inspector**, quiero que mis respuestas y evidencias capturadas offline se sincronicen automáticamente al recuperar conexión, para no perder el trabajo realizado ni tener que volver a capturarlo.

> **HU-3.** Como **administrador**, quiero ver si una certificación fue capturada offline y cuándo se sincronizó, para tener trazabilidad de la captura.

---

## Contexto

DoonFlow opera en el sector agroalimentario (fincas, plantas de acopio, sucursales rurales) donde la conectividad durante una inspección presencial no está garantizada. [[001-crud-formulario]] y [[015-wizard-certificacion]] asumen guardado incremental en línea; sin captura offline, un auditor puede perder el trabajo completo de una visita si se corta la señal a mitad de la inspección — un riesgo operativo real dado el objetivo de uso en tablet de campo (ver `CLAUDE.md` → objetivo responsive tablet/desktop).

> **Nota (2026-07-16):** el bloqueo de firma sin sincronizar (regla de negocio 1) depende de [[005-certificacion-plan-cumplimiento]], **pausado**. El resto de este sprint (captura offline del wizard de formulario) no depende de la firma y puede implementarse igual sobre [[015-wizard-certificacion]].

---

## Alcance de este sprint

1. **Formulario de certificación offline-first**: los Pasos 1..N del wizard de [[015-wizard-certificacion]] guardan respuestas localmente en el dispositivo mientras no hay conexión.
2. **Sincronización automática** al recuperar conexión: envía las respuestas y evidencias pendientes al servidor.
3. **Indicador visual de estado**: "Sin conexión — guardando localmente" / "Sincronizando..." / "Sincronizado".
4. **Trazabilidad de captura offline** en la certificación.

Este sprint cubre únicamente la ejecución de la certificación (respuestas + evidencias). No cubre operación offline de otras pantallas del sistema (reportes, panel ejecutivo, mantenimientos).

---

## Entidad Certificación — campos nuevos (sobre `Inspeccion` de [[015-wizard-certificacion]])

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `capturaOffline` | Boolean | Sí | `true` si en algún momento se capturó sin conexión. Default `false`. |
| `sincronizadoEn` | Timestamp | No | Última vez que se sincronizaron cambios pendientes. Null si nunca tuvo captura offline. |

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Responder formulario (ampliación del wizard ya definido en 015)
- Banner de estado de conexión, siempre visible mientras se responde.
- Sin bloqueos de UI al perder conexión — el formulario sigue funcionando igual, solo cambia el indicador.

### 2. Detalle de certificación (vista de administrador)
- Badge "Capturada offline" con fecha de sincronización, si aplica.

---

## Reglas de negocio

1. Una certificación **no puede firmarse** ([[005-certificacion-plan-cumplimiento]], **pausado** — regla queda documentada pero no aplica mientras no exista la firma) mientras haya respuestas o evidencias pendientes de sincronizar — la firma siempre requeriría estar en línea y con todo sincronizado.
2. Si dos dispositivos capturan la misma certificación offline (caso excepcional — el flujo normal es un solo inspector por certificación), gana la última sincronización por marca de tiempo, y el conflicto queda registrado en `RegistroAuditoria` ([[010-seguridad-privacidad-continuidad]]).
3. Las evidencias (fotos) capturadas offline se guardan localmente y se suben al sincronizar, con el mismo destino final (`InspeccionEvidencia`, Supabase Storage) definido en [[015-wizard-certificacion]].
4. Si la sincronización falla parcialmente (ej. una foto muy pesada con conexión inestable), el sistema reintenta automáticamente y mantiene el resto de los datos ya sincronizados — no se pierde todo por un solo archivo.

---

## Decisiones pendientes

- Tecnología exacta de almacenamiento local (IndexedDB vs. Service Worker con Cache API) — decisión técnica de `agente-frontend`.
- Si aplica compresión de imágenes antes de subir cuando la conexión recuperada es lenta (ej. datos móviles en zona rural).
- Tiempo máximo que se conservan datos offline sin sincronizar antes de alertar al inspector (para evitar pérdida si el dispositivo se pierde/daña antes de sincronizar).

---

## Fuera de alcance (este sprint)

- Modo offline para pantallas fuera de la ejecución de la certificación (reportes, panel ejecutivo, mantenimientos siguen requiriendo conexión).
- Aplicación nativa móvil — el proyecto es responsive web (tablet/desktop), no una app instalable con soporte offline de sistema operativo.
- Resolución manual de conflictos por el usuario (este sprint resuelve automáticamente por última escritura).
