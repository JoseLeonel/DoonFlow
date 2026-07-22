# Tareas — 010-seguridad-privacidad-continuidad

> Orden de ejecución: Base de datos → Backend transversal (auditoría/retención/privacidad) → Auth (sesión/contraseña) → Frontend → Producción (backup) → Tests.
> Numeración desde T-420 para no colisionar con sprints anteriores.
> Este sprint **no** crea módulos de negocio nuevos desde cero — endurece/completa Clientes ([[002-crud-clientes]]), Sucursales/Certificaciones ([[003-sucursales-certificacion]], [[015-wizard-certificacion]]) y Permisos ([[007-gobernanza-permisos-aprobacion]]), que se asumen ya implementados.
> **⏸️ Bloqueado parcialmente:** la integración de auditoría `CERTIFICACION_FIRMADA` depende de [[005-certificacion-plan-cumplimiento]] (**pausado**) — esa tarea puntual no se puede implementar hasta que se retome. El resto del sprint no depende de la firma.

---

## Agente: `agente-basededatos`

- [x] **T-420** Crear migración `add_registro_auditoria` en `packages/db/prisma/`:
  - Tabla `registro_auditoria`: `id`, `empresa_id`, `usuario_id FK → usuario(id)`, `accion VARCHAR(50)`, `entidad_tipo VARCHAR(50)`, `entidad_id UUID`, `valor_antes JSONB NULLABLE`, `valor_despues JSONB NULLABLE`, `ip VARCHAR(45) NULLABLE`, `creado_en TIMESTAMPTZ DEFAULT now()`.
  - Índices: `(empresa_id, accion, creado_en DESC)`, `(usuario_id)`, `(entidad_tipo, entidad_id)`.
  - Sin `updated_at` ni `deleted_at` — la tabla es append-only por diseño (ver regla de negocio 1 del spec), no lleva trigger de actualización.
  - Agregar model `RegistroAuditoria` al schema Prisma. No definir relaciones `onDelete: Cascade` desde otras tablas hacia `registro_auditoria` — un registro de auditoría sobrevive aunque la entidad referenciada se elimine lógicamente.

- [x] **T-421** Crear migración `add_politica_retencion_aviso_privacidad`:
  - Tabla `politica_retencion`: `id`, `empresa_id`, `tipo_dato VARCHAR(30)` (`EVIDENCIA` / `PDF_CERTIFICACION` / `DATO_PERSONAL_CONTACTO`), `meses_retencion INT NOT NULL`, `accion_al_vencer VARCHAR(20)` (`ANONIMIZAR` / `ELIMINAR`), `actualizado_en TIMESTAMPTZ`. Índice único `(empresa_id, tipo_dato)`.
  - Tabla `aviso_privacidad`: `id`, `entidad_tipo VARCHAR(20)` (`CLIENTE` / `SUCURSAL`), `entidad_id UUID`, `base_legal TEXT NOT NULL`, `registrado_por_id UUID FK → usuario(id)`, `empresa_id`, `creado_en TIMESTAMPTZ DEFAULT now()`. Índice `(entidad_tipo, entidad_id)`.
  - Agregar models `PoliticaRetencion` y `AvisoPrivacidad` al schema Prisma.

- [x] **T-422** Agregar seed `packages/db/prisma/seeds/politica-retencion-demo.ts`:
  - 3 filas de ejemplo para `empresa_id = "00000000-0000-0000-0000-000000000001"`: `EVIDENCIA` (24 meses, `ANONIMIZAR`), `PDF_CERTIFICACION` (60 meses, `ANONIMIZAR`), `DATO_PERSONAL_CONTACTO` (36 meses, `ANONIMIZAR`). Valores de ejemplo para desarrollo — no son la política legal final (ver "Decisiones pendientes" del spec).
  - `upsert` sobre `(empresaId, tipoDato)` para idempotencia. Importar y llamar desde `packages/db/prisma/seed.ts`.

- [x] **T-423** Migración `add_indices_paginacion_listados`:
  - Verificar/agregar índices que soporten paginación + orden en los listados que este sprint activa: `cliente(empresa_id, creado_en)`, `sucursal(empresa_id, cliente_id, activo)`, `inspeccion(empresa_id, sucursal_id, estado, creado_en)` (certificaciones, ver [[015-wizard-certificacion]]).
  - No recrear índices que ya existan (`cliente(empresa_id, activo)` de sprint 002) — solo agregar los que falten para `ORDER BY` + `WHERE` combinados sin secuencial scan.

- [x] **T-424** Crear stored procedure `packages/db/sql/procedimientos/sp_retencion_purgar_datos.sql`:
  - `CREATE OR REPLACE FUNCTION sp_retencion_purgar_datos(p_empresa_id UUID)` — recorre `politica_retencion` de la empresa, identifica filas de `inspeccion_evidencia`, `inspeccion` (campo `pdf_url`) y `cliente`/`sucursal` (datos de contacto) cuya antigüedad supera `meses_retencion`, y aplica `ANONIMIZAR` (limpia/reemplaza columnas de contacto por `'ANONIMIZADO'` / `NULL`) o `ELIMINAR` (borra la fila o el archivo referenciado) según `accion_al_vencer`. Retorna un `SETOF` con `(tabla, id, accion_aplicada)` para que la capa de infraestructura genere el `RegistroAuditoria` correspondiente (T-432) — el SP nunca escribe en `registro_auditoria` directamente, así se mantiene esa tabla fuera del alcance de la operación transaccional de purgado.
  - Operación atómica por entidad (transacción por fila o por lote pequeño), no debe dejar registros a medio anonimizar si falla a mitad de camino.

- [x] **T-425** Agregar entradas en `memoria/cambios_db/registro.md` por cada migración (T-420 a T-424) y en `packages/db/produccion/CHANGELOG.md` cuando queden validadas en desarrollo.

---

## Agente: `agente-backend`

- [x] **T-426** Crear módulo `apps/api/src/modules/auditoria/domain/`:
  - `registro-auditoria.entity.ts`: tipo `RegistroAuditoria` con todos los campos del spec.
  - `registro-auditoria.repository.port.ts`: **solo** `registrar(datos): Promise<RegistroAuditoria>` y `listar(empresaId, filtros, paginacion): Promise<{ items: RegistroAuditoria[]; total: number }>` — el puerto no expone `actualizar` ni `eliminar` (refuerza en el tipo la regla append-only).
  - `registro-auditoria.errors.ts`: `AccionAuditoriaInvalidaError`.

- [x] **T-427** Crear `apps/api/src/modules/auditoria/application/casos-uso/registrar-auditoria.usecase.ts` (`registrar(datos)`, valida que `accion` y `entidadTipo` no vengan vacíos) y `listar-auditoria.usecase.ts` (`listar(empresaId, filtros, paginacion)`, aplica `pagina`/`porPagina` con default `1`/`20`).

- [x] **T-428** Crear infraestructura del módulo `auditoria`:
  - `registro-auditoria.prisma-repository.ts` — `registrar()` es un simple `create`, nunca expone `update`/`delete` de Prisma para esta tabla.
  - `auditoria.controller.ts` y `auditoria.router.ts`: `GET /auditoria` (`?usuarioId=&accion=&desde=&hasta=&pagina=&porPagina=`), solo lectura, requiere permiso de auditor/administrador.
  - `index.ts` con `crearModuloAuditoria(prisma, autenticar)`; montar en `apps/api/src/index.ts` bajo `/auditoria`; crear Route Handler proxy `apps/web/src/app/api/auditoria/route.ts` (`GET`).

- [x] **T-429** Crear helper transversal `apps/api/src/shared/auditoria/registrar-evento-auditoria.ts` — función de conveniencia que envuelve `RegistrarAuditoriaUseCase.registrar()` para ser invocada desde casos de uso de **otros** módulos sin que cada uno instancie el repositorio de auditoría por su cuenta. Documentar (comentario JSDoc + nota en `impl.md`) los puntos de integración a agregar en los módulos ya existentes — este sprint solo agrega la llamada, no reescribe esos casos de uso:
  - Login exitoso/fallido → módulo `auth` (`accion: "LOGIN"` / `"LOGIN_FALLIDO"`).
  - Firma de certificación → módulo de [[005-certificacion-plan-cumplimiento]] (`accion: "CERTIFICACION_FIRMADA"`) — **⏸️ bloqueado, 005 está pausado**.
  - Cierre de plan de cumplimiento → módulo de [[013-hallazgos-plan-cumplimiento]] (`accion: "PLAN_CERRADO"`) — **⏸️ bloqueado, 013 depende de que 005 se retome**.
  - Cambios de permisos de rol → módulo de [[007-gobernanza-permisos-aprobacion]] (`accion: "PERMISO_MODIFICADO"`).
  - Desactivación de usuario/cliente/sucursal → módulos respectivos (`accion: "USUARIO_DESACTIVADO"`, `"CLIENTE_DESACTIVADO"`, `"SUCURSAL_DESACTIVADO"`).

- [x] **T-430** Crear módulo `apps/api/src/modules/retencion/` (domain/application/infrastructure) para `PoliticaRetencion`:
  - `domain/politica-retencion.entity.ts` + puerto (`obtenerPorEmpresa`, `actualizar`).
  - `application/casos-uso/gestionar-politica-retencion.usecase.ts`.
  - `infrastructure/politica-retencion.prisma-repository.ts`, `.controller.ts`, `.router.ts`: `GET /retencion/politicas` (lista las 3 filas de la empresa), `PUT /retencion/politicas/:tipoDato` (`{ mesesRetencion, accionAlVencer }`, solo administrador general).
  - Montar bajo `/retencion` en `apps/api/src/index.ts`; Route Handler proxy `apps/web/src/app/api/retencion/politicas/route.ts` y `[tipoDato]/route.ts`.

- [x] **T-431** Crear módulo `apps/api/src/modules/privacidad/` para `AvisoPrivacidad`:
  - `domain/aviso-privacidad.entity.ts` + puerto (`registrar`, `listarPorEntidad`).
  - `application/casos-uso/gestionar-aviso-privacidad.usecase.ts`.
  - `infrastructure/aviso-privacidad.prisma-repository.ts`, `.controller.ts`, `.router.ts`: `POST /clientes/:id/aviso-privacidad`, `POST /sucursales/:id/aviso-privacidad` (`{ baseLegal }`, `registradoPorId` del JWT), `GET /clientes/:id/aviso-privacidad`, `GET /sucursales/:id/aviso-privacidad`.
  - Montar en `apps/api/src/index.ts`; Route Handlers proxy correspondientes bajo `apps/web/src/app/api/clientes/[id]/aviso-privacidad/` y `apps/web/src/app/api/sucursales/[id]/aviso-privacidad/`.

- [x] **T-432** Crear job `apps/api/src/modules/retencion/infrastructure/job-purgar-retencion.job.ts`:
  - Ejecuta diariamente (cron, ej. `node-cron` — decisión de `agente-backend`, documentar en `impl.md`), invoca `sp_retencion_purgar_datos` (T-424) por cada empresa activa vía `$queryRaw`.
  - Por cada fila retornada por el SP, llama al helper de T-429 para escribir un `RegistroAuditoria` (`accion: "RETENCION_ANONIMIZADO"` o `"RETENCION_ELIMINADO"`, `entidadTipo`/`entidadId` de la fila afectada). No incluir el valor PII original en `valorDespues` cuando la acción es `ANONIMIZAR` (contradiría el propósito de anonimizar) — solo un resumen de qué campos se limpiaron.
  - Registrar el job en el bootstrap de `apps/api/src/index.ts` (o `apps/api/src/jobs/index.ts` si se crea un punto central de jobs).

- [x] **T-433** Activar paginación server-side real en los repositorios ya existentes:
  - `apps/api/src/modules/clientes/infrastructure/cliente.prisma-repository.ts`: `listar()` acepta `{ pagina, porPagina, activo? }`, usa `skip`/`take` + `count()`, retorna `{ items, total }`.
  - Repositorio de sucursales (módulo de [[003-sucursales-certificacion]]) y repositorio de certificaciones/inspecciones (módulo de [[015-wizard-certificacion]]): mismo patrón, agregando siempre el filtro de alcance por `clienteId`/`sucursalId` (ver [[004-usuarios-roles-alcance]]) **antes** de paginar, nunca después (regla de negocio 5 del spec).
  - Actualizar los controllers de esos tres módulos para leer `?pagina=&porPagina=` (default `1`/`20`, igual que el resto de la API) y devolver el envelope `{ data, meta: { pagina, porPagina, total } }`.
  - Actualizar los Route Handlers proxy de `apps/web/src/app/api/clientes/`, `.../sucursales/`, `.../certificaciones/` para reenviar `pagina`/`porPagina`.

---

## Agente: `agente-auth`

> Alcance según `CLAUDE.md`: `apps/api/src/middleware/`, `apps/web/middleware.ts`, `packages/db/` (tablas `usuario`/`rol`/`permiso`). Sesión y contraseña son responsabilidad de este agente, no de `agente-backend`.

- [x] **T-434** Definir estrategia de expiración de JWT: variable de entorno `JWT_EXPIRATION_MINUTES` (default `30`) agregada a `.env.example`; sin renovación silenciosa indefinida — el usuario debe reautenticarse al expirar (regla de negocio 4 del spec; refresh token queda fuera de este sprint, ver "Decisiones pendientes"). Documentar la decisión en `memoria/decisiones.md`.

- [x] **T-435** Modificar `apps/api/src/middleware/autenticar.middleware.ts` (existente): verificar el claim `exp` del JWT en cada request; si venció, responder `401` con `{ error: { codigo: "sesion_expirada", mensaje: "Tu sesión expiró, inicia sesión nuevamente." } }` — distinto del `401` genérico de token ausente/inválido (`codigo: "no_autenticado"`), para que el frontend pueda diferenciar los dos casos.

- [x] **T-436** Modificar `apps/web/middleware.ts` (existente): interceptar el `codigo: "sesion_expirada"` en cualquier respuesta de la API y redirigir a `/auth/sign-in` con un mensaje visible ("Tu sesión expiró, inicia sesión de nuevo") — reutiliza el mismo layout de login descrito en `CLAUDE.md` → Sistema de diseño, no crea una pantalla nueva.

- [x] **T-437** Crear `domain/politica-password.entity.ts` en el módulo `auth` (de [[004-usuarios-roles-alcance]] — el CRUD de usuarios vive dentro de `apps/api/src/modules/auth/`, no en un módulo `usuarios` aparte): `validarPoliticaPassword(password: string): string | null` — retorna `null` si cumple (mínimo 8 caracteres, al menos 1 mayúscula, al menos 1 número) o un mensaje descriptivo si no. Aplicarla en `crear-usuario.usecase.ts` y en un nuevo caso de uso `cambiar-password.usecase.ts` + endpoint `POST /usuarios/:id/cambiar-password` (mismo prefijo `/usuarios` que ya expone `moduloAuth.routerUsuarios`) (`{ passwordActual, passwordNueva }`) — la validación ocurre siempre en el backend (regla de negocio 3 del spec), independiente de cualquier validación de frontend.

---

## Agente: `agente-frontend`

- [x] **T-438** Crear página `apps/web/src/app/(dashboard)/configuracion/auditoria/page.tsx` (solo lectura):
  - `_servicios/auditoria.servicio.ts`, `_hooks/usar-auditoria.ts` (estado `filtros`, `pagina`, `registros`, `total`, `cargando`), `_components/tabla-auditoria.tsx`.
  - Filtros: usuario (select), acción (select con las acciones conocidas), rango de fechas (desde/hasta). Tabla sin ninguna acción de edición/eliminación por fila.

- [x] **T-439** Crear página `apps/web/src/app/(dashboard)/configuracion/retencion/page.tsx`:
  - Formulario simple de 3 filas fijas (`EVIDENCIA`, `PDF_CERTIFICACION`, `DATO_PERSONAL_CONTACTO`), cada una con input `mesesRetencion` (numérico) y select `accionAlVencer` (`Anonimizar` / `Eliminar`). Guardado explícito por fila o botón único "Guardar cambios" (igual criterio que la matriz de permisos de [[007-gobernanza-permisos-aprobacion]] — sin autoguardado).
  - `_servicios/retencion.servicio.ts`, `_hooks/usar-politica-retencion.ts`.

- [x] **T-440** Crear componente `Paginador` en `packages/ui/src/paginador.tsx`: props `pagina`, `porPagina`, `total`, `onCambiarPagina(pagina)`, `onCambiarPorPagina(porPagina)`. Controles "Anterior"/"Siguiente" + indicador "Mostrando X–Y de Z" + selector de tamaño de página (10/20/50). Sin lógica de dominio, genérico para cualquier listado.

- [x] **T-441** Adaptar los listados existentes para consumir paginación real usando `Paginador` (T-440) y el nuevo contrato de T-433:
  - `apps/web/.../mantenimientos/clientes/_hooks/usar-clientes.ts` + `tabla-clientes.tsx` ([[002-crud-clientes]]).
  - Hook/tabla de sucursales ([[003-sucursales-certificacion]]).
  - Hook/tabla de certificaciones ([[015-wizard-certificacion]]).
  - Cada hook agrega estado `pagina`, `porPagina`, `total` y pasa `meta` de la respuesta del API a `Paginador`. El umbral "activar cuando supere 50 registros" mencionado en sprints 002/003 queda resuelto: la paginación se activa siempre (server-side), no condicionalmente en el frontend.

- [x] **T-442** Agregar mensajes de validación de contraseña en `_components/formulario-usuario.tsx` (módulo de [[004-usuarios-roles-alcance]]): texto de ayuda bajo el campo contraseña — "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número" — y validación espejo en cliente (mismo criterio de T-437) antes de enviar, sin reemplazar la validación del backend.

---

## Agente: `agente-produccion`

- [x] **T-443** Crear documento `packages/db/produccion/politica-backup.md`: frecuencia de respaldo, retención de respaldos (cuántas copias/cuánto tiempo), **RPO** y **RTO** objetivo declarados explícitamente (valores concretos a definir junto con negocio — no dejar el documento con placeholders sin fecha de resolución), y el proveedor de backup (nativo de Supabase vs. mecanismo adicional — ver "Decisiones pendientes" del spec, depende también del proveedor de hosting de `apps/api`, aún sin definir según `CLAUDE.md` → Despliegue).

- [x] **T-444** Agregar en el mismo documento (o en `memoria/errores_conocidos.md` si la prueba revela una limitación) el procedimiento de **prueba de restauración periódica**: pasos, periodicidad (ej. trimestral), ambiente donde se ejecuta (nunca producción), responsable, y dónde se deja constancia del resultado de cada prueba.

- [x] **T-445** Agregar a la gestión de variables de entorno de producción (GitHub Actions Secrets / proveedor de hosting, sin valores reales en el repo) las nuevas variables de este sprint: `JWT_EXPIRATION_MINUTES` (T-434) y la configuración del cron de purgado (T-432, ej. `RETENCION_JOB_CRON`).

---

## Agente: `agente-qa` — Tests de unidad Backend

- [x] **T-446** `politica-password.entity.test.ts` y `registro-auditoria.entity.test.ts`:
  - `validarPoliticaPassword` con contraseña válida (8+ caracteres, mayúscula, número) → `null`.
  - `validarPoliticaPassword` con menos de 8 caracteres → mensaje de error.
  - `validarPoliticaPassword` sin mayúscula → mensaje de error.
  - `validarPoliticaPassword` sin número → mensaje de error.
  - Tipo `RegistroAuditoria` no expone ningún método de edición/eliminación en el puerto (test de compilación/tipo, o verificación de que `RegistroAuditoriaRepositoryPort` solo declara `registrar` y `listar`).

- [x] **T-447** `registrar-auditoria.usecase.test.ts` y `gestionar-politica-retencion.usecase.test.ts` (mock del repositorio):
  - `registrar()` llama `repo.registrar()` con los datos exactos del input.
  - `registrar()` lanza `AccionAuditoriaInvalidaError` si `accion` o `entidadTipo` vienen vacíos.
  - `listar()` aplica `pagina`/`porPagina` por defecto `1`/`20` cuando no se envían.
  - `actualizar()` de política de retención llama `repo.actualizar(empresaId, tipoDato, datos)` con los valores correctos.

- [x] **T-448** Tests de integración ligera (contra BD de pruebas local):
  - El job de purgado (o una invocación directa del SP `sp_retencion_purgar_datos`) anonimiza/elimina las filas que superan `mesesRetencion` y **no** modifica ninguna fila de `registro_auditoria`.
  - `GET /clientes?pagina=2&porPagina=10` con 25 registros de prueba retorna 10 ítems y `meta.total = 25`.
  - `GET /auditoria` sin permisos de auditor/administrador retorna 403.

---

## Agente: `agente-qa` — Tests de unidad Frontend

- [x] **T-449** `paginador.test.tsx` (`packages/ui`), `tabla-auditoria.test.tsx` y `formulario-retencion.test.tsx`:
  - `Paginador`: deshabilita "Anterior" en la página 1 y "Siguiente" en la última página; clic en cada botón llama `onCambiarPagina` con el valor correcto; cambiar el selector de tamaño llama `onCambiarPorPagina`.
  - `TablaAuditoria`: no renderiza ningún botón de editar/eliminar por fila; aplicar un filtro llama al hook con los parámetros correctos.
  - `FormularioRetencion`: renderiza las 3 filas fijas; el botón "Guardar cambios" llama `onGuardar` con los valores editados; muestra spinner mientras `guardando = true`.

---

## Dependencias entre tareas

```
T-420 → T-426 → T-427 → T-428 → T-429
T-421 → T-430
T-421 → T-431
T-424 → T-432
T-430 → T-432
T-423 → T-433
T-422 → (seed, sin dependientes de código)
T-420, T-421, T-422, T-423, T-424 → T-425

T-434 → T-435 → T-436
T-437 → T-442

T-428 → T-438
T-430 → T-439
T-440 → T-441
T-433 → T-441

T-443 → T-444
T-434, T-432 → T-445

T-426, T-437 → T-446
T-427, T-430 → T-447
T-424, T-432, T-433, T-428 → T-448
T-438, T-439, T-440 → T-449
```
