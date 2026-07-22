# Especificación — 005-certificacion-plan-cumplimiento

> ## ⏸️ PAUSADO — no implementar todavía
> A pedido explícito del usuario (2026-07-16): **la firma digital no se implementa por ahora.** Este documento queda como referencia de diseño para cuando se retome, pero no es parte del trabajo activo. La HU-1 original de este sprint (el wizard de captura de respuestas) se separó a **[[015-wizard-certificacion]]**, que es la HU principal activa del desarrollo y **no depende de este sprint** para funcionar — el formulario se completa y guarda sin firma. Este sprint (005) ahora depende de 015 (necesita que exista el formulario ya completado para poder firmarlo).

## Historia de usuario

> **HU-2 (pausada).** Como **usuario autorizado**, quiero revisar las respuestas del formulario y firmar/confirmar la certificación, para que el sistema genere un PDF con código de verificación que respalde que la información fue certificada como correcta.

> Ver [[015-wizard-certificacion]] para HU-1 (wizard de captura de respuestas — sprint activo).
> Ver [[013-hallazgos-plan-cumplimiento]] para HU-3, HU-4 y HU-5 (hallazgos, plan de cumplimiento, seguimiento y verificación/cierre) — también depende de que este sprint se retome.

---

## Contexto

- Este sprint **depende de [[015-wizard-certificacion]]**: la certificación (`Inspeccion` con `sucursalId`, `periodoEtiqueta`, respuestas en `InspeccionDetalle`) ya existe y está `EN_PROGRESO`/completada antes de llegar aquí. Este sprint solo agrega el paso de firma sobre eso.
- Depende de [[004-usuarios-roles-alcance]] para saber quién puede firmar cada certificación según su alcance.
- [[013-hallazgos-plan-cumplimiento]] depende de que este sprint exista: los hallazgos y el plan de cumplimiento solo tienen sentido sobre una certificación que ya pasó por revisión/firma.
- **Dependencia cruzada a documentar explícitamente:** el campo `resultadoFinal` vive en la entidad `Certificación` de este sprint, pero su **cálculo real** (regla 1.1) depende de la severidad de los `Hallazgo` definidos en 013. Este sprint, por sí solo (sin 013 implementado), firmaría con `resultadoFinal = APROBADA` de forma incondicional porque no existe todavía el concepto de hallazgo. Cuando se implemente 013, ese sprint reemplazaría el cálculo. Como este sprint está pausado, esta dependencia queda documentada pero no se activa.

---

## Alcance de este sprint (cuando se retome)

1. **Firma/confirmación de la certificación**: cambia el estado de la certificación (de lo que sea que 015 deje, probablemente `EN_PROGRESO`) a `FIRMADA`, registra quién y cuándo firmó, genera un código de verificación único y un PDF descargable.
2. En su primera versión, `resultadoFinal` se fijaría siempre en `APROBADA` al firmar (no existe aún el concepto de hallazgo); el cálculo completo por severidad se activaría al implementar [[013-hallazgos-plan-cumplimiento]].

Este sprint **no** incluye: el wizard de captura de respuestas (ver [[015-wizard-certificacion]], ya implementado/activo independientemente de este), hallazgos, plan de cumplimiento, seguimiento del responsable, verificación/cierre por el auditor (cubierto en [[013-hallazgos-plan-cumplimiento]]), notificaciones automáticas, verificación pública del PDF, ni reportes comparativos.

---

## Entidad Certificación — campos de firma (ampliación adicional de `Inspeccion`, sobre lo que ya agregó 015)

[[015-wizard-certificacion]] ya agregó `sucursalId` y `periodoEtiqueta` a `Inspeccion`. Este sprint, cuando se retome, agregaría:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `firmadoPorId` | UUID FK → `usuario(id)` | No | Se llena al confirmar/firmar. Null mientras está en borrador. |
| `firmadoEn` | Timestamp | No | Fecha/hora de la firma. |
| `codigoVerificacion` | Texto (20), único | No | Generado al firmar (ej. alfanumérico corto). Permite validar la autenticidad del PDF. |
| `pdfUrl` | Texto | No | Ubicación del PDF generado (Supabase Storage), generado al firmar. |
| `fechaVencimiento` | Date | No | Vigencia de la certificación. Se calcula al firmar. El detalle de recordatorio de renovación se define en [[006-vigencia-notificaciones-portal]]. |
| `resultadoFinal` | Texto | No | `APROBADA` / `APROBADA_CON_OBSERVACIONES` / `RECHAZADA`. El cálculo real según hallazgos y su severidad se implementa en [[013-hallazgos-plan-cumplimiento]] (regla 1.1 de ese sprint). |

`estado` ganaría el valor `FIRMADA` (además de `EN_PROGRESO`, ya agregado por 015). Una certificación `FIRMADA` no se podría volver a editar.

---

## Reglas de negocio (cuando se retome)

1. `codigoVerificacion` sería único en todo el sistema (no solo por empresa) para poder validarse de forma inequívoca.
2. Una certificación `FIRMADA` bloquearía la edición de respuestas — cualquier corrección requeriría una **reinspección** (`InspeccionReinspeccion`, ya modelada) o una nueva certificación.
3. No se eliminaría físicamente ninguna certificación firmada — es historial.

El `empresaId` viene siempre del JWT; el filtrado adicional por `sucursalId`/`clienteId` sigue las reglas de alcance de [[004-usuarios-roles-alcance]].

---

## Decisiones pendientes (si se retoma)

- **Si implementar firma digital en absoluto**, y en qué forma (código de verificación simple vs. firma electrónica con validez legal) — decisión de negocio explícitamente aplazada el 2026-07-16.
- **Generación del PDF**: motor de renderizado (server-side) y almacenamiento (Supabase Storage) — decisión técnica de `agente-backend`/`agente-produccion`, no asumida aquí.

---

## Fuera de alcance

- Todo lo de [[015-wizard-certificacion]] (wizard de captura de respuestas) — ya resuelto ahí, independiente de este sprint.
- Hallazgos, plan de cumplimiento, seguimiento del responsable y verificación/cierre por el auditor — [[013-hallazgos-plan-cumplimiento]].
- Notificaciones automáticas, verificación pública, panel ejecutivo, calendario, biblioteca de hallazgos frecuentes, reportes comparativos.

---

## Ver también

- [[015-wizard-certificacion]] — HU-1, ⭐ HU principal activa del desarrollo. Este sprint depende de ese, no al revés.
- [[013-hallazgos-plan-cumplimiento]] — HU-3, HU-4, HU-5. Depende de que este sprint se retome.
