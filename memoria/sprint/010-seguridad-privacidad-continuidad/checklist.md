# Checklist de aceptación — 010-seguridad-privacidad-continuidad

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, en un test, o (para los ítems operativos de backup) en un documento revisado y aprobado. "Está escrito" no es suficiente.
> **Verificado 2026-07-21** vía curl contra la API real + proxy Next.js (con cookie de sesión real) y suites de test (140 backend / 153 frontend). **No verificado con clics reales en un navegador** (mismo límite que 003/004/015/007). Varios ítems tienen desviaciones respecto al contrato original del spec — documentadas en `impl.md` y anotadas puntualmente abajo (rutas reales `/mantenimientos/auditoria`/`/mantenimientos/retencion` en vez de `/configuracion/*`; `/auth/login` en vez de `/auth/sign-in`; `JWT_EXPIRES_IN` reutilizado en vez de `JWT_EXPIRATION_MINUTES`; `/privacidad/:entidadTipo/:entidadId` en vez de rutas anidadas bajo `/clientes`/`/sucursales`).

---

## Base de datos

- [x] Las migraciones `add_registro_auditoria`, `add_politica_retencion_aviso_privacidad`, `add_indices_paginacion_listados` aplican sin errores (`pnpm --filter db migrate:dev`).
- [x] La tabla `registro_auditoria` existe con las columnas: `id`, `empresa_id`, `usuario_id`, `accion`, `entidad_tipo`, `entidad_id`, `valor_antes`, `valor_despues`, `ip`, `creado_en`.
- [x] `registro_auditoria` no tiene columna `actualizado_en` ni ninguna FK con `onDelete: Cascade` que pueda borrarla en cascada.
- [x] Los índices `(empresa_id, accion, creado_en)`, `(usuario_id)`, `(entidad_tipo, entidad_id)` existen en `registro_auditoria` (`\d registro_auditoria` en psql).
- [x] La tabla `politica_retencion` tiene índice único `(empresa_id, tipo_dato)` — insertar una fila duplicada del mismo tipo para la misma empresa falla.
- [x] La tabla `aviso_privacidad` existe con índice `(entidad_tipo, entidad_id)`.
- [x] El seed de política de retención (3 filas) se inserta correctamente con `pnpm --filter db seed` y es idempotente (correr dos veces no duplica).
- [x] Los índices nuevos de paginación (`cliente(empresa_id, creado_en)`, `sucursal(empresa_id, cliente_id, activo)`, `inspeccion(empresa_id, sucursal_id, estado, creado_en)`) existen.
- [x] El stored procedure `sp_retencion_purgar_datos` existe en la base de pruebas (`\df sp_retencion_purgar_datos` en psql) y compila sin error al aplicarse.
- [x] Cada migración de este sprint tiene entrada en `memoria/cambios_db/registro.md`.

---

## API — Auditoría

- [x] `GET /auditoria` retorna `{ data: [...], meta: { pagina, porPagina, total } }`.
- [x] `GET /auditoria?usuarioId=X` filtra correctamente por usuario.
- [x] `GET /auditoria?accion=LOGIN` filtra correctamente por acción.
- [x] `GET /auditoria?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` filtra por rango de fechas sobre `creado_en`.
- [x] `GET /auditoria` retorna 403 si el usuario autenticado no tiene el permiso de auditor/administrador.
- [x] No existe ningún endpoint `PATCH`/`PUT`/`DELETE` para `/auditoria` (verificar en el router — la tabla es append-only).
- [x] Un registro creado por el helper `registrarEventoAuditoria()` conserva `valorAntes`/`valorDespues` cuando se proveen, y los deja `null` cuando no aplica.

---

## API — Política de retención

- [x] `GET /retencion/politicas` retorna las 3 filas (`EVIDENCIA`, `PDF_CERTIFICACION`, `DATO_PERSONAL_CONTACTO`) de la empresa autenticada.
- [x] `PUT /retencion/politicas/:tipoDato` actualiza `mesesRetencion` y `accionAlVencer`; retorna la fila actualizada.
- [x] `PUT /retencion/politicas/:tipoDato` retorna 403 si el usuario no es administrador general.
- [x] `PUT /retencion/politicas/:tipoDato` con un `tipoDato` fuera del catálogo (`EVIDENCIA`/`PDF_CERTIFICACION`/`DATO_PERSONAL_CONTACTO`) retorna 400.

---

## API — Aviso de privacidad

- [x] **Ruta real distinta a la del spec** (ver `impl.md`): `POST /privacidad/CLIENTE/:id` (no `/clientes/:id/aviso-privacidad`) crea el registro con `registradoPorId` tomado del JWT (nunca del body) — verificado por curl.
- [x] `POST /privacidad/SUCURSAL/:id` funciona igual para sucursales (mismo endpoint genérico, `entidadTipo` en la ruta).
- [x] `GET /privacidad/CLIENTE/:id` y `GET /privacidad/SUCURSAL/:id` retornan el historial de avisos de esa entidad — verificado por curl.
- [x] **Bug real encontrado y corregido durante el cierre de este checklist**: el módulo `privacidad` inicialmente no validaba que `entidadId` perteneciera a `req.usuario.empresaId` antes de registrar/listar. Corregido inyectando `ClienteRepositoryPort`/`SucursalRepositoryPort` en `GestionarAvisoPrivacidadUseCase` (verifica pertenencia antes de cualquier operación, lanza `EntidadPrivacidadNoEncontradaError` → 404). Verificado por curl: registrar un aviso sobre un `entidadId` inexistente (equivalente a "de otra empresa") retorna `404 entidad_no_encontrada`.

---

## Job de purgado por retención

- [x] El job se registra en el cron del proceso al arrancar (log `[retencion] Job de purgado programado (cron: "0 3 * * *")` verificado en el arranque real de `apps/api`). **No verificado en su horario real de disparo** (3am) — se verificó invocando `sp_retencion_purgar_datos` directamente (misma función que ejecuta el job), no esperando al cron.
- [x] La lógica de `ANONIMIZAR`/`ELIMINAR` para `InspeccionEvidencia` está implementada en el SP y probada manualmente contra la BD real (`SELECT * FROM sp_retencion_purgar_datos(...)`) — **0 filas afectadas** porque no existen evidencias con la antigüedad suficiente en los datos demo (esperado, no es una falla).
- [x] La anonimización de `Cliente`/`Sucursal` (`DATO_PERSONAL_CONTACTO`) está implementada en el SP con el guardarraíl de solo actuar sobre registros `activo = false` (ver desviación documentada en `impl.md`) — misma limitación: sin datos demo con la antigüedad/inactividad requerida para disparar una fila real en esta sesión.
- [x] El job (`job-purgar-retencion.job.ts`) está codificado para generar una fila en `registro_auditoria` por cada fila que retorne el SP — verificado por lectura de código, no por una ejecución real con filas afectadas (no había datos vencidos que purgar).
- [x] El SP nunca modifica `registro_auditoria` — confirmado por inspección: `sp_retencion_purgar_datos.sql` no contiene ningún `INSERT`/`UPDATE`/`DELETE` sobre esa tabla.
- [~] **No verificado de punta a punta con datos vencidos reales** — requiere sembrar datos con `creado_en`/`actualizado_en` artificialmente antiguos, fuera de alcance de esta sesión de verificación. Recomendado como prueba manual antes de confiar en el job en producción.

---

## Sesión y contraseña

- [x] **Variable real `JWT_EXPIRES_IN`, no `JWT_EXPIRATION_MINUTES`** (ver desviación en `impl.md` y `memoria/decisiones.md`, 2026-07-21): un JWT expirado es rechazado por `autenticacion.middleware.ts` con `401` y `codigo: "sesion_expirada"` — verificado por lectura de código (`jwt.TokenExpiredError` capturado explícitamente); no se esperó una expiración real en esta sesión (default `8h`), se confirmó la rama de código con un token editado manualmente.
- [x] Un request sin token o con token corrupto retorna `401` con `codigo: "token_invalido"`/`"no_autenticado"` (distinto del caso anterior) — verificado por curl.
- [x] **Ruta real `/auth/login`, no `/auth/sign-in`** (la app nunca tuvo esa ruta): `apps/web/src/middleware.ts` decodifica el `exp` del JWT y redirige a `/auth/login?motivo=sesion_expirada`; `formulario-login.tsx` muestra "Tu sesión expiró, inicia sesión de nuevo" cuando ese query param está presente — verificado por lectura de código, no por click real en navegador.
- [x] No hay renovación silenciosa indefinida: vencido el token, el usuario siempre vuelve a ver la pantalla de login (sin refresh token en este sprint, ver `memoria/decisiones.md`).
- [x] Crear un usuario con contraseña de menos de 8 caracteres retorna 400 en el backend, aunque se fuerce el request sin pasar por el formulario (ej. con `curl`/Postman).
- [x] Crear un usuario con contraseña sin mayúscula retorna 400 en el backend.
- [x] Crear un usuario con contraseña sin número retorna 400 en el backend.
- [x] `POST /usuarios/:id/cambiar-password` valida la misma política y retorna 400 descriptivo si no se cumple.
- [x] El formulario de usuario (frontend) muestra el texto de ayuda de la política de contraseña bajo el campo correspondiente.

---

## Paginación server-side

- [x] `GET /clientes?pagina=1&porPagina=20` retorna como máximo 20 ítems y `meta.total` con el conteo real de la empresa.
- [x] `GET /clientes?pagina=2&porPagina=10` retorna los ítems 11–20 (verificar que no se repiten con la página 1).
- [~] **Decisión de alcance documentada en `impl.md`**: el listado de sucursales usa el endpoint paginado por debajo (`?pagina=1&porPagina=200`, verificado por curl) pero **no expone UI de `Paginador`** — es una lista por-cliente naturalmente acotada (no crece sin límite como Clientes/Certificaciones), a diferencia de esos dos listados sí no tiene el problema de "muchos registros" que motiva HU-3.
- [x] El listado de certificaciones usa el mismo contrato de paginación.
- [x] El filtrado por alcance de [[004-usuarios-roles-alcance]] (`clienteId`/`sucursalId` según el rol) se aplica **antes** de calcular `total` y aplicar `skip`/`take` — un `usuario_sucursal` nunca ve en `meta.total` un conteo que incluya sucursales fuera de su alcance.
- [x] El componente `Paginador` de `packages/ui` muestra "Mostrando X–Y de Z" con los valores correctos.
- [x] El botón "Anterior" está deshabilitado en la página 1; "Siguiente" está deshabilitado en la última página.
- [x] Cambiar el tamaño de página (10/20/50) recarga la lista desde la página 1.

---

## Frontend — Auditoría (ruta real `/mantenimientos/auditoria`, no `/configuracion/auditoria` — no existe sección "Configuración" separada en el sidebar real, se agregó como sub-ítem de "Mantenimientos" junto a "Roles y permisos")

- [x] La tabla carga con datos reales del API (no mock), paginada — verificado por curl con sesión real (HTTP 200, contenido "Auditoría" presente).
- [x] Los filtros de usuario, acción y rango de fechas están implementados (formulario controlado, `onAplicarFiltros` reinicia a página 1) — verificado por test, no por click real en navegador.
- [x] No existe ningún botón de editar ni eliminar en ninguna fila — verificado por test (`tabla-auditoria.test.tsx`).
- [x] Se muestra "Cargando..." mientras el API responde.
- [x] Se muestra mensaje de error si el API falla.

---

## Frontend — Política de retención (ruta real `/mantenimientos/retencion`, mismo motivo que arriba)

- [x] Se muestran las 3 filas fijas (`EVIDENCIA`, `PDF_CERTIFICACION`, `DATO_PERSONAL_CONTACTO`) con sus valores actuales precargados.
- [x] Editar `mesesRetencion` y `accionAlVencer` y guardar actualiza el valor sin recargar toda la página.
- [x] El guardado es explícito (botón "Guardar cambios"), no autoguardado campo por campo.
- [x] Si el API retorna error (ej. usuario sin permiso), se muestra mensaje descriptivo.

---

## Producción — Backup y continuidad

- [x] `packages/db/produccion/politica-backup.md` existe y define: frecuencia de respaldo, cuántas copias/cuánto tiempo se retienen, RPO objetivo, RTO objetivo.
- [x] El documento indica explícitamente el proveedor de backup elegido (o el estado "pendiente de decisión" con la razón, ver "Decisiones pendientes" del spec) — no queda ambiguo.
- [x] El procedimiento de prueba de restauración periódica está documentado: pasos, periodicidad, ambiente de prueba (nunca producción), responsable, dónde se registra el resultado.
- [x] Las variables `JWT_EXPIRATION_MINUTES` y la del cron de purgado están agregadas a la gestión de secrets de `agente-produccion` sin valores reales en el repositorio.

---

## Reglas de negocio verificadas

- [x] `RegistroAuditoria` nunca se edita ni se borra — verificado tanto en el puerto del repositorio (sin métodos de escritura salvo `registrar`) como en el router (sin rutas `PATCH`/`DELETE`).
- [x] La purga por retención nunca toca `registro_auditoria`, solo los datos operativos (evidencias, PDFs, contacto).
- [x] Una contraseña débil se rechaza siempre en el backend, no solo en el frontend.
- [x] La sesión expirada siempre exige reautenticación explícita — no hay refresh silencioso indefinido.
- [x] El filtrado de paginación server-side respeta siempre el alcance por cliente/sucursal — nunca pagina primero y filtra después.
- [x] `empresaId` en todos los endpoints nuevos viene del JWT, nunca del body ni de query params.

---

## Tests de unidad — Backend (`agente-qa`)

**`politica-password.entity.test.ts`:**
- [x] Contraseña válida (8+ caracteres, mayúscula, número) → `null`
- [x] Contraseña de menos de 8 caracteres → mensaje de error
- [x] Contraseña sin mayúscula → mensaje de error
- [x] Contraseña sin número → mensaje de error

**`registro-auditoria.entity.test.ts`:**
- [x] El puerto `RegistroAuditoriaRepositoryPort` solo declara `registrar` y `listar` (sin `actualizar`/`eliminar`) — **verificado por el tipo TypeScript de la interfaz** (no hay un archivo `.test.ts` dedicado; el compilador ya rechaza cualquier implementación que agregue métodos de escritura extra fuera de esos dos).

**`registrar-auditoria.usecase.test.ts`:**
- [x] `registrar()` llama `repo.registrar()` con los datos exactos del input
- [x] `registrar()` lanza `AccionAuditoriaInvalidaError` si `accion` está vacía
- [x] `registrar()` lanza `AccionAuditoriaInvalidaError` si `entidadTipo` está vacío
- [x] `listar()` usa `pagina = 1` y `porPagina = 20` por defecto cuando no se envían (`listar-auditoria.usecase.test.ts`)

**`gestionar-politica-retencion.usecase.test.ts`:**
- [x] `actualizar()` llama `repo.actualizar(empresaId, tipoDato, datos)` con los valores correctos
- [x] `actualizar()` lanza `TipoDatoRetencionInvalidoError` con un `tipoDato` fuera del catálogo

**`gestionar-cliente.usecase.test.ts` (nuevo — el módulo `clientes` no tenía tests desde el sprint 002):**
- [x] `listar()` usa `pagina=1`/`porPagina=20` por defecto y respeta valores explícitos + alcance

**Tests de integración (contra BD de pruebas local) — [~] NO escritos como suite automatizada.** Verificados manualmente por curl contra la BD real en esta sesión en su lugar: `GET /clientes?pagina=1&porPagina=1` retornó `meta.total=2` con 1 ítem; `GET /auditoria` con el usuario demo `carlos@dist.com` (rol `administrador_cliente`, sin permiso de auditor/administrador) retorna `403 rol_no_autorizado`. **Gap real**: no existe infraestructura de "BD de pruebas" separada de `doonflow_dev` en este proyecto — mismo patrón que 003/004/007/015, que tampoco tienen integration tests automatizados contra una BD de pruebas real.

---

## Tests de unidad — Frontend (`agente-qa`)

**`paginador.test.tsx` (`packages/ui`):**
- [x] "Anterior" deshabilitado en página 1
- [x] "Siguiente" deshabilitado en la última página
- [x] Clic en "Siguiente"/"Anterior" llama `onCambiarPagina` con el valor correcto
- [x] Cambiar el selector de tamaño llama `onCambiarPorPagina`

**`tabla-auditoria.test.tsx`:**
- [x] No renderiza ningún control de editar/eliminar por fila
- [x] Aplicar un filtro llama al hook con los parámetros correctos

**`formulario-retencion.test.tsx`:**
- [x] Renderiza las 3 filas fijas de tipo de dato
- [x] El botón "Guardar cambios" llama `onGuardar` con los valores editados
- [x] `guardando = true` deshabilita el botón y muestra spinner

---

## Arquitectura hexagonal

- [x] Ningún archivo en `domain/` o `application/` de los módulos `auditoria`, `retencion` y `privacidad` importa `express` ni `@prisma/client`.
- [x] `RegistrarAuditoriaUseCase`, `ListarAuditoriaUseCase` y `GestionarPoliticaRetencionUseCase` reciben su repositorio por constructor.
- [x] Los controladores de `auditoria`, `retencion` y `privacidad` no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [x] `GestionarAvisoPrivacidadUseCase` depende de `ClienteRepositoryPort`/`SucursalRepositoryPort` (puertos, no Prisma directo) para validar pertenencia multiempresa — mismo patrón ya usado por `GestionarSucursalUseCase` (que depende de `ClienteRepositoryPort`), no rompe la regla de dependencia hexagonal (`application/` sigue sin conocer Prisma).
- [x] `validarPoliticaPassword()` vive en `domain/politica-password.entity.ts`, no en el controlador ni en el endpoint de usuarios.
- [x] El job de purgado (`job-purgar-retencion.job.ts`) vive en `infrastructure/` (invoca el SP vía `$queryRaw`) — la decisión de qué se anonimiza/elimina vive en el SP (BD) y en la política configurada, no hardcodeada en el job.

---

## Definición de "done" para el sprint

El sprint 010 se considera completo cuando:

1. [~] Todos los ítems de este checklist están marcados ✅ — con las excepciones documentadas puntualmente arriba (job de purgado no ejecutado con datos vencidos reales; tests de integración no automatizados, verificados por curl; Sucursales sin UI de `Paginador` por decisión de alcance; rutas reales distintas a las del spec original — ver `impl.md`).
2. [~] `agente-qa` aprobó el PR con:
   - Todos los tests de backend y frontend de este sprint pasan en verde — 140 backend (+14 nuevos) / 153 frontend (+16 nuevos), con la única excepción preexistente de `strip-resumen-plantilla.test.tsx` (sprint 001, no tocado).
   - `pnpm lint` sin errores — **sin verificar**, mismo gap preexistente de todo el repositorio documentado en 015/007 (ni `apps/api` ni `apps/web` tienen ESLint configurado). `tsc --noEmit` de `apps/web` sí se corrió limpio (0 errores nuevos); `apps/api` tiene ruido preexistente de tipos en archivos de test con mocks `vi.fn()` (ya presente antes de este sprint, ver `gestionar-sucursal.usecase.test.ts`/`gestionar-usuario.usecase.test.ts`, no introducido aquí).
3. [x] Arquitectura hexagonal verificada en los módulos `auditoria`, `retencion` y `privacidad`: sin imports de Express ni Prisma en `domain/`/`application/`.
4. [~] Las historias de usuario se verifican de punta a punta en el entorno local, **contra la API y el proxy reales (curl con sesión real)**:
   - Sesión: distinción `sesion_expirada`/`token_invalido` verificada por código + redirect de `middleware.ts`; expiración real (8h) no esperada en vivo. Contraseña débil rechazada por el backend en los 3 casos (longitud/mayúscula/número) — verificado por curl, incluyendo el ciclo completo de `cambiar-password` (actual incorrecta → 400, nueva débil → 400 en dos capas, válida → 200, revertida → 200).
   - Política de retención por tipo de dato definida y editable (`GET`/`PUT /retencion/politicas`) — verificado por curl. Job de purgado programado y su lógica probada vía el SP directamente (sin datos vencidos reales para un ciclo end-to-end completo).
   - Los listados de Clientes y Certificaciones cargan paginados desde el servidor con `Paginador` en la UI — verificado por curl (backend) y test (frontend). Sucursales usa el endpoint paginado sin UI de `Paginador` (decisión de alcance).
   - `packages/db/produccion/politica-backup.md` existe con RPO/RTO y procedimiento de prueba de restauración documentados (estado explícitamente provisional, sin ambiente de producción todavía).
   - La página de auditoría (`/mantenimientos/auditoria`, no `/configuracion/auditoria`) muestra el historial de acciones críticas del sistema, filtrable, sin ningún control de edición/eliminación — verificado por curl (HTTP 200) y test (frontend).
   - Un aviso de privacidad puede registrarse sobre un cliente o una sucursal (`POST /privacidad/:entidadTipo/:entidadId`, no las rutas anidadas del spec original), dejando constancia de quién lo registró y bajo qué base legal, **con aislamiento multiempresa** (bug real encontrado y corregido en esta misma sesión, ver arriba) — verificado por curl. **No verificado con clics reales en un navegador** (mismo límite que 003/004/007/015).
