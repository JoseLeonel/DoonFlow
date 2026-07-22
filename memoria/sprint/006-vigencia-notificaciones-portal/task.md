# Tareas — 006-vigencia-notificaciones-portal

> **Nota (2026-07-16):** este sprint se dividió en dos por tamaño. Este documento cubre solo notificaciones, vigencia, escalamiento y portal público de verificación (HU-1, HU-2, HU-3, HU-7). Panel ejecutivo, calendario de auditorías y biblioteca de hallazgos frecuentes (HU-4, HU-5, HU-6) se movieron a [[014-panel-calendario-biblioteca]] con tareas T-600 en adelante.
> Orden de ejecución: Base de datos → API (notificaciones/verificación) → Frontend → Tests.
> Numeración desde T-270 para no colisionar con sprints anteriores (T-01–T-40 en 001, T-50–T-74 en 002). Los IDs T-271, T-272, T-295–T-297, T-300–T-305, T-316–T-321, T-325, T-328, T-329 del sprint 006 original se movieron íntegros a 014 (no se reutilizan aquí). T-273, T-277 y T-299 se dividieron: la porción de `PlanAuditoria`/`HallazgoFrecuente`/`planificacion`/`hallazgos-frecuentes` de esas tareas también vive en 014.
> Requisito previo: sprints 001–004 y [[015-wizard-certificacion]] implementados. Este sprint lee `Inspeccion.sucursalId`/`periodoEtiqueta` (015), `Inspeccion.codigoVerificacion`/`fechaVencimiento`/`resultadoFinal` (**005, pausado**), `Hallazgo.severidad` (**013**), `AccionCorrectiva.estado`/`fechaLimite`/`responsableId` (**013**), `Sucursal`/`Cliente` (003) y el alcance por rol de `usuario` (004). No se redefine ninguna de esas entidades.
> **⏸️ Bloqueado (2026-07-16):** T-289 (evento HALLAZGO_CRITICO) depende de que [[013-hallazgos-plan-cumplimiento]] exista; T-298 (QR en el PDF) depende de que [[005-certificacion-plan-cumplimiento]] (pausado) exista. Ambos, a su vez, dependen de que 005 se retome primero. El resto de este sprint (notificaciones de acción, portal público sin QR) también queda bloqueado indirectamente porque `AccionCorrectiva` vive en 013. Ver nota de dependencia bloqueada en `spec.md`.
> Nombres de módulo confirmados contra `005-certificacion-plan-cumplimiento/impl.md` (ya existe, aunque hoy documenta el diseño pausado de la firma): el motor de certificación vive **dentro** de `apps/api/src/modules/inspeccion/` — el mismo módulo del editor de plantillas de 001, montado bajo `/inspeccion` — **no** en un módulo `modules/certificacion/` aparte. Sucursales sí está confirmado en `apps/api/src/modules/sucursales/`.

---

## Agente: `agente-basededatos`

- [ ] **T-270** Crear migración `add_notificaciones` en `packages/db/prisma/`:
  - Tabla `notificacion`: `id UUID PK DEFAULT gen_random_uuid()`, `usuario_id UUID FK → usuario(id)`, `tipo VARCHAR(30) NOT NULL` (`ACCION_ASIGNADA` / `ACCION_POR_VENCER` / `ACCION_VENCIDA` / `ACCION_ESCALADA` / `CERTIFICACION_POR_VENCER` / `HALLAZGO_CRITICO`), `referencia_tipo VARCHAR(20) NOT NULL` (`accion_correctiva` / `inspeccion` / `hallazgo`), `referencia_id UUID NOT NULL`, `mensaje TEXT NOT NULL`, `leida_en TIMESTAMPTZ NULLABLE`, `enviada_por_correo BOOLEAN NOT NULL DEFAULT false`, `creado_en TIMESTAMPTZ NOT NULL DEFAULT now()`, `empresa_id UUID FK → empresa(id)`.
  - Agregar enum Prisma `TipoNotificacion` y `ReferenciaNotificacion` con los valores de arriba.
  - Agregar model `Notificacion` al schema con campos camelCase mapeados (mismo patrón que `Cliente`).

- [ ] **T-273** Índices de rendimiento:
  - `notificacion`: `(usuario_id, leida_en)` (listar no leídas de un usuario), `(empresa_id, creado_en)`.
  - (Los índices de `plan_auditoria` y `hallazgo_frecuente` se movieron a [[014-panel-calendario-biblioteca]], tarea T-602.)

- [ ] **T-274** Índice compuesto para idempotencia del job diario: `notificacion (referencia_tipo, referencia_id, tipo, creado_en)` — no único (los recordatorios se repiten en distintos días a 30/15/5/0), pero permite al job verificar rápido "¿ya se generó esta notificación hoy?" sin escanear toda la tabla. Documentar en `impl.md` la consulta exacta que lo usa.

- [ ] **T-275** Crear SP `packages/db/sql/procedimientos/sp_notificacion_generar_vencimientos.sql`: recorre `accion_correctiva` (VENCIDA hoy o a 30/15/5/0 días de `fecha_limite`) e `inspeccion` (`estado = 'FIRMADA'` a 30/15/5/0 días de `fecha_vencimiento`), inserta en `notificacion` evitando duplicar si ya existe una fila con el mismo `(referencia_tipo, referencia_id, tipo)` creada en las últimas 24h. Ver `impl.md` → "Job de notificaciones" para el contrato de entrada/salida.

- [ ] **T-276** Crear SP `packages/db/sql/procedimientos/sp_accion_correctiva_escalar.sql`: recorre `accion_correctiva` con `estado = 'VENCIDO'` y `fecha_limite < now() - 7 días` que **no** tengan ya una `notificacion` tipo `ACCION_ESCALADA` para esa `referencia_id`; inserta la notificación al `administrador_cliente` del cliente dueño de la sucursal (resuelto vía `accion_correctiva → hallazgo → inspeccion → sucursal → cliente → usuario` con `rol = administrador_cliente`), o al administrador general si no hay ninguno asignado a ese cliente.

- [ ] **T-277** Agregar entrada en `memoria/cambios_db/registro.md` con la tabla `notificacion`, los 2 SP (`sp_notificacion_generar_vencimientos`, `sp_accion_correctiva_escalar`) y los índices de este sprint. (La entrada de `plan_auditoria`/`hallazgo_frecuente` se movió a [[014-panel-calendario-biblioteca]], tarea T-603.)

---

## Agente: `agente-backend`

### Módulo `notificaciones`

- [ ] **T-278** Crear `apps/api/src/modules/notificaciones/domain/notificacion.entity.ts`:
  - Tipo `Notificacion` con todos los campos de T-270.
  - `construirMensaje(tipo: TipoNotificacion, contexto: ContextoMensaje): string` — arma el texto ya resuelto (no plantilla) según `tipo`, ej. `"La certificación de {sucursal} vence el {fecha}"`.
  - `debeEscalar(accion: { estado: string; fechaLimite: Date }, diasMinimo = 7): boolean` — `true` si `estado === 'VENCIDO'` y `fechaLimite` tiene más de `diasMinimo` días de vencida.

- [ ] **T-279** Crear `apps/api/src/modules/notificaciones/domain/notificacion.repository.port.ts`:
  - `listarPorUsuario(usuarioId, empresaId, filtros: { soloNoLeidas?: boolean }): Promise<Notificacion[]>`
  - `contarNoLeidas(usuarioId, empresaId): Promise<number>`
  - `marcarLeida(id, usuarioId): Promise<Notificacion>`
  - `marcarTodasLeidas(usuarioId, empresaId): Promise<number>`
  - `crear(datos): Promise<Notificacion>`
  - `existeGeneradaHoy(referenciaTipo, referenciaId, tipo): Promise<boolean>` — usa el índice de T-274.
  - `generarVencimientos(): Promise<number>` — invoca `sp_notificacion_generar_vencimientos` (T-275), retorna cantidad insertada.
  - `escalarAccionesVencidas(): Promise<number>` — invoca `sp_accion_correctiva_escalar` (T-276).

- [ ] **T-280** Crear `apps/api/src/modules/notificaciones/domain/notificacion.errors.ts`: `NotificacionNoEncontradaError`.

- [ ] **T-281** Crear `apps/api/src/modules/notificaciones/application/notificacion.schema.ts`: `listarNotificacionesQuerySchema` (`soloNoLeidas?: boolean`). Sin schema de creación — las notificaciones nunca las crea el usuario final vía API.

- [ ] **T-282** Crear `apps/api/src/modules/notificaciones/application/casos-uso/gestionar-notificaciones.usecase.ts`:
  - `listar(usuarioId, empresaId, filtros)`, `contarNoLeidas(usuarioId, empresaId)`, `marcarLeida(id, usuarioId)` (lanza `NotificacionNoEncontradaError` si no pertenece al usuario), `marcarTodasLeidas(usuarioId, empresaId)`.

- [ ] **T-283** Crear `apps/api/src/modules/notificaciones/application/casos-uso/generar-notificaciones-vencimiento.usecase.ts` (job diario, HU-1/HU-2 recordatorios):
  - `ejecutar(): Promise<{ generadas: number }>` — llama `repo.generarVencimientos()`. Caso de uso delgado a propósito: la lógica de umbrales (30/15/5/0 días) vive en el SP porque es un escaneo agregado sobre miles de filas (ver CLAUDE.md → Procedimientos almacenados), no en TypeScript.
  - La notificación `HALLAZGO_CRITICO` **no** va en este job — se dispara como evento síncrono desde el módulo `certificacion` (ver T-289), porque ocurre al momento de registrar el hallazgo, no en el recorrido diario.

- [ ] **T-284** Crear `apps/api/src/modules/notificaciones/application/casos-uso/escalar-acciones-vencidas.usecase.ts` (HU-7): `ejecutar(): Promise<{ escaladas: number }>` — llama `repo.escalarAccionesVencidas()`.

- [ ] **T-285** Crear `apps/api/src/modules/notificaciones/infrastructure/notificacion.prisma-repository.ts`: implementa el puerto completo; `generarVencimientos()` y `escalarAccionesVencidas()` usan `prisma.$executeRaw` contra los SP de T-275/T-276 — único lugar del módulo donde se invoca SQL crudo (regla hexagonal: SP solo desde `infrastructure/`).

- [ ] **T-286** Crear `apps/api/src/modules/notificaciones/infrastructure/notificacion.controller.ts` y `notificaciones.router.ts`:
  - `GET  /notificaciones` — lista las del usuario autenticado (`?soloNoLeidas=true`)
  - `GET  /notificaciones/no-leidas/contador` — `{ data: { total: number } }`
  - `PATCH /notificaciones/:id/leer`
  - `PATCH /notificaciones/leer-todas`

- [ ] **T-287** Crear `apps/api/src/shared/jobs/programador.ts` (transversal, propiedad de `agente-backend` por ser infraestructura común de `apps/api`): usa `node-cron` para agendar diariamente a las `06:00 America/Costa_Rica` la ejecución secuencial de `GenerarNotificacionesVencimientoUseCase.ejecutar()` y luego `EscalarAccionesVencidasUseCase.ejecutar()`. Inicializar el programador desde `apps/api/src/index.ts` solo si `process.env.NODE_ENV !== 'test'`.

- [ ] **T-288** Crear `apps/api/src/modules/notificaciones/index.ts` con factory `crearModuloNotificaciones(prisma, autenticar)` y montar en `apps/api/src/index.ts` bajo `/notificaciones`.

### Módulo `verificacion` (portal público, HU-3)

- [ ] **T-289 (⏸️ bloqueado hasta que 013 exista)** Modificar el caso de uso de creación de `Hallazgo` en `apps/api/src/modules/inspeccion/application/casos-uso/gestionar-hallazgos.usecase.ts` (archivo de [[013-hallazgos-plan-cumplimiento]], no de 005): tras guardar un hallazgo con `severidad === 'CRITICA'`, invocar `NotificacionRepositoryPort.crear(...)` (inyectado por constructor) para notificar al alcance de la sucursal — evento síncrono, no pasa por el job. Documentar en `impl.md` la dependencia nueva de este caso de uso hacia el puerto de notificaciones.

- [ ] **T-290** Crear `apps/api/src/modules/verificacion/domain/verificacion.repository.port.ts`: `obtenerPorCodigo(codigoVerificacion: string): Promise<CertificadoPublico | null>` — puerto de **solo lectura**, no reutiliza el repositorio completo de `Inspeccion` para no arrastrar métodos de escritura a un flujo sin autenticación.

- [ ] **T-291** Crear `apps/api/src/modules/verificacion/application/casos-uso/verificar-certificado.usecase.ts`: `ejecutar(codigo: string): Promise<CertificadoPublico | null>` — retorna únicamente `{ estado: 'VIGENTE' | 'VENCIDA', cliente, sucursal, fechaEmision, fechaVencimiento, nombrePlantilla }`. `estado` se calcula comparando `fechaVencimiento` con la fecha actual (regla de negocio 3 del spec: es cálculo de presentación, el `estado` interno de `Inspeccion` no cambia). Nunca incluye `hallazgos`, `respuestas` ni `evidencias`.

- [ ] **T-292** Crear `apps/api/src/modules/verificacion/infrastructure/verificacion.prisma-repository.ts`: `obtenerPorCodigo` hace `findFirst({ where: { codigoVerificacion: codigo, estado: 'FIRMADA' } })` proyectando solo los campos públicos, **sin** filtrar por `empresaId` (el código es la única credencial, y es único global según regla 3 de 005).

- [ ] **T-293** Crear `apps/api/src/modules/verificacion/infrastructure/verificacion.controller.ts` y `verificacion.router.ts`: `GET /verificacion/:codigo` — **sin** middleware `autenticar`. Agregar `express-rate-limit` (ej. 20 solicitudes/minuto por IP) en este router específicamente, para evitar fuerza bruta sobre el espacio de códigos.

- [ ] **T-294** Crear `apps/api/src/modules/verificacion/index.ts` con factory `crearModuloVerificacion(prisma)` (sin `autenticar` en la firma) y montar en `apps/api/src/index.ts` bajo `/verificacion`, **antes** del middleware global de autenticación si este último aplica a todas las rutas por defecto — confirmar orden de middlewares con `agente-arquitecto` si el middleware de auth es global.

### QR y proxies

- [ ] **T-298 (⏸️ bloqueado — depende de que se retome 005)** Modificar el generador de PDF del módulo `inspeccion` (`apps/api/src/modules/inspeccion/infrastructure/pdf-certificacion.adapter.ts`, archivo de [[005-certificacion-plan-cumplimiento]] — **pausado**, no existe todavía): agregar dependencia `qrcode`, generar el QR apuntando a `${WEB_PUBLIC_URL}/verificar/{codigoVerificacion}` como imagen embebida (`toDataURL` o `toBuffer`) e insertarla en el PDF antes de guardarlo en `pdfUrl`. Agregar `WEB_PUBLIC_URL` a `.env.example`. No se puede implementar hasta que 005 exista.

- [ ] **T-299** Crear Route Handlers proxy Next.js:
  - `apps/web/src/app/api/notificaciones/route.ts` (GET), `apps/web/src/app/api/notificaciones/no-leidas/contador/route.ts` (GET), `apps/web/src/app/api/notificaciones/[id]/leer/route.ts` (PATCH), `apps/web/src/app/api/notificaciones/leer-todas/route.ts` (PATCH).
  - `apps/web/src/app/api/verificacion/[codigo]/route.ts` (GET) — **sin** adjuntar `Authorization`, reenvía directo al backend público. Sin este proxy el portal público no funcionaría sin exponer el `API_URL` interno al navegador.
  - (Los proxies de `planificacion` y `hallazgos-frecuentes` se movieron a [[014-panel-calendario-biblioteca]], tarea T-607.)

---

## Agente: `agente-frontend`

### Centro de notificaciones (HU-1, HU-2)

- [ ] **T-306** Agregar `packages/shared/src/types/notificacion.ts`: interfaz `Notificacion` (todos los campos de T-270); re-exportar desde `packages/shared/src/index.ts`.

- [ ] **T-307** Crear `packages/ui/src/campana-notificaciones.tsx`: ícono de campana con badge de contador (oculto si `contador === 0`, `9+` si supera 9), `onClick` abre/cierra el dropdown que recibe como children — componente controlado (`abierto`, `onToggle`), sin lógica de datos propia (la trae `usar-notificaciones.ts`).

- [ ] **T-308** Modificar `apps/web/src/app/(dashboard)/_components/header.tsx`: integrar `CampanaNotificaciones` + `ListaNotificaciones` (T-311), conectados a `usar-notificaciones.ts` (T-310).

- [ ] **T-309** Crear `apps/web/src/app/(dashboard)/notificaciones/_servicios/notificacion.servicio.ts`: `listarNotificaciones(soloNoLeidas?)`, `contarNoLeidas()`, `marcarLeida(id)`, `marcarTodasLeidas()`. Este servicio se importa también desde `_components/header.tsx` del layout de dashboard (uso transversal dentro de `apps/web`, no cruza a otro módulo de dominio).

- [ ] **T-310** Crear `apps/web/src/app/(dashboard)/notificaciones/_hooks/usar-notificaciones.ts`: estado `notificaciones`, `noLeidas`, `cargando`; `refrescarContador()` en un intervalo (`setInterval`, ej. cada 60s, limpiar en `useEffect` cleanup) y al montar el header; `marcarLeida(id)` actualiza localmente sin refetch completo.

- [ ] **T-311** Crear `apps/web/src/app/(dashboard)/notificaciones/_components/lista-notificaciones.tsx`: dropdown con las notificaciones recientes (máx. 10), cada ítem navega según `referenciaTipo` (`accion_correctiva` → `/certificaciones/[inspeccionId]/plan` con foco en la acción; `inspeccion` → `/certificaciones/[id]`; `hallazgo` → `/certificaciones/[id]/hallazgos`) y marca la notificación como leída al hacer click. Estado vacío: "No tienes notificaciones".

### Portal de verificación pública (HU-3)

- [ ] **T-312** Crear `apps/web/src/app/verificar/layout.tsx`: layout propio, **sin** `<Sidebar>` ni `<Header>` del dashboard, **sin** guard de sesión — hermano de `apps/web/src/app/auth/`, no hijo de `apps/web/src/app/(dashboard)/`. Fondo simple con logo DoonFlow centrado arriba.

- [ ] **T-313** Crear `apps/web/src/app/verificar/page.tsx`: input de texto para ingresar el código manualmente + botón "Verificar", navega a `/verificar/[codigo]` al enviar.

- [ ] **T-314** Crear `apps/web/src/app/verificar/[codigo]/page.tsx`: Server Component que llama al proxy `GET /api/verificacion/[codigo]` (T-299) en el servidor (sin exponer el `API_URL` interno al cliente) y renderiza el resultado.

- [ ] **T-315** Crear `apps/web/src/app/verificar/[codigo]/_components/sello-verificacion.tsx`: sello visual grande — `Vigente` (verde, ícono check), `Vencida` (gris, ícono reloj), `No encontrada` (rojo, ícono alerta) — más datos de cliente, sucursal, fechas de emisión/vencimiento y plantilla certificada cuando aplica. Sin ningún enlace de navegación al resto del sistema.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. `domain/` sin mocks; `application/` con mock de los puertos.

- [ ] **T-322** `notificacion.entity.test.ts`:
  - `debeEscalar` con `estado = 'VENCIDO'` y `fechaLimite` hace 8 días → `true`
  - `debeEscalar` con `estado = 'VENCIDO'` y `fechaLimite` hace 3 días → `false`
  - `debeEscalar` con `estado = 'CUMPLIDO'` y `fechaLimite` vencida hace 30 días → `false`
  - `construirMensaje('CERTIFICACION_POR_VENCER', {...})` produce el texto esperado con la sucursal y fecha interpoladas
  - `construirMensaje('ACCION_ESCALADA', {...})` produce el texto esperado

- [ ] **T-323** `gestionar-notificaciones.usecase.test.ts`, `generar-notificaciones-vencimiento.usecase.test.ts` y `escalar-acciones-vencidas.usecase.test.ts`:
  - `marcarLeida()` lanza `NotificacionNoEncontradaError` si el repo retorna null o la notificación no pertenece al usuario
  - `contarNoLeidas()` retorna el valor del repositorio sin transformarlo
  - `marcarTodasLeidas()` llama `repo.marcarTodasLeidas(usuarioId, empresaId)`
  - `GenerarNotificacionesVencimientoUseCase.ejecutar()` llama `repo.generarVencimientos()` una sola vez y retorna `{ generadas: N }`
  - `EscalarAccionesVencidasUseCase.ejecutar()` llama `repo.escalarAccionesVencidas()` una sola vez y retorna `{ escaladas: N }`

- [ ] **T-324** `verificar-certificado.usecase.test.ts`:
  - Código existente con `fechaVencimiento` futura → `estado: 'VIGENTE'`
  - Código existente con `fechaVencimiento` pasada → `estado: 'VENCIDA'` (sin cambiar el `estado` interno de `Inspeccion`)
  - Código inexistente → `null`
  - El resultado nunca incluye claves `hallazgos`, `respuestas` ni `evidencias` (verificar por inspección del objeto retornado)

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. Servicios mockeados, sin llamadas de red reales.

- [ ] **T-326** `campana-notificaciones.test.tsx` y `lista-notificaciones.test.tsx`:
  - El badge no se renderiza cuando `contador === 0`
  - El badge muestra `9+` cuando `contador > 9`
  - Click en la campana llama `onToggle`
  - `ListaNotificaciones` con `notificaciones = []` muestra "No tienes notificaciones"
  - Click en un ítem con `referenciaTipo = 'accion_correctiva'` navega a la ruta esperada y llama `marcarLeida`

- [ ] **T-327** `sello-verificacion.test.tsx`:
  - `estado = 'VIGENTE'` renderiza sello verde con texto "Vigente"
  - `estado = 'VENCIDA'` renderiza sello gris con texto "Vencida"
  - `resultado = null` renderiza sello rojo "No encontrada"
  - Ningún estado renderiza enlaces de navegación al dashboard

---

## Dependencias entre tareas

```
T-270 → T-273 → T-274 → T-275, T-276 → T-277
T-274, T-275 → T-278 → T-279 → T-280 → T-281 → T-282
T-276, T-279 → T-283, T-284 → T-285 → T-286 → T-287 → T-288
T-282 → T-286
T-285 → T-289               ← puerto de notificaciones disponible para el evento síncrono de hallazgo crítico
T-270 → T-290 → T-291 → T-292 → T-293 → T-294
T-288, T-294 → T-298
T-286, T-294 → T-299
T-299, T-306 → T-307 → T-308
T-306 → T-309 → T-310 → T-311 → T-308
T-293, T-299 → T-312 → T-313 → T-314 → T-315
T-278 → T-322
T-282, T-283, T-284 → T-323
T-291 → T-324
T-307, T-311 → T-326
T-315 → T-327
```
