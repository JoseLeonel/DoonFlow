# Especificación — 013-hallazgos-plan-cumplimiento

> **Nota de alcance:** este sprint es la **Parte B** de un sprint originalmente único (`005-certificacion-plan-cumplimiento`) que se dividió en dos por tamaño. Cubre **HU-3, HU-4 y HU-5**: hallazgos, plan de cumplimiento, seguimiento del responsable y verificación/cierre por el auditor. **Depende por completo de [[005-certificacion-plan-cumplimiento]]** (firma, PDF) — no puede implementarse sin ese sprint ya en producción, porque cada hallazgo cuelga de una `Inspeccion`/`Certificación` firmada.
>
> **⏸️ Sprint completo bloqueado (2026-07-16):** [[005-certificacion-plan-cumplimiento]] quedó **pausado** a pedido del usuario (firma digital no se implementa por ahora). Como este sprint depende enteramente de que exista la firma, **también queda bloqueado** hasta que esa decisión se retome. El wizard de captura de respuestas (sin firma ni hallazgos) ya es funcional de forma independiente en [[015-wizard-certificacion]]. Este documento se conserva completo como referencia de diseño.

## Historias de usuario

> **HU-3.** Como **auditor**, quiero que los incumplimientos detectados en una certificación se registren como hallazgos y se conviertan en un plan de cumplimiento con acciones correctivas, responsables y fechas límite, para darles seguimiento hasta que se resuelvan.

> **HU-4.** Como **responsable de una acción correctiva**, quiero actualizar el avance de mi acción y cargar evidencias (fotos, PDF, documentos), para demostrar que la implementé dentro del plazo.

> **HU-5.** Como **auditor**, quiero verificar cada acción correctiva marcada como "En revisión" y decidir si fue efectivamente implementada, para poder cerrar el plan de cumplimiento o solicitar nuevas acciones si algo no quedó resuelto.

> Ver [[005-certificacion-plan-cumplimiento]] para HU-1 y HU-2 (generar y firmar la certificación).

---

## Contexto

- Este sprint **no** crea un módulo nuevo: sigue ampliando el módulo `inspeccion` ya existente y ampliado por [[005-certificacion-plan-cumplimiento]]. Varios archivos creados en 005 se **amplían aquí** (mismo archivo real, misma arquitectura de módulos) — cada sección de este documento lo señala explícitamente.
- **Dependencia cruzada con 005 — documentada explícitamente:** el campo `resultadoFinal` vive en la entidad `Certificación`, definida en [[005-certificacion-plan-cumplimiento]]. Sin embargo, su **cálculo real** (regla de negocio 1 de este sprint, antes numerada 1.1 en la spec combinada original) depende de `Hallazgo.severidad`, entidad que se define aquí. Por eso:
  - La función `calcularResultadoFinal(hallazgos): ResultadoFinal` se implementa en **este** sprint (`domain/hallazgo.entity.ts` del módulo `inspeccion`), no en 005.
  - 005, por sí solo, firma toda certificación con `resultadoFinal = "APROBADA"` fijo (no tiene noción de hallazgos).
  - Este sprint **reemplaza** el stored procedure `sp_inspeccion_firmar.sql` creado en 005 (nueva migración `CREATE OR REPLACE FUNCTION`, mismo archivo) para que calcule el `resultado_final` real y bloquee la firma si hay un hallazgo `CRITICA` sin resolver.
  - Este sprint también **amplía** `firmar-certificacion.usecase.ts` y `usar-revision-certificacion.ts` (ambos creados en 005) para propagar el nuevo error `CertificacionConHallazgoCriticoError` y deshabilitar el botón "Firmar" en el frontend.
  - En resumen: **005 expone el campo, 013 expone el cálculo, y 005 lo consume** una vez que 013 está implementado — es una dependencia bidireccional de implementación (013 modifica archivos de 005) pero unidireccional de datos (005 nunca necesita conocer `Hallazgo` para compilar; solo lee `resultadoFinal` ya calculado).
- Depende también, transitivamente a través de 005, de [[003-sucursales-certificacion]] y [[004-usuarios-roles-alcance]].

---

## Alcance de este sprint

1. **Hallazgos**: registro de los incumplimientos detectados (automático desde las respuestas que no cumplen, y/o manual por el auditor).
2. **Plan de cumplimiento**: por cada hallazgo (o grupo de hallazgos), una o más acciones correctivas con responsable, fecha límite y estado.
3. **Seguimiento**: el responsable de cada acción actualiza su avance y adjunta evidencias.
4. **Verificación y cierre**: el auditor valida cada acción y aprueba (o reabre) el plan completo.
5. **Indicadores de seguimiento**: total de acciones, pendientes, vencidas, % de cumplimiento, días restantes, responsable, evidencias cargadas — vista de panel, calculados a partir del plan de cumplimiento (no se guardan como datos aparte).
6. **Cálculo real de `resultadoFinal`** de la certificación (regla 1 de este sprint) y bloqueo de firma por hallazgo crítico, ampliando los archivos correspondientes de 005 (ver "Contexto").

Este sprint **no** incluye: notificaciones automáticas (correo/push) cuando una acción está por vencer, verificación pública del PDF vía URL externa sin login, ni reportes comparativos entre sucursales o clientes (pertenece a Reportes/Analytics).

---

## Entidad Hallazgo (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `inspeccionId` | UUID FK → `inspeccion(id)` | Sí | Certificación de la que se origina el hallazgo (entidad de [[005-certificacion-plan-cumplimiento]]). |
| `detalleId` | UUID FK → `inspeccion_detalle(id)` | No | Pregunta específica que originó el hallazgo, si aplica (puede haber hallazgos generales no ligados a una pregunta puntual). |
| `descripcion` | Texto | Sí | Ej. "Extintor vencido". |
| `severidad` | Texto | Sí | `CRITICA` / `MAYOR` / `MENOR`. Determina el `resultadoFinal` de la certificación (ver Reglas de negocio) y la urgencia sugerida de la acción correctiva. |
| `creadoEn` | Timestamp | Auto | |
| `empresaId` | UUID | Sí | Del JWT, multiempresa. |

Los hallazgos pueden crearse **automáticamente** a partir de respuestas marcadas como incumplimiento (según los rangos/criterios de la ficha, con una severidad sugerida por defecto editable por el auditor) y/o **manualmente** por el auditor durante la revisión.

## Entidad HallazgoEvidencia (nueva)

Mismo patrón que `InspeccionEvidencia` (005) y `AccionCorrectivaEvidencia` (este sprint): un hallazgo puede documentarse con fotos/documentos al momento de detectarlo (ej. foto del extintor vencido), independiente de la evidencia que después cargue el responsable de la acción correctiva al resolverlo. Reutiliza `domain/evidencia.entity.ts` e `infrastructure/almacenamiento-evidencias.adapter.ts`, ambos creados en 005 — no se duplica esa lógica aquí.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `hallazgoId` | UUID FK → `hallazgo(id)` | Sí | |
| `tipo` | Texto | Sí | foto / pdf / documento |
| `url` | Texto | Sí | Ubicación en el almacenamiento del servidor (convención de ruta definida en 005 → "Entidad Evidencia"). |
| `nombre` | Texto | Sí | |
| `tamanoBytes` | Int | No | |
| `creadoEn` | Timestamp | Auto | |

---

## Entidad PlanCumplimiento (nueva, cabecera)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `inspeccionId` | UUID FK → `inspeccion(id)`, único | Sí | Una certificación tiene a lo sumo un plan de cumplimiento (se crea cuando hay al menos un hallazgo). |
| `estado` | Texto | Sí | `EN_SEGUIMIENTO` / `CERRADO` / `REABIERTO` (ver Reglas de negocio). |
| `cerradoPorId` | UUID FK → `usuario(id)` | No | Auditor que aprobó el cierre. |
| `cerradoEn` | Timestamp | No | |
| `creadoEn` | Timestamp | Auto | |

## Entidad AccionCorrectiva (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `planCumplimientoId` | UUID FK → `plan_cumplimiento(id)` | Sí | |
| `hallazgoId` | UUID FK → `hallazgo(id)` | Sí | Un hallazgo puede tener una o más acciones correctivas asociadas. |
| `descripcion` | Texto | Sí | Ej. "Sustituir el extintor". |
| `responsableId` | UUID FK → `usuario(id)` | Sí | |
| `fechaLimite` | Date | Sí | |
| `estado` | Texto | Sí | `PENDIENTE` / `EN_PROCESO` / `EN_REVISION` / `CUMPLIDO` / `NO_CUMPLIDO` / `VENCIDO` (default `PENDIENTE`). |
| `porcentajeAvance` | Int | No | 0–100, actualizado por el responsable en el seguimiento. |
| `verificadoPorId` | UUID FK → `usuario(id)` | No | Auditor que verificó la acción. |
| `verificadoEn` | Timestamp | No | |
| `comentarioVerificacion` | Texto | No | |
| `creadoEn` / `actualizadoEn` | Timestamp | Auto | |

## Entidad AccionCorrectivaEvidencia (nueva)

Mismo patrón que `InspeccionEvidencia` (005):

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `accionCorrectivaId` | UUID FK → `accion_correctiva(id)` | Sí | |
| `tipo` | Texto | Sí | foto / pdf / documento |
| `url` | Texto | Sí | |
| `nombre` | Texto | Sí | |
| `comentario` | Texto | No | Nota del responsable al cargar la evidencia (bitácora de avance). |
| `creadoEn` | Timestamp | Auto | |

---

## Evidencias: trazabilidad consolidada

`HallazgoEvidencia` y `AccionCorrectivaEvidencia` reutilizan las reglas de validación (tipo/tamaño) y la convención de ruta de almacenamiento ya definidas en [[015-wizard-certificacion]] → "Entidad Evidencia (genérica, compartida)": `certificaciones/{empresaId}/{inspeccionId}/{hallazgoId|accionCorrectivaId}/{archivo}`.

Las tres tablas de evidencia (`InspeccionEvidencia` de 005, `HallazgoEvidencia`, `AccionCorrectivaEvidencia` de este sprint) son siempre trazables hasta su `inspeccionId` (directo o vía `hallazgoId`/`accionCorrectivaId` → `planCumplimientoId` → `inspeccionId`), de forma que la pantalla de una certificación pueda mostrar **todos** sus archivos adjuntos en un solo lugar (galería/documento consolidado), no solo los de su propia tabla. Este sprint implementa esa galería consolidada (`GaleriaEvidencias`, endpoint `evidenciasConsolidadas`).

- El acceso a un archivo respeta el mismo alcance de [[004-usuarios-roles-alcance]]: un `usuario_sucursal` solo puede ver/descargar evidencias de certificaciones de su(s) sucursal(es).
- No se elimina físicamente ninguna evidencia una vez cargada — es parte del historial de la certificación (misma regla que 005).

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

> Numeradas 4-8, continuando la numeración de [[005-certificacion-plan-cumplimiento]] (Pantallas 1-3), que cubre el mismo flujo operativo secuencial.

### 4. Hallazgos de la certificación
- Lista de hallazgos (automáticos + agregados manualmente por el auditor), con severidad (Crítica/Mayor/Menor) visible como badge, y opción de agregar uno nuevo antes de generar el plan.
- Cada hallazgo permite adjuntar fotos/documentos al momento de registrarlo (evidencia del incumplimiento).
- Botón "Generar plan de cumplimiento" (solo si hay al menos un hallazgo).

### 5. Plan de cumplimiento
- Tabla: Hallazgo | Acción correctiva | Responsable | Fecha límite | Estado | Avance | Evidencias.
- Acciones: agregar acción a un hallazgo, editar, cambiar estado.
- Indicadores en la parte superior: total de acciones, pendientes, vencidas, % de cumplimiento, próximas a vencer.

### 6. Seguimiento (vista del responsable)
- Lista de "Mis acciones correctivas" (por usuario) con estado y fecha límite.
- Detalle de acción: actualizar `porcentajeAvance`, cambiar estado a `EN_REVISION`, cargar evidencias.

### 7. Verificación (vista del auditor)
- Lista de acciones en estado `EN_REVISION`.
- Por cada una: revisar evidencias, marcar `CUMPLIDO` o `NO_CUMPLIDO` (con comentario de verificación). Si `NO_CUMPLIDO`, la acción vuelve a `EN_PROCESO` con posibilidad de ajustar la fecha límite.

### 8. Cierre del plan
- Cuando todas las acciones quedan en `CUMPLIDO`, el auditor puede "Cerrar plan" (`estado = CERRADO`).
- Si después de cerrado se detecta un nuevo problema, el auditor puede "Reabrir plan" (`estado = REABIERTO`) y agregar nuevas acciones.

> Este sprint también **amplía la Pantalla 3** (Revisión y firma, definida en [[005-certificacion-plan-cumplimiento]]) para deshabilitar "Firmar y certificar" cuando hay un hallazgo `CRITICA` sin resolver, con mensaje explicativo y enlace a la Pantalla 4.

---

## Reglas de negocio

> Numeradas 1-5 en este sprint. Corresponden a las reglas 1.1, 4, 5, 7 y 8 de la especificación original combinada — la numeración original se conserva entre paréntesis para trazabilidad. Las reglas 1, 2, 3, 6 y 9 originales viven en [[005-certificacion-plan-cumplimiento]].

1. *(antes regla 1.1)* Al firmar, `resultadoFinal` se calcula así: sin hallazgos → `APROBADA`; con hallazgos de severidad `MAYOR`/`MENOR` únicamente → `APROBADA_CON_OBSERVACIONES` (se firma igual, pero abre plan de cumplimiento); con al menos un hallazgo `CRITICA` → `RECHAZADA` (no se puede firmar/certificar hasta resolver el hallazgo crítico o ejecutar una reinspección). Umbral exacto configurable por plantilla — a confirmar con negocio. **Implementada en `domain/hallazgo.entity.ts::calcularResultadoFinal()` de este sprint** (ver "Contexto" para la dependencia con 005).
2. *(antes regla 4)* Un hallazgo puede no tener acción correctiva todavía (recién detectado), pero un plan de cumplimiento no puede cerrarse mientras tenga hallazgos sin al menos una acción correctiva `CUMPLIDO`.
3. *(antes regla 5)* Una acción correctiva pasa automáticamente a `VENCIDO` si su `fechaLimite` ya pasó y su estado no es `CUMPLIDO` ni `NO_CUMPLIDO` (calculado en lectura, no job programado — ver "Decisiones tomadas" en `impl.md`).
4. *(antes regla 7)* Solo un usuario con rol de auditor (o alcance de administrador) puede verificar una acción o cerrar/reabrir un plan — un `usuario_sucursal` no puede autoverificarse su propia acción correctiva.
5. *(antes regla 8)* El `empresaId` viene siempre del JWT; el filtrado adicional por `sucursalId`/`clienteId` sigue las reglas de alcance de [[004-usuarios-roles-alcance]].

> La regla 6 de la spec combinada original (solo el `responsableId` de una acción, o un administrador con alcance, puede actualizar su avance) y la regla 9 (no eliminar físicamente) se documentan en [[005-certificacion-plan-cumplimiento]] por trazabilidad, pero sus entidades (`AccionCorrectiva`) se implementan íntegramente en este sprint — se verifican en el checklist de este sprint, no en el de 005.

---

## Decisiones pendientes (a confirmar antes de implementar)

- **Generación automática de hallazgos**: qué respuesta(s) de la ficha disparan un hallazgo automático (¿todo lo que no puntúa el máximo? ¿solo los ítems marcados como críticos?) — depende de cómo `agente-arquitecto`/negocio definan los "criterios" ya existentes en `InspeccionNodo`.
- **Vencimiento automático**: si el cambio a `VENCIDO` se calcula al vuelo (query) o vía job programado — decisión de `agente-backend`.

---

## Fuera de alcance (este sprint)

- Notificaciones automáticas (correo/push) de acciones por vencer — cubierto en [[006-vigencia-notificaciones-portal]].
- Verificación pública del PDF sin autenticación (portal externo con el código de verificación) — cubierto en [[006-vigencia-notificaciones-portal]].
- Panel ejecutivo con indicadores agregados entre certificaciones/sucursales/clientes, y calendario de planificación de auditorías — cubiertos en [[014-panel-calendario-biblioteca]].
- Reportes comparativos de cumplimiento entre sucursales/clientes (Reportes y Analytics, fuera de ambos sprints).
- Plantillas de acciones correctivas reutilizables (catálogo de acciones frecuentes) — cubierto en [[014-panel-calendario-biblioteca]].

---

## Ver también

- [[005-certificacion-plan-cumplimiento]] — HU-1, HU-2: generar y firmar la certificación. Prerrequisito de este sprint.
