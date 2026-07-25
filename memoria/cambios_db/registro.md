# Registro de cambios de base de datos

Ver formato y diferencia con `packages/db/produccion/` en `memoria/cambios_db/README.md`. Más reciente arriba.

---

## [2026-07-25] Comentarios categorizados del wizard + clasificación del reporte de hallazgos (revisión de audios WhatsApp del cliente)

- Tipo: 2 columnas eliminadas + 1 enum eliminado (`InspeccionNodo`) + 1 columna reemplazada por 3 (`InspeccionDetalle`) + 2 columnas nuevas (`Hallazgo`, una de ellas relaja un `NOT NULL` existente) + 1 índice nuevo
- Módulo: `inspeccion` (extiende 013-hallazgos-plan-cumplimiento y 015-wizard-certificacion)
- Motivo: el cliente pidió en varios audios de WhatsApp (2026-06-03/04, revisados el 2026-07-25) que cada pregunta del wizard tenga 3 comentarios siempre visibles — reconocimiento, observación, oportunidad de mejora — independientes de si la respuesta es Sí o No, y que el reporte de hallazgos los clasifique en esas 3 categorías además de las no conformidades.
- Detalle:
  - `inspeccion_nodo`: se eliminan `regla_comentario` (enum `ReglaComentario`) y `umbral_comentario` — el comentario condicional único por pregunta queda reemplazado por completo, no coexiste con el sistema nuevo.
  - `inspeccion_detalle`: se elimina `comentario` (único) y se agregan `comentario_reconocimiento`, `comentario_observacion`, `comentario_oportunidad_mejora` (los 3 `TEXT` nullable, sin límite de BD — el límite de 1500 caracteres con contador vive solo en la validación Zod/UI, pedido explícito del cliente).
  - `hallazgo`: se agrega `categoria` (`VARCHAR(20)`, default `'NO_CONFORMIDAD'` — valores `NO_CONFORMIDAD`/`RECONOCIMIENTO`/`OBSERVACION`/`OPORTUNIDAD_MEJORA`) y se relaja `severidad` a nullable (`null` para las 3 categorías informativas, que no disparan plan de cumplimiento ni notificación — solo `NO_CONFORMIDAD` conserva el comportamiento existente de 013). Índice nuevo `(inspeccion_id, categoria)`.
  - `sp_inspeccion_firmar.sql` **no se modificó** — sus filtros `severidad = 'CRITICA'` / `severidad IN ('MAYOR','MENOR')` ya excluyen naturalmente las filas con `severidad IS NULL`.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260725000000_add_comentarios_categorizados/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía `prisma migrate deploy` (DB alcanzable en esta sesión). `prisma generate` ejecutado. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-24] Período de certificación como rango de fechas (post-roadmap, exploración manual)

- Tipo: 2 columnas nuevas + 1 índice nuevo (sin tabla nueva)
- Módulo: `inspeccion` (extensión de `Inspeccion`/certificación)
- Detalle: `inspeccion.fecha_inicio_periodo` y `.fecha_fin_periodo` (`DATE`, nullable) — rango de vigencia del período auditado, reemplaza `periodo_etiqueta` (texto libre) para certificaciones nuevas. `periodo_etiqueta` se marca `@deprecated` en el schema pero **no se elimina ni se migra** (columna nullable, ~33 filas existentes la siguen usando como único dato de período). Índice `(sucursal_id, plantilla_id, fecha_fin_periodo)` para el lookup de vigencia (`buscarPeriodoVigente`, bloquea iniciar otra certificación para la misma sucursal+plantilla mientras `fecha_fin_periodo >= hoy`).
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260724010000_add_periodo_fechas/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía `prisma db execute` + registro manual en `_prisma_migrations` (entorno no interactivo, `psql` no disponible en el PATH de esta sesión). `prisma generate` ejecutado (requirió reiniciar el proceso `tsx watch` de `apps/api` que tenía el `.dll` del query engine bloqueado en Windows). Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-24] Claves de API para verificación programática — 009-integraciones-datos-masivos (HU-3, retomada)

- Tipo: 1 tabla nueva
- Módulo: `integraciones` (extensión — HU-1/HU-2 de este mismo módulo ya estaban implementadas desde 2026-07-21; HU-3 había quedado pospuesta por depender del portal `/verificar/[codigo]` de 006, implementado el 2026-07-23).
- Detalle: `api_key`: `empresa_id` (FK cascade), `nombre`, `clave_hash` (único — hash SHA-256 de la clave real; el texto plano solo se muestra una vez, al crearla, nunca se persiste), `activa` (default `true`, revocar = `false`, no se elimina físicamente), `ultimo_uso_en` (nullable, se actualiza en cada request exitoso a la API pública), `creado_por_id` (FK a `usuario`, `ON DELETE RESTRICT`). Índice único en `clave_hash` (lookup del middleware de autenticación por API key) e índice `(empresa_id, activa)` (listado de la pantalla de gestión).
- **Nota de diseño**: no se usó `enum` de Prisma para ningún campo de este sprint — `activa` es `Boolean`, no un campo de estado con más de 2 valores, así que no aplica el riesgo ya documentado en 011/006/014 (enum de Prisma vs columna VARCHAR real).
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260724000000_add_api_key/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-23] Planificación y biblioteca de hallazgos frecuentes — 014-panel-calendario-biblioteca

- Tipo: 2 tablas nuevas (el panel ejecutivo, HU-4, no agrega tabla — lee agregados vía Prisma desde `reportes`, sin SP nuevo, mismo patrón que 008).
- Módulo: backend nuevos `planificacion` (calendario de auditorías, HU-5) y `hallazgos-frecuentes` (biblioteca, HU-6).
- Detalle:
  - `plan_auditoria`: `sucursal_id` (FK restrict), `fecha_objetivo` (DATE), `responsable_sugerido_id` (FK opcional a `usuario`, `ON DELETE SET NULL`), `estado` (VARCHAR(20), no enum de Postgres — misma lección de 011/006), `inspeccion_id` (FK opcional **única** a `inspeccion`, `ON DELETE SET NULL` — se completa cuando el plan se vincula a una certificación real). Índices `(sucursal_id, fecha_objetivo)`, `(empresa_id, estado)`.
  - `hallazgo_frecuente`: catálogo simple (`descripcion_hallazgo`, `severidad_sugerida` VARCHAR(10), `descripcion_accion_sugerida` opcional, `activo`). Índice `(empresa_id, activo)`. Nunca se referencia por FK desde `hallazgo` — se copia el texto al usarla (regla 3 de la spec).
- **Desviación real de diseño**: el `task.md`/`impl.md` originales (2026-07-16) pedían vincular `PlanAuditoria.inspeccionId` **al firmar** la certificación (llamando `PATCH /planificacion/:id/ejecutar` desde el caso de uso de firma de 005). Se vinculó en su lugar **al iniciar** la certificación (`POST /inspeccion/certificaciones` con `planId` opcional en el body) — evita tener que arrastrar el `planId` a través de todo el wizard (iniciar → responder → revisión → firmar, varios pasos y posiblemente varias sesiones) hasta el momento de la firma, y refleja mejor que el plan "se ejecutó" en cuanto la auditoría realmente arrancó, no solo si además se llega a firmar. Documentado en `impl.md`.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260723180000_add_planificacion_hallazgos_frecuentes/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations`. `prisma generate` ejecutado. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-23] Notificaciones — 006-vigencia-notificaciones-portal

- Tipo: 1 tabla nueva + 2 stored procedures nuevos
- Módulo: backend nuevos `notificaciones` (in-app, job diario) y `verificacion` (portal público de solo lectura, sin tabla propia — lee campos ya públicos de `inspeccion`).
- Detalle:
  - `notificacion`: `usuario_id` (FK cascade), `tipo`/`referencia_tipo` (VARCHAR, no enum de Postgres — misma lección de 011), `referencia_id`, `mensaje`, `leida_en` (nullable), `enviada_por_correo` (default `false`), `empresa_id` (FK cascade). Índices `(usuario_id, leida_en)`, `(empresa_id, creado_en)`, `(referencia_tipo, referencia_id, tipo, creado_en)` (idempotencia del job).
  - `sp_notificacion_generar_vencimientos()`: recorre `accion_correctiva` (no terminal, a 30/15/5/0 días de `fecha_limite` o ya vencida) e `inspeccion` (`FIRMADA`, a 30/15/5/0 días de `fecha_vencimiento`), inserta `ACCION_POR_VENCER`/`ACCION_VENCIDA`/`CERTIFICACION_POR_VENCER` sin duplicar en 24h (usa el índice compuesto). El destinatario de la notificación de certificación es todo `usuario` con alcance sobre esa sucursal (administrador de empresa, administrador_cliente del cliente dueño, usuario_sucursal directo o vía `usuario_sucursal_acceso`).
  - `sp_accion_correctiva_escalar()`: recorre `accion_correctiva` vencida hace más de 7 días sin `ACCION_ESCALADA` previa, notifica al `administrador_cliente` del cliente dueño (resuelto vía `hallazgo → inspeccion → sucursal → cliente`) o, si no hay ninguno, al primer `administrador` de la empresa. **Desviación real**: el `task.md`/`impl.md` originales (2026-07-16) decían "cae al administrador_general de la empresa" — ese rol no existe en `ROLES_SISTEMA` (misma lección ya documentada en 011); se usa `administrador` real.
  - **Bug real encontrado y corregido en la verificación E2E de la misma sesión**: la primera versión de `sp_accion_correctiva_escalar()` filtraba `WHERE ac.estado = 'VENCIDO'` — pero `'VENCIDO'` **nunca se persiste** en la columna `estado` de `accion_correctiva` (013 lo calcula solo en lectura vía `calcularEstadoEfectivo()`, documentado en `domain/accion-correctiva.entity.ts`), así que el filtro no encontraba ninguna fila jamás y el escalamiento (HU-7) quedaba silenciosamente roto. Corregido a `estado NOT IN ('CUMPLIDO', 'NO_CUMPLIDO') AND fecha_limite < now() - interval '7 days'` (misma lógica que `calcularEstadoEfectivo`). Detectado forzando una acción vencida vía `UPDATE` directo y confirmando que la primera versión del SP no la encontraba.
- Los eventos síncronos `ACCION_ASIGNADA` (al crear una `AccionCorrectiva`) y `HALLAZGO_CRITICO` (al registrar un hallazgo `CRITICA`) no pasan por SP — se disparan inline desde los casos de uso existentes del módulo `inspeccion`, vía un wrapper `RegistradorNotificacion`/`NotificadorCliente` (mismo patrón que `RegistradorEventoAuditoria` de 010).
- Job diario: `node-cron`, mismo patrón que `job-purgar-retencion.job.ts` (010) — no una abstracción `programador.ts` genérica separada, para no introducir una capa que el resto del proyecto no usa.
- **RLS**: no se agregan policies nuevas — mismo patrón sin RLS real desde 007.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260723120000_add_notificaciones/migration.sql`, `packages/db/sql/procedimientos/sp_notificacion_generar_vencimientos.sql`, `packages/db/sql/procedimientos/sp_accion_correctiva_escalar.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations`. `prisma generate` ejecutado. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-23] Aceptación del cliente y apelaciones — 011-aceptacion-apelaciones-certificacion

- Tipo: 2 columnas nuevas en `inspeccion` + 1 columna nueva en `hallazgo` + 1 tabla nueva + 1 permiso nuevo
- Módulo: `inspeccion` (aceptación, mismo módulo de 005/013) + módulo backend nuevo `apelaciones` (hexagonal propio, consume `inspeccion`/`hallazgo` solo vía puerto).
- Detalle:
  - `inspeccion.aceptado_por_cliente_id` (FK opcional a `usuario`, `ON DELETE SET NULL`) / `aceptado_en` (TIMESTAMP): reconocimiento informativo del cliente sobre una certificación `FIRMADA` — no cambia `estado`, no bloquea el certificado.
  - `hallazgo.estado` (VARCHAR(30), default `'ACTIVO'`, acepta `'ANULADO_POR_APELACION'`): campo nuevo y **separado** de `severidad` (reutilizarla habría roto el cálculo de `resultadoFinal` de 013). `calcularResultadoFinal()` (013) se reutiliza sin cambios, filtrando primero los hallazgos `ACTIVO` antes de pasarlos.
  - `apelacion`: `inspeccion_id` (FK cascade), `hallazgo_id` (FK opcional, `ON DELETE SET NULL` — null si `tipo=SOBRE_RESULTADO`), `tipo`/`estado` (TEXT, no enum de Postgres a nivel SQL aunque el schema de Prisma sí los declara como enum — mismo criterio ya usado en `plan_cumplimiento.estado`/`accion_correctiva.estado`), `motivo`, `solicitado_por_id`/`resuelto_por_id` (FK a `usuario`), `resolucion_comentario`. Índices `(empresa_id, estado)`, `(inspeccion_id)`, `(hallazgo_id)`.
  - Permiso `apelaciones.resolver` (catálogo, upsert por `codigo`) vía `packages/db/prisma/seeds/permisos-apelaciones.ts`.
- **Desviaciones respecto al plan original (`task.md`/`impl.md` del sprint, escritos 2026-07-16 antes de que 004/007 fijaran los nombres reales)**:
  - El rol `administrador_general` que el plan pedía asignar junto a `auditor` **no existe** en `ROLES_SISTEMA` (los roles reales son `administrador`/`productor`/`operario`/`auditor`/`cliente_externo`/`administrador_cliente`/`usuario_sucursal`, fijados desde 004) — probablemente una referencia genérica que quedó desactualizada.
  - Siguiendo el mismo criterio que `sembrarPermisosGobernanza` (007), el seed **no asigna** `RolPermiso` por defecto ni siquiera a `auditor` — el permiso se crea en el catálogo y un administrador lo asigna desde la matriz `/mantenimientos/roles`. Es más consistente con el resto del proyecto que el automatismo pedido originalmente.
  - No se agregan policies RLS nuevas — mismo patrón sin RLS real desde 007 (aislamiento multiempresa vive en `infrastructure/`, filtrando siempre por `empresaId`).
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260723000000_add_aceptacion_apelaciones/migration.sql`, `packages/db/prisma/seeds/permisos-apelaciones.ts`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado. Seed corrido dos veces sin duplicar el permiso. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-22] Hallazgos y plan de cumplimiento — 013-hallazgos-plan-cumplimiento

- Tipo: 5 tablas nuevas + 1 stored procedure reemplazado (`CREATE OR REPLACE`) + 1 stored procedure nuevo
- Módulo: ampliación de `inspeccion` (mismo módulo del wizard de 015 y de la firma de 005) — sin módulo backend nuevo.
- Detalle:
  - `hallazgo`: `inspeccion_id` (FK cascade), `detalle_id` (FK opcional a `inspeccion_detalle`, `ON DELETE SET NULL`), `descripcion`, `severidad` (VARCHAR(20): `CRITICA`/`MAYOR`/`MENOR`), `empresa_id`. Índices `(inspeccion_id)` y `(empresa_id, severidad)`.
  - `hallazgo_evidencia`: mismo patrón que `inspeccion_evidencia` (005), FK cascade a `hallazgo`.
  - `plan_cumplimiento`: `inspeccion_id` **único** (una certificación tiene a lo sumo un plan), `estado` (VARCHAR(20): `EN_SEGUIMIENTO`/`CERRADO`/`REABIERTO`), `cerrado_por_id` (FK opcional a `usuario`, `ON DELETE SET NULL`), `cerrado_en`.
  - `accion_correctiva`: `plan_cumplimiento_id` (FK cascade), `hallazgo_id` (FK restrict — un hallazgo no se borra mientras tenga acciones), `descripcion`, `responsable_id`/`verificado_por_id` (FK a `usuario`), `fecha_limite` (DATE), `estado` (VARCHAR(20), default `PENDIENTE`), `porcentaje_avance`, `comentario_verificacion`. Índices `(plan_cumplimiento_id)`, `(hallazgo_id)`, `(responsable_id, estado)`, `(fecha_limite)` (soporta el cálculo de vencidas en lectura).
  - `accion_correctiva_evidencia`: mismo patrón que las otras dos tablas de evidencia, FK cascade a `accion_correctiva`.
  - `severidad`/`estado` de `plan_cumplimiento` y `accion_correctiva` son `VARCHAR`, no enum de Postgres — mismo criterio ya usado en `Inspeccion.estado`/`resultadoFinal` (validado en Zod, capa de aplicación).
  - `sp_inspeccion_firmar` (mismo archivo `packages/db/sql/procedimientos/sp_inspeccion_firmar.sql`, `CREATE OR REPLACE`, la migración de 005 no se edita): agrega el bloqueo por hallazgo `CRITICA` sin ninguna `accion_correctiva` `CUMPLIDO` (`RAISE EXCEPTION 'hallazgo_critico_pendiente'`, revierte toda la transacción) y reemplaza el `resultado_final` fijo `'APROBADA'` de 005 por el cálculo real de la regla 1 (sin hallazgos → `APROBADA`; con `MAYOR`/`MENOR` → `APROBADA_CON_OBSERVACIONES`).
  - `sp_plan_cumplimiento_indicadores(p_plan_id)` nuevo: agregado de `total`/`pendientes`/`en_proceso`/`en_revision`/`cumplidas`/`no_cumplidas`/`vencidas`/`porcentaje_cumplimiento`/`proximas_a_vencer`, aplicando el mismo cálculo de "vencido" en lectura que `domain/accion-correctiva.entity.ts::calcularEstadoEfectivo()` (sin job programado — decisión documentada en `impl.md` del sprint).
- **Desviación respecto al plan original**: el seed `certificaciones-demo.ts` que `task.md`/`impl.md` de 005 y 013 dan por existente **nunca se creó** en 005 (esa sesión verificó por curl contra certificaciones creadas en vivo, no por seed) — no hay fixture de certificación demo de la cual colgar hallazgos/plan. No se crea el seed en este sprint tampoco; la verificación E2E se hace igual que 005, generando una certificación real vía API. Documentado también en `impl.md` de este sprint.
- **RLS**: no se agregan policies nuevas en `packages/db/sql/rls/` — mismo patrón de todos los sprints desde 007 en adelante (el aislamiento multiempresa real se aplica en `infrastructure/` de cada repositorio Prisma, filtrando siempre por `empresaId`/trazando hasta `inspeccion.empresa_id`; `auth_rls.sql` original nunca se extendió a las tablas de dominio agregadas después de 004, ver TODO ya documentado ahí). `hallazgo` tiene `empresa_id` propio (copiado de la certificación al crearse); las demás tablas se trazan vía `EXISTS`/join hasta `hallazgo`/`plan_cumplimiento`/`inspeccion` en el filtro de la capa de aplicación, no en SQL.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260722000000_add_hallazgos_plan_cumplimiento/migration.sql`, `packages/db/sql/procedimientos/sp_inspeccion_firmar.sql` (reemplazado), `packages/db/sql/procedimientos/sp_plan_cumplimiento_indicadores.sql` (nuevo)
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-21] Firma de certificación (Inspeccion.firmadoPorId/etc.) — 005-certificacion-plan-cumplimiento (retomado)

- Tipo: 6 columnas nuevas + 1 índice único + 1 FK en tabla existente + 1 stored procedure nuevo
- Módulo: ampliación de `inspeccion` (mismo módulo del wizard de 015) — sin tabla nueva. Sprint 005 estaba pausado desde 2026-07-16; el usuario decidió retomarlo esta sesión en vez de continuar con 014.
- Detalle: `inspeccion.firmado_por_id` (FK → `usuario.id`, `ON DELETE SET NULL`), `firmado_en` (TIMESTAMP), `codigo_verificacion` (VARCHAR(20), **único en todo el sistema**, no solo por empresa), `pdf_url` (TEXT), `fecha_vencimiento` (DATE), `resultado_final` (VARCHAR(30), fijo en `'APROBADA'` hasta que 013-hallazgos-plan-cumplimiento calcule el valor real por severidad).
- Stored procedure `sp_inspeccion_firmar(p_inspeccion_id, p_usuario_id, p_codigo_verificacion, p_meses_vigencia=12)`: bloquea la fila (`FOR UPDATE`), valida `estado='EN_PROGRESO'`, recalcula `puntaje_obtenido`/`puntaje_maximo`/`porcentaje_cumplimiento`/`clasificacion` desde `inspeccion_detalle`/`inspeccion_plantilla`/`inspeccion_rango_resultado` (antes solo se calculaban al vuelo en TS, nunca se persistían), y en una sola transacción actualiza `estado='FIRMADA'` + los campos de firma. **Desviación respecto al `impl.md` original de 005**: el código de verificación se genera en TypeScript (`generarCodigoVerificacion()`, dominio) y se reintenta desde la capa de aplicación ante colisión `unique_violation`, no dentro del SP — evita duplicar el algoritmo de generación en dos lenguajes.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260721230000_add_firma_certificacion/migration.sql`, `packages/db/sql/procedimientos/sp_inspeccion_firmar.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations`. `prisma generate` ejecutado sin problemas (sin servidor Node bloqueando el puerto 4000). Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-21] Inspeccion.capturaOffline / sincronizadoEn — 012-captura-offline-campo

- Tipo: 2 columnas nuevas + 1 índice en tabla existente
- Módulo: ampliación de `inspeccion` (mismo módulo del wizard de 015 y del editor de plantillas de 001) — sin tabla nueva.
- Detalle: `inspeccion.captura_offline` (BOOLEAN NOT NULL DEFAULT false — se marca `true` la primera vez que se sincroniza un lote enviado como captura offline), `inspeccion.sincronizado_en` (TIMESTAMPTZ nullable — última vez que un lote de sincronización se procesó sin dejar pendientes). Índice `(empresa_id, captura_offline)` para el filtro administrativo de certificaciones capturadas offline.
- **No se modifica `inspeccion_detalle` ni `inspeccion_evidencia`** — la idempotencia de sincronización (reenviar el mismo `nodoId` no duplica fila) reutiliza el upsert por `(inspeccionId, nodoId)` que ya usa `guardarRespuestasSeccion()` desde 015-wizard-certificacion, ahora extendido con comparación de `actualizadoEn` vs `capturadoEnCliente` para resolver conflictos de doble captura offline (ver `impl.md` del sprint 012).
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260721220000_add_captura_offline_inspeccion/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado sin problemas (sin servidor Node bloqueando el puerto 4000 esta vez). Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-21] ImportacionLote — 009-integraciones-datos-masivos (alcance reducido)

- Tipo: enum nuevo + tabla nueva
- Módulo: nuevo módulo `integraciones` (solo HU-1/HU-2 de este sprint — importación masiva de Cliente/Sucursal)
- Detalle: enum `TipoImportacion` (`CLIENTE`/`SUCURSAL`). Tabla `importacion_lote`: `tipo`, `archivo_nombre`, `total_filas`, `filas_exitosas`, `filas_con_error`, `detalle_errores` (JSONB nullable), `creado_por_id` (FK `ON DELETE RESTRICT`), `empresa_id`. Índice `(empresa_id, tipo, creado_en)`. Nunca se borra una fila (trazabilidad de qué se importó y cuándo).
- **Desviación importante**: el spec original de este sprint (T-390) también pedía la tabla `api_key` (enum `TipoImportacion` + modelo `ApiKey`) para la HU-3 (API pública de verificación autenticada). **No se creó** — HU-3 depende de `Inspeccion.codigoVerificacion`/`fechaVencimiento` (campos de 005, pausado) y del portal `/verificar/[codigo]` de 006 (nunca implementado, sin código). Se preguntó al usuario cómo proceder (implementar solo HU-1/HU-2 / adaptar HU-3 sin código de verificación / omitir toda la infraestructura de API keys) y eligió implementar solo HU-1/HU-2 esta sesión, dejando HU-3 documentada como bloqueada. Ver `memoria/decisiones.md` y `memoria/sprint/009-integraciones-datos-masivos/impl.md`.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260721210000_add_importacion_lote/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations`. `prisma generate` ejecutado sin problemas (sin servidor Node bloqueando esta vez). Pendiente aplicar en producción cuando exista ese ambiente. La tabla `api_key` queda pendiente de crear cuando se retome HU-3.

---

## [2026-07-21] ReporteGenerado — 008-reportes-analytics

- Tipo: 2 enums nuevos + 1 tabla nueva + 1 FK + 1 índice de soporte en tabla existente
- Módulo: nuevo módulo `reportes` (transversal, solo lee de `inspeccion`/`sucursal`/`cliente`, no los modifica)
- Detalle: enums `TipoReporte` (`CONSOLIDADO_CLIENTE`/`COMPARATIVO_SUCURSALES`) y `FormatoReporte` (`EXCEL`/`PDF`). Tabla `reporte_generado`: `empresa_id`, `tipo`, `filtros` (JSONB, snapshot de cliente/sucursales/rango de fechas), `formato`, `url`, `generado_por_id` (FK `ON DELETE RESTRICT`). Índices `(empresa_id, creado_en DESC)` y `(empresa_id, tipo)`. Nunca se borra una fila (regla de negocio 2 del spec — historial de qué se compartió). Índice adicional `inspeccion(sucursal_id, fecha_inicio)` para las queries agregadas de reportes por rango de fechas.
- **Desviación importante respecto al spec original** (ver `memoria/decisiones.md`, entrada 2026-07-21, y `impl.md` del sprint): el spec pedía índices sobre `inspeccion(sucursal_id, estado, firmado_en)`, `inspeccion(empresa_id, fecha_vencimiento)`, `hallazgo(inspeccion_id, severidad)` y `accion_correctiva(plan_cumplimiento_id, estado)` — **ninguna de esas columnas/tablas existe todavía** (`firmadoEn`/`fechaVencimiento` son de 005, pausado; `Hallazgo`/`AccionCorrectiva` son de 013, bloqueado por 005). Por decisión explícita del usuario, el alcance de los reportes se redujo a los datos reales disponibles hoy (`Inspeccion.puntajeObtenido`/`porcentajeCumplimiento`/`clasificacion`/`fechaInicio`), sin esas columnas/índices. Se agrega el índice real que sí hace falta para las queries adaptadas.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260721190000_add_reportes_generados/migration.sql`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado (nota: falló la primera vez por `EPERM` — un servidor `apps/api` (`tsx watch`) seguía corriendo en el puerto 4000 desde una sesión anterior sin detenerse correctamente; se detuvo el proceso y se corrió de nuevo sin problema, ver convención ya documentada de detener servidores Node antes de `prisma generate`). Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-21] Auditoría transversal + retención + privacidad + índices de paginación — 010-seguridad-privacidad-continuidad

- Tipo: 3 tablas nuevas + 2 índices nuevos en tablas existentes + SP nuevo + seed
- Módulo: nuevo módulo transversal `auditoria`/`retencion`/`privacidad` (no cuelga de ningún módulo de negocio existente)
- Detalle:
  - `registro_auditoria` (append-only, sin `updated_at`/`deleted_at`, sin trigger de actualización): `empresa_id`, `usuario_id` (FK `ON DELETE RESTRICT` — nunca se cascada-borra un log de auditoría), `accion`, `entidad_tipo`, `entidad_id`, `valor_antes`/`valor_despues` (JSONB nullable), `ip` (nullable). Índices `(empresa_id, accion, creado_en DESC)`, `(usuario_id)`, `(entidad_tipo, entidad_id)`.
  - `politica_retencion`: `empresa_id`, `tipo_dato` (`EVIDENCIA`/`PDF_CERTIFICACION`/`DATO_PERSONAL_CONTACTO`), `meses_retencion`, `accion_al_vencer` (`ANONIMIZAR`/`ELIMINAR`). Índice único `(empresa_id, tipo_dato)`. Seed `politica-retencion-demo.ts`: 3 filas de ejemplo para la empresa demo (valores no son la política legal final, pendiente validación legal/negocio).
  - `aviso_privacidad`: `entidad_tipo` (`CLIENTE`/`SUCURSAL`), `entidad_id`, `base_legal`, `registrado_por_id` (FK `ON DELETE RESTRICT`). Índice `(entidad_tipo, entidad_id)`.
  - Índices de paginación server-side: `cliente(empresa_id, creado_en)`, `inspeccion(empresa_id, sucursal_id, estado, creado_en)`. `sucursal(empresa_id, cliente_id, activo)` ya existía desde 003, no se recreó.
  - SP `sp_retencion_purgar_datos(p_empresa_id TEXT)` en `packages/db/sql/procedimientos/`: recorre `politica_retencion` de la empresa y aplica `ANONIMIZAR`/`ELIMINAR` sobre `inspeccion_evidencia` (por antigüedad de `creado_en`) y anonimiza contacto de `cliente`/`sucursal` **inactivos** cuya `actualizado_en` supera `meses_retencion`. Nunca escribe en `registro_auditoria` (lo hace la capa de infraestructura del job, a partir del resultado del SP) ni la purga.
  - **Desviación respecto al spec original** (documentada también en `impl.md` del sprint): (1) `p_empresa_id` es `TEXT`, no `UUID` — todos los `id` del schema ya son `TEXT` (`String @id @default(uuid())` de Prisma), no hay ninguna columna `UUID` nativa en esta base; (2) `PDF_CERTIFICACION` queda sin efecto en el SP porque la columna `pdf_url` no existe todavía en `inspeccion` (005-certificacion-plan-cumplimiento, la firma/PDF, sigue pausado); (3) para `DATO_PERSONAL_CONTACTO`, tanto `ANONIMIZAR` como `ELIMINAR` **anonimizan** (nunca hacen `DELETE` de la fila `cliente`/`sucursal`) — un borrado en cascada arrastraría sucursales/usuarios/certificaciones asociadas, demasiado destructivo para un job automático sin confirmación humana; y solo aplica a registros con `activo = false`, para no anonimizar el contacto de un cliente/sucursal todavía en uso activo.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260721000000_add_seguridad_privacidad_continuidad/migration.sql`, `packages/db/sql/procedimientos/sp_retencion_purgar_datos.sql`, `packages/db/prisma/seeds/politica-retencion-demo.ts`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado. Seed corrido. SP probado manualmente con `SELECT * FROM sp_retencion_purgar_datos('00000000-0000-0000-0000-000000000001')` → 0 filas (esperado, datos demo recién creados y activos). Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-20] Aprobación de plantillas + catálogo de permisos — 007-gobernanza-permisos-aprobacion

- Tipo: enum nuevo + columnas nuevas + índice + 2 FK opcionales + seed de catálogo (sin filas `RolPermiso`)
- Módulo: inspeccion (extensión de `InspeccionPlantilla`, sprint 001) + catálogo global `Permiso` (ya existía el modelo desde el schema base, nunca se había sembrado)
- Detalle: enum `EstadoAprobacionPlantilla` (`BORRADOR`/`EN_REVISION`/`APROBADA`/`RECHAZADA`). `inspeccion_plantilla.estado_aprobacion` (default `BORRADOR`, not null), `solicitado_por_id`/`solicitado_en`/`aprobador_id`/`resuelto_en`/`comentario_resolucion` (todos nullable). Relaciones nombradas `PlantillaSolicitante`/`PlantillaAprobador` hacia `Usuario` (FK `ON DELETE SET NULL`, para no bloquear el borrado futuro de un usuario). Índice `(empresa_id, estado_aprobacion)` para la consulta de pendientes de aprobación. Seed `permisos-gobernanza.ts`: 3 permisos nuevos por `codigo` (`plantillas.enviar_revision`, `plantillas.aprobar`, `permisos.administrar`) — **sin** filas `RolPermiso` por defecto, ni para `administrador` (que los tiene implícitos por regla de negocio, ver `esRolAdministrador()`).
- **Nota de arquitectura**: `Rol`/`Permiso`/`RolPermiso` son catálogo **global** de la plataforma (sin `empresa_id`, igual que ya estaban modelados antes de este sprint) — la matriz de este sprint edita permisos por rol para **todas** las empresas tenant a la vez, no por empresa individual. Punto a confirmar con `agente-arquitecto` si un sprint futuro requiere scoping por `empresa_id`.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260720120000_add_aprobacion_plantilla/migration.sql`, `packages/db/prisma/seeds/permisos-gobernanza.ts`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado. Seed corrido (catálogo de 3 permisos creado, 0 filas `RolPermiso`). Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-07-18] Certificación (wizard) — Inspeccion.periodoEtiqueta + establecimiento deprecado

- Tipo: columna nueva + columna existente marcada `@deprecated` (nullable) + script de emparejamiento de datos
- Módulo: inspeccion (extensión del sprint 015-wizard-certificacion — `sucursalId` ya existía desde 003, no se toca aquí)
- Detalle: `inspeccion.periodo_etiqueta` (VARCHAR 50, nullable — período que cubre el formulario, ej. "Julio 2026"). `inspeccion.establecimiento` pasó de `NOT NULL` a nullable y se marcó `@deprecated` en el comentario Prisma — se conserva por historial, ya no lo escribe ningún caso de uso nuevo (el wizard usa `sucursalId` en su lugar). Script `packages/db/sql/migraciones-datos/20260718_emparejar_establecimiento_sucursal.sql`: empareja `establecimiento` con `Sucursal.nombre` de la misma empresa por coincidencia exacta case-insensitive — corrido contra datos de desarrollo, **0 filas afectadas** (no existían inspecciones reales todavía en esta base).
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260718100000_add_certificacion/migration.sql`
- Estado: aplicado en desarrollo local vía psql + registro manual en `_prisma_migrations`. `prisma generate` ejecutado.

---

## [2026-07-17] Usuario.clienteId — alcance de administrador_cliente

- Tipo: columna nueva + 2 roles nuevos en catálogo fijo
- Módulo: auth (extensión de sprint 004-usuarios-roles-alcance)
- Detalle: `usuario.cliente_id` (nullable, FK a `cliente`), índice `(empresa_id, cliente_id)`. Roles nuevos en la tabla `rol`: `administrador_cliente` (ve solo su Cliente), `usuario_sucursal` (ve solo su(s) sucursal(es), ya soportado por `usuario.sucursal_id`/`usuario_sucursal_acceso` de 003). Seed de 2 usuarios demo: `carlos@dist.com` (administrador_cliente → Distribuidora Sur S.A.) y `lucia@dist.com` (usuario_sucursal → Planta Central), password `Cliente2026!`.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260718000000_add_usuario_cliente_alcance/migration.sql`, `packages/db/prisma/seeds/usuarios-demo.ts`
- Estado: aplicado en desarrollo local vía psql + registro manual en `_prisma_migrations`. `prisma generate` ejecutado. No hay `CHECK` SQL cruzando rol×clienteId/sucursalId — se valida en `application/` del módulo `auth` (`validarAlcancePorRol`), documentado también como TODO en `packages/db/sql/rls/auth_rls.sql`.

---

## [2026-07-17] Sucursales — Cliente.movil, Sucursal, Usuario↔Sucursal, Inspeccion.sucursalId

- Tipo: columna nueva (x2) + tabla nueva (x2) + columna nueva con FK preparatoria
- Módulo: sucursales (nuevo) + auth (extensión) + inspeccion (columna preparatoria, sin lógica de aplicación)
- Detalle: `cliente.movil` (VARCHAR 20 nullable). Tabla `sucursal` (planta/establecimiento físico de un Cliente, unidad real de certificación), índice `(empresa_id, cliente_id, activo)`. `usuario.sucursal_id` (sucursal principal, nullable — roles de alcance total como `administrador` quedan exentos). Tabla puente `usuario_sucursal_acceso` (sucursales adicionales de solo consulta, PK compuesta, `ON DELETE CASCADE` en ambas FKs). `inspeccion.sucursal_id` (nullable, columna de modelo de datos preparatoria para el sprint futuro de ejecución RF-08 — ningún caso de uso de este sprint la escribe).
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260717000000_add_sucursales/migration.sql`, `packages/db/prisma/seeds/sucursales-demo.ts`
- Estado: aplicado en desarrollo local (`doonflow_dev`, puerto 5433) vía psql + registro manual en `_prisma_migrations` (entorno no interactivo). `prisma generate` ejecutado. Pendiente aplicar en producción cuando exista ese ambiente.

---

## [2026-06-16] Esquema inicial — Empresa, Usuario, Rol, Permiso

- Tipo: tabla nueva (x4) + tabla puente
- Módulo: auth (transversal — Empresa es la raíz de aislamiento multiempresa)
- Detalle: `Empresa` (raíz multiempresa), `Rol` (catálogo fijo: administrador/productor/operario/auditor/cliente_externo), `Permiso` (catálogo de acciones), `RolPermiso` (puente), `Usuario` (con `authUserId` enlazando a Supabase Auth, `empresaId`, `rolId`). Seed agrega los 5 roles del sistema + empresa demo + usuario administrador demo.
- Migración/archivo: `packages/db/prisma/schema.prisma`, `packages/db/prisma/seed.ts`, RLS en `packages/db/sql/rls/auth_rls.sql`
- Estado: en desarrollo — falta correr `prisma migrate dev` contra una base real (no hay `DATABASE_URL` configurado en este entorno) y aplicar `auth_rls.sql` manualmente en Supabase.

<!-- Agregar entradas nuevas arriba de esta línea -->
