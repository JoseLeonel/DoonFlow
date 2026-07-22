# Especificación — 006-vigencia-notificaciones-portal

> **Nota (2026-07-16):** este sprint se dividió en dos por tamaño. Este documento cubre solo la parte operativa/crítica (notificaciones, vigencia, escalamiento, portal público de verificación). La parte de productividad/planificación (panel ejecutivo, calendario de auditorías, biblioteca de hallazgos frecuentes) vive en [[014-panel-calendario-biblioteca]].
>
> **⏸️ Dependencia bloqueada (2026-07-16):** el wizard de captura de respuestas se separó a [[015-wizard-certificacion]] (activo), y la firma digital (`fechaVencimiento`, `codigoVerificacion`) quedó **pausada** en [[005-certificacion-plan-cumplimiento]] a pedido del usuario. Eso deja **HU-1** (recordatorio de vencimiento) y **HU-3** (portal público/QR, que valida contra `codigoVerificacion`) bloqueadas hasta que se retome 005. **HU-2** (notificación de acción) y **HU-7** (escalamiento) dependen de `AccionCorrectiva` ([[013-hallazgos-plan-cumplimiento]]), que a su vez depende de que 005 se retome — también quedan bloqueadas por la misma cadena. Se documenta este sprint completo igual, para no perder el diseño, pero no se implementa hasta que 005 se retome.

## Historias de usuario

> **HU-1.** Como **administrador de cliente**, quiero recibir un recordatorio antes de que venza la certificación de una sucursal, para iniciar a tiempo la recertificación y no operar con un certificado vencido.

> **HU-2.** Como **responsable de una acción correctiva**, quiero recibir una notificación cuando se me asigna una acción y cuando está por vencer, para no depender de entrar al sistema a revisar manualmente.

> **HU-3.** Como **tercero externo** (cliente del cliente, autoridad, público en general), quiero escanear un código QR o ingresar el código de verificación de un certificado, para confirmar que es auténtico y vigente sin necesidad de una cuenta en el sistema.

> **HU-7.** Como **administrador de cliente o auditor**, quiero que una acción correctiva vencida sin actualizarse se escale automáticamente a un responsable superior, para que no dependa únicamente de que el responsable original entre a revisar sus notificaciones.

---

## Contexto

Este sprint toma los vacíos identificados al revisar [[002-crud-clientes]]–[[015-wizard-certificacion]] contra cómo operan sistemas de certificación/cumplimiento maduros (ISO, HACCP, plataformas tipo SafetyCulture o Qualio): el motor de certificación (wizard en 015, firma pausada en 005, hallazgos/plan en 013) cubre evaluación → (firma) → hallazgos → plan de cumplimiento, pero le falta lo que hace que una certificación sea confiable y operable a escala — vigencia real, alguien avisando cuando algo se vence, y forma de que un tercero la valide.

No introduce entidades de negocio nuevas de certificación — trabaja **sobre** lo que definen [[015-wizard-certificacion]] (`Inspeccion.sucursalId`/`periodoEtiqueta`), [[005-certificacion-plan-cumplimiento]] (pausado: `Inspeccion.fechaVencimiento`/`codigoVerificacion`) y [[013-hallazgos-plan-cumplimiento]] (`AccionCorrectiva.fechaLimite`, `Hallazgo.severidad`).

---

## Alcance de este sprint

1. **Notificaciones** in-app (mínimo) y por correo (si el proveedor de correo ya está configurado, si no queda como cola pendiente de envío) para: acción correctiva asignada, acción por vencer (N días antes, configurable), acción vencida, certificación por vencer (N días antes), hallazgo crítico nuevo.
2. **Portal público de verificación**: página sin autenticación donde se ingresa (o se llega vía QR) el `codigoVerificacion` de una certificación y se muestra su estado (vigente/vencida/revocada), cliente, sucursal, fecha de emisión y vencimiento — sin exponer el detalle de respuestas ni hallazgos internos.
3. **QR en el PDF de certificación**: el PDF generado en [[005-certificacion-plan-cumplimiento]] incluye un código QR que apunta al portal de verificación.
4. **Recordatorio y flujo de recertificación**: al acercarse `fechaVencimiento`, se notifica al alcance correspondiente ([[004-usuarios-roles-alcance]]) y se ofrece iniciar directamente una nueva certificación para esa sucursal.
5. **Escalamiento de acción correctiva vencida** (HU-7): una acción que sigue vencida más allá de un umbral notifica automáticamente a un responsable superior.

Este sprint **no** rediseña el motor de certificación en sí (eso es [[005-certificacion-plan-cumplimiento]]), ni construye reportes exportables/comparativos avanzados (Reportes y Analytics, módulo aparte), ni cubre el panel ejecutivo, calendario de auditorías o biblioteca de hallazgos frecuentes (ver [[014-panel-calendario-biblioteca]]).

---

## Entidad Notificacion (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `usuarioId` | UUID FK → `usuario(id)` | Sí | Destinatario. |
| `tipo` | Texto | Sí | `ACCION_ASIGNADA` / `ACCION_POR_VENCER` / `ACCION_VENCIDA` / `ACCION_ESCALADA` / `CERTIFICACION_POR_VENCER` / `HALLAZGO_CRITICO` |
| `referenciaTipo` | Texto | Sí | `accion_correctiva` / `inspeccion` / `hallazgo` — a qué entidad apunta. |
| `referenciaId` | UUID | Sí | |
| `mensaje` | Texto | Sí | Texto ya resuelto (no plantilla) para mostrar en el listado. |
| `leidaEn` | Timestamp | No | Null mientras no se marca como leída. |
| `enviadaPorCorreo` | Boolean | Sí | Si además se envió por correo (default `false` si el proveedor no está configurado todavía). |
| `creadoEn` | Timestamp | Auto | |
| `empresaId` | UUID | Sí | Del JWT. |

Generadas por un **job programado** (diario, revisa vencimientos próximos) más eventos síncronos (asignar acción → notifica al instante). Decisión de implementación (cron vs. trigger de BD) a cargo de `agente-backend`.

## Entidad EventoAuditoriaCertificacion (para el portal público)

No se crea entidad nueva: el portal de verificación **solo lee** campos ya públicos por diseño de `Inspeccion` (`codigoVerificacion`, `estado`, `resultadoFinal`, `fechaVencimiento`, nombre de cliente/sucursal) — nunca expone `InspeccionDetalle`, `Hallazgo` ni evidencias. Acceso de solo lectura, sin autenticación, limitado por `codigoVerificacion` exacto (no hay listado navegable).

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Centro de notificaciones
- Ícono de campana en el header con contador de no leídas (patrón estándar de `nextjs-admin-dashboard-main`, ver `CLAUDE.md` → Sistema de diseño).
- Lista desplegable con las notificaciones recientes, click navega a la entidad referenciada (acción, certificación, hallazgo).

### 2. Portal de verificación pública (`/verificar/[codigo]`, fuera del layout autenticado del dashboard)
- Input para ingresar el código si se llega sin uno en la URL (ej. alguien lo escribe a mano).
- Resultado: sello visual "Vigente" (verde) / "Vencida" (gris) / "No encontrada", cliente, sucursal, fechas de emisión y vencimiento, plantilla certificada.
- Sin navegación al resto del sistema, sin exponer datos internos.

---

## Reglas de negocio

1. Los recordatorios de vencimiento (acción y certificación) se generan a los **30, 15 y 5 días** antes de la fecha límite, más una notificación el día que vence — valores por defecto, configurables a nivel de empresa tenant si el negocio lo pide más adelante.
2. El portal de verificación pública nunca requiere login y nunca lista certificaciones — solo resuelve un `codigoVerificacion` exacto, para evitar exponer el catálogo completo de clientes/certificaciones.
3. Una certificación con `estado = FIRMADA` y `fechaVencimiento` pasada se muestra como "Vencida" tanto en el portal público como en el panel ejecutivo ([[014-panel-calendario-biblioteca]]), aunque su registro no cambia de estado internamente (es un cálculo de presentación, no una transición de estado adicional).
4. El filtrado de notificaciones respeta siempre el alcance por `Cliente`/`Sucursal` definido en [[004-usuarios-roles-alcance]].
5. Una `AccionCorrectiva` ([[005-certificacion-plan-cumplimiento]]) que permanece `VENCIDA` más de **7 días** (valor por defecto, configurable) sin cambio de estado ni avance genera una notificación `ACCION_ESCALADA` al `administrador_cliente` del cliente correspondiente (o al administrador general si no hay uno asignado), además de la que ya recibió el responsable original. Se escala una sola vez por acción — no se repite en cada corrida del job mientras siga vencida, para no saturar de notificaciones.

---

## Decisiones pendientes (a confirmar antes de implementar)

- **Proveedor de envío de correo** para notificaciones — pendiente, ver `CLAUDE.md` → Despliegue (aún no hay proveedor de hosting/servicios de `apps/api` definido).
- **Umbral de días de recordatorio** — 30/15/5 propuesto arriba, a validar con negocio.
- **Vigencia por defecto de una certificación** (cuántos meses agrega a `fechaVencimiento` al firmar) — probablemente configurable por plantilla, decisión de `agente-arquitecto`/negocio.

---

## Fuera de alcance (este sprint)

- Panel ejecutivo, calendario de auditorías y biblioteca de hallazgos frecuentes — ver [[014-panel-calendario-biblioteca]].
- Reportes exportables (Excel/PDF) y comparativas entre sucursales/clientes — Reportes y Analytics, módulo aparte.
- Notificaciones push nativas (móvil) — el objetivo responsive del proyecto es tablet/desktop (ver `CLAUDE.md`), no hay app móvil.
- Revocación manual de una certificación ya firmada (hoy solo "vencida" por fecha, no un estado `REVOCADA` explícito) — a evaluar si el negocio lo requiere.
- Firma digital con validez legal certificada (PKI, firma electrónica avanzada) — el `codigoVerificacion` de este sprint es un mecanismo de confianza interno, no una firma electrónica calificada.

---

## Ver también

- [[014-panel-calendario-biblioteca]] — panel ejecutivo (HU-4), calendario de auditorías (HU-5) y biblioteca de hallazgos frecuentes (HU-6), separados de este sprint por tamaño.
