# Checklist de aceptación — 006-vigencia-notificaciones-portal

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, en la BD o en un test. "Está escrito" no es suficiente.
> **Nota (2026-07-16):** este sprint se dividió en dos. Este checklist cubre solo notificaciones, vigencia, escalamiento y portal público de verificación. El checklist de panel ejecutivo, calendario y biblioteca de hallazgos frecuentes vive en [[014-panel-calendario-biblioteca]].

---

## Base de datos

- [ ] La migración `add_notificaciones` aplica sin errores (`pnpm --filter db migrate:dev`).
- [ ] La tabla `notificacion` existe con las columnas descritas en `task.md`.
- [ ] Los índices `notificacion(usuario_id, leida_en)`, `notificacion(empresa_id, creado_en)`, `notificacion(referencia_tipo, referencia_id, tipo, creado_en)` existen (`\d notificacion` en psql).
- [ ] `sp_notificacion_generar_vencimientos` ejecuta sin error contra datos de prueba con acciones/certificaciones a 30/15/5/0 días de vencer y con acciones vencidas hace más de 0 días.
- [ ] Ejecutar `sp_notificacion_generar_vencimientos` dos veces el mismo día no duplica notificaciones (verificar conteo de filas antes/después de la segunda corrida).
- [ ] `sp_accion_correctiva_escalar` genera exactamente una notificación `ACCION_ESCALADA` por acción vencida hace más de 7 días, y ninguna si ya existe una previa para esa acción.
- [ ] `sp_accion_correctiva_escalar` resuelve correctamente al `administrador_cliente` del cliente dueño de la sucursal; si no hay ninguno, la notificación se dirige al administrador general.
- [ ] Entrada agregada en `memoria/cambios_db/registro.md` con la tabla `notificacion`, los 2 SP y los índices.

---

## API — Notificaciones

- [ ] `GET /notificaciones` retorna solo las notificaciones del `usuarioId` autenticado (nunca las de otro usuario, aunque sea de la misma empresa).
- [ ] `GET /notificaciones?soloNoLeidas=true` filtra correctamente (`leidaEn IS NULL`).
- [ ] `GET /notificaciones/no-leidas/contador` retorna `{ data: { total: number } }` coherente con el conteo real de `leidaEn IS NULL`.
- [ ] `PATCH /notificaciones/:id/leer` marca `leidaEn` con la fecha actual y no permite marcar una notificación de otro usuario (retorna 404).
- [ ] `PATCH /notificaciones/leer-todas` marca todas las no leídas del usuario y retorna la cantidad afectada.
- [ ] Todas las rutas de `/notificaciones` retornan 401 sin token.
- [ ] El job programado (`apps/api/src/shared/jobs/programador.ts`) se registra al iniciar la API (verificar log de arranque) y no se ejecuta cuando `NODE_ENV=test`.
- [ ] Al registrar un hallazgo con `severidad = CRITICA` desde el módulo `certificacion`, se crea automáticamente una notificación `HALLAZGO_CRITICO` (verificar en BD tras la llamada al endpoint de crear hallazgo de 005) — no espera al job diario.
- [ ] Al asignar una `AccionCorrectiva` a un responsable, se genera una notificación `ACCION_ASIGNADA` para ese usuario de forma inmediata.

---

## API — Verificación pública

- [ ] `GET /verificacion/:codigo` con un `codigoVerificacion` existente y `fechaVencimiento` futura retorna `estado: "VIGENTE"`.
- [ ] `GET /verificacion/:codigo` con `fechaVencimiento` pasada retorna `estado: "VENCIDA"`, y el registro de `Inspeccion` en BD sigue con `estado: "FIRMADA"` (no cambia por consultarlo).
- [ ] `GET /verificacion/:codigo` con un código inexistente retorna 404 con envelope de error, no un 500.
- [ ] La respuesta de `GET /verificacion/:codigo` **nunca** incluye hallazgos, respuestas de preguntas, evidencias ni `pdfUrl` interno de otras certificaciones — solo cliente, sucursal, fechas y plantilla.
- [ ] La ruta funciona **sin** header `Authorization` (petición anónima).
- [ ] Pasado el límite de rate limit (ej. 21 solicitudes en un minuto desde la misma IP), la ruta retorna 429.
- [ ] No existe ningún endpoint que liste certificaciones por código parcial o sin código exacto (verificar que no hay `GET /verificacion` sin parámetro).

---

## Frontend — Centro de notificaciones

- [ ] La campana aparece en el header de `(dashboard)` en todas las pantallas autenticadas.
- [ ] El contador de no leídas se actualiza sin recargar la página (polling o refetch periódico).
- [ ] El badge no aparece cuando el contador es 0.
- [ ] El badge muestra `9+` cuando hay más de 9 no leídas.
- [ ] Click en la campana abre/cierra el dropdown con las notificaciones recientes.
- [ ] Click en una notificación navega a la entidad referenciada (acción correctiva, certificación o hallazgo) y la marca como leída.
- [ ] Con notificaciones vacías, el dropdown muestra "No tienes notificaciones" en vez de una lista vacía sin contexto.

---

## Frontend — Portal de verificación pública (`/verificar`)

- [ ] `/verificar` (sin código) muestra un input para ingresar el código manualmente.
- [ ] Enviar un código navega a `/verificar/[codigo]`.
- [ ] `/verificar/[codigo]` **no** muestra el sidebar ni el header del dashboard — layout completamente aparte.
- [ ] `/verificar/[codigo]` es accesible sin sesión iniciada (probar en ventana de incógnito).
- [ ] Con un código vigente, muestra sello verde "Vigente" + cliente + sucursal + fechas + plantilla.
- [ ] Con un código de una certificación vencida por fecha, muestra sello gris "Vencida".
- [ ] Con un código inexistente, muestra sello rojo/neutro "No encontrada" sin error crudo de red.
- [ ] La página no contiene ningún enlace hacia `/login`, `/mantenimientos` ni ninguna otra ruta del dashboard.
- [ ] El PDF de una certificación firmada (005) incluye un código QR visible que, al escanearlo, apunta a `/verificar/{codigoVerificacion}` de esa certificación.

---

## Reglas de negocio verificadas

- [ ] Los recordatorios de vencimiento (acción y certificación) se generan a 30, 15, 5 y 0 días antes de la fecha límite/vencimiento — no antes ni después de esos umbrales.
- [ ] El portal de verificación pública nunca lista certificaciones sin código exacto (no existe navegación de catálogo).
- [ ] Una certificación `FIRMADA` con `fechaVencimiento` pasada se muestra "Vencida" en el portal público, pero su `estado` en BD sigue `FIRMADA` (cálculo de presentación, no transición de estado).
- [ ] El filtrado de notificaciones respeta siempre el alcance por `Cliente`/`Sucursal` de 004 (probar con un usuario `administrador_cliente` y confirmar que no ve notificaciones de otro cliente).
- [ ] Una `AccionCorrectiva` `VENCIDA` hace más de 7 días genera `ACCION_ESCALADA` al `administrador_cliente` correspondiente (o al administrador general si no hay uno asignado), además de la notificación que ya recibió el responsable original.
- [ ] La escalación de una acción vencida ocurre **una sola vez** — correr el job dos veces sobre la misma acción vencida no genera una segunda notificación `ACCION_ESCALADA`.

---

## Tests de unidad — Backend (`agente-qa`)

**`notificacion.entity.test.ts`:**
- [ ] `debeEscalar` con `VENCIDO` hace 8 días → `true`
- [ ] `debeEscalar` con `VENCIDO` hace 3 días → `false`
- [ ] `debeEscalar` con `CUMPLIDO` vencida hace 30 días → `false`
- [ ] `construirMensaje` interpola correctamente los datos de contexto para al menos 2 tipos distintos

**Casos de uso de notificaciones:**
- [ ] `marcarLeida()` lanza `NotificacionNoEncontradaError` si no pertenece al usuario
- [ ] `contarNoLeidas()` retorna el valor del repositorio
- [ ] `marcarTodasLeidas()` llama al repo con `(usuarioId, empresaId)`
- [ ] `GenerarNotificacionesVencimientoUseCase.ejecutar()` llama `repo.generarVencimientos()` una vez
- [ ] `EscalarAccionesVencidasUseCase.ejecutar()` llama `repo.escalarAccionesVencidas()` una vez

**`verificar-certificado.usecase.test.ts`:**
- [ ] Código vigente → `estado: "VIGENTE"`
- [ ] Código vencido por fecha → `estado: "VENCIDA"`
- [ ] Código inexistente → `null`
- [ ] El objeto retornado nunca contiene `hallazgos`, `respuestas` ni `evidencias`

---

## Tests de unidad — Frontend (`agente-qa`)

- [ ] `campana-notificaciones.test.tsx`: badge oculto en 0, `9+` sobre 9, click llama `onToggle`
- [ ] `lista-notificaciones.test.tsx`: estado vacío, click navega y marca como leída
- [ ] `sello-verificacion.test.tsx`: los 3 estados (`VIGENTE`/`VENCIDA`/no encontrado) renderizan el sello correcto y ningún enlace de navegación

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [ ] Ningún archivo en `domain/` o `application/` de `notificaciones` o `verificacion` importa `express` ni `@prisma/client`.
- [ ] `NotificacionPrismaRepository` es el único lugar del módulo `notificaciones` que invoca `$executeRaw`/`$queryRaw` contra los SP de vencimientos y escalamiento.
- [ ] Todos los casos de uso reciben sus repositorios por constructor (inyección de dependencias), sin instanciar Prisma directamente.
- [ ] Los controladores de los 2 módulos nuevos no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [ ] El router de `verificacion` no usa el middleware `autenticar` en ninguna de sus rutas (verificar explícitamente en el código, no solo por comportamiento observado).

**Clean Code:**
- [ ] Ninguna función supera ~40 líneas sin extraer auxiliares con nombre descriptivo.
- [ ] `pnpm lint` pasa en verde en `apps/api` y `apps/web`.
- [ ] No hay variables sin usar ni código comentado tipo "// TODO: implementar".
- [ ] Los tests describen comportamiento en lenguaje natural, no el nombre del método.

**Documentación ISO (JSDoc):**
- [ ] Todas las funciones exportadas de `notificacion.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [ ] Todos los métodos de `NotificacionRepositoryPort` y `VerificacionRepositoryPort` tienen JSDoc de una línea mínimo.
- [ ] Las acciones expuestas por `usar-notificaciones.ts` tienen JSDoc con `@param` y descripción de efecto secundario si lo hay.

---

## Definición de "done" para el sprint

El sprint 006 (Parte A) se considera completo cuando:

1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Cobertura ≥ 80% en `domain/` y `application/` de los módulos `notificaciones` y `verificacion`.
   - Todos los tests de componentes y hooks del frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` de los módulos nuevos importa Express ni Prisma; el router público de `verificacion` no usa el middleware de autenticación.
4. JSDoc presente en las funciones exportadas de `notificacion.entity.ts` y en los 2 puertos de repositorio nuevos.
5. Las 4 historias de usuario de esta parte se ejecutan de punta a punta en el entorno local:
   - HU-1/HU-2: correr el job manualmente genera notificaciones de vencimiento visibles en la campana.
   - HU-3: escanear/visitar `/verificar/[codigo]` de una certificación real muestra su estado sin sesión iniciada.
   - HU-7: dejar una acción vencida más de 7 días y confirmar que se genera `ACCION_ESCALADA` una sola vez.
   Sin errores en consola ni en la red durante todo el recorrido.

> HU-4, HU-5 y HU-6 (panel ejecutivo, calendario de auditorías, biblioteca de hallazgos frecuentes) tienen su propia definición de "done" en [[014-panel-calendario-biblioteca]].
