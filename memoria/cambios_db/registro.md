# Registro de cambios de base de datos

Ver formato y diferencia con `packages/db/produccion/` en `memoria/cambios_db/README.md`. Más reciente arriba.

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
