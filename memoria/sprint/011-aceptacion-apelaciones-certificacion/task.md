# Tareas — 011-aceptacion-apelaciones-certificacion

> Orden de ejecución: Base de datos → API → Frontend → Tests.
> Numeración desde T-450 para no colisionar con sprints anteriores (001: T-01-T-40, 002: T-50-T-74).
> Depende de que 001-007 estén implementados, en particular [[005-certificacion-plan-cumplimiento]] (`Inspeccion` con `firmadoPorId`/`firmadoEn`/`resultadoFinal`), [[013-hallazgos-plan-cumplimiento]] (`Hallazgo`, incluida la regla de severidad 1.1 que este sprint reutiliza — ambos dentro del mismo módulo `apps/api/src/modules/inspeccion/`, no un módulo `certificacion/` aparte) y [[007-gobernanza-permisos-aprobacion]] (catálogo `Permiso`/`RolPermiso`).
> **⏸️ Sprint completo bloqueado:** 005 está pausado (firma digital no se implementa por ahora) y 013 depende de 005 — ninguna tarea de este listado se puede ejecutar hasta que esa cadena se resuelva. Ver nota en `spec.md`.

---

## Agente: `agente-basededatos`

- [ ] **T-450** Crear migración `add_aceptacion_apelaciones` en `packages/db/prisma/migrations/`:
  - `ALTER TABLE inspeccion ADD COLUMN aceptado_por_cliente_id UUID NULL REFERENCES usuario(id), ADD COLUMN aceptado_en TIMESTAMPTZ NULL`.
  - `ALTER TABLE hallazgo ADD COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO'` (valores `ACTIVO` / `ANULADO_POR_APELACION`) — campo nuevo, separado de `severidad` (ver decisión de diseño en `impl.md`).
  - `CREATE TABLE apelacion` con todos los campos de la spec (`id`, `empresa_id`, `inspeccion_id`, `hallazgo_id` nullable, `tipo`, `motivo`, `solicitado_por_id`, `solicitado_en`, `estado`, `resuelto_por_id`, `resuelto_en`, `resolucion_comentario`).
  - Índices: `(empresa_id, estado)`, `(inspeccion_id)`, `(hallazgo_id)`.
- [ ] **T-451** Agregar al `schema.prisma`:
  - Campos `aceptadoPorClienteId` / `aceptadoEn` en `model Inspeccion`.
  - Campo `estado` (enum `EstadoHallazgo { ACTIVO ANULADO_POR_APELACION }`, default `ACTIVO`) en `model Hallazgo`.
  - `model Apelacion` completo + enums `TipoApelacion { SOBRE_HALLAZGO SOBRE_RESULTADO }` y `EstadoApelacion { ABIERTA EN_REVISION ACEPTADA RECHAZADA }`.
  - Relaciones inversas `apelaciones Apelacion[]` en `Inspeccion` y en `Hallazgo`.
- [ ] **T-452** Seed idempotente (`packages/db/prisma/seeds/permisos-apelaciones.ts`, invocado desde `seed.ts`): insertar permiso `apelaciones.resolver` (`upsert` por `codigo`) en la tabla `permiso` y asignarlo vía `RolPermiso` a los roles `auditor` y `administrador_general` (el rol `administrador` ya tiene todos los permisos por regla de [[007-gobernanza-permisos-aprobacion]]).
- [ ] **T-453** Registrar el cambio (migración + seed) en `memoria/cambios_db/registro.md`.

---

## Agente: `agente-backend`

> Nuevo módulo `apps/api/src/modules/apelaciones/`, siguiendo el mismo patrón factory que `clientes` e `inspeccion`. Extiende además el módulo `inspeccion` existente: la parte de `Inspeccion`/firma de [[005-certificacion-plan-cumplimiento]] y la parte de `Hallazgo` de [[013-hallazgos-plan-cumplimiento]].

- [ ] **T-454** Crear `domain/apelacion.entity.ts` en el módulo `apelaciones`:
  - Tipo `Apelacion` con todos los campos.
  - `estaDentroDePlazo(firmadoEn: Date, ahora: Date, plazoDias: number): boolean` — usa `PLAZO_APELACION_DIAS` re-exportado desde `packages/shared/src/constants/apelaciones.ts`.
  - `puedeResolver(apelacion: Apelacion, resolutorId: string, firmadoPorId: string): boolean` — `false` si `resolutorId === firmadoPorId` (separación de funciones, misma lógica que [[007-gobernanza-permisos-aprobacion]]).
  - `puedeApelar(inspeccion: { estado: string; fechaVencimiento: Date | null; firmadoEn: Date | null }, ahora: Date): boolean` — requiere `estado === "FIRMADA"`, `firmadoEn` no nulo, dentro de plazo y `fechaVencimiento` no pasada (o nula).
- [ ] **T-455** Crear `domain/apelacion.repository.port.ts`:
  - `crear(datos): Promise<Apelacion>`
  - `obtenerPorId(id, empresaId): Promise<Apelacion | null>`
  - `listarAbiertas(empresaId): Promise<Apelacion[]>` — `estado IN (ABIERTA, EN_REVISION)`, orden `solicitadoEn ASC`.
  - `listarPorInspeccion(inspeccionId, empresaId): Promise<Apelacion[]>`
  - `resolver(id, empresaId, datos): Promise<Apelacion>`
- [ ] **T-456** Crear `domain/apelacion.errors.ts`: `ApelacionNoEncontradaError`, `PlazoApelacionVencidoError`, `CertificacionNoFirmadaError`, `CertificacionVencidaError`, `ApelacionSeparacionFuncionesError`, `ComentarioResolucionRequeridoError`, `ApelacionYaResueltaError`, `CertificacionYaAceptadaError`.
- [ ] **T-457** Crear `application/apelacion.schema.ts` (Zod):
  - `crearApelacionSchema`: `inspeccionId` (uuid, requerido), `tipo` (`"SOBRE_HALLAZGO" | "SOBRE_RESULTADO"`, requerido), `hallazgoId` (uuid, requerido si `tipo === "SOBRE_HALLAZGO"`, prohibido si `"SOBRE_RESULTADO"` — `.superRefine`), `motivo` (string, mín. 10 caracteres).
  - `resolverApelacionSchema`: `estado` (`"ACEPTADA" | "RECHAZADA"`), `resolucionComentario` (string, mín. 10 caracteres, requerido siempre).
- [ ] **T-458** Crear caso de uso `application/casos-uso/presentar-apelacion.usecase.ts`:
  - Obtiene la `Inspeccion` (vía puerto del módulo `certificacion`, inyectado por constructor), valida `puedeApelar()`; si no, lanza el error de dominio correspondiente (`CertificacionNoFirmadaError` / `PlazoApelacionVencidoError` / `CertificacionVencidaError`).
  - Llama `repo.crear()` con `estado: "ABIERTA"`, `solicitadoPorId` del usuario autenticado, `empresaId` del JWT.
- [ ] **T-459** Crear caso de uso `application/casos-uso/resolver-apelacion.usecase.ts`:
  - Lanza `ApelacionNoEncontradaError` si no existe; `ApelacionYaResueltaError` si `estado` ya es `ACEPTADA`/`RECHAZADA`.
  - Valida `puedeResolver()` (separación de funciones) → si falla, `ApelacionSeparacionFuncionesError`.
  - Exige `resolucionComentario` no vacío (ya validado por Zod, pero se repite como invariante de dominio) → `ComentarioResolucionRequeridoError`.
  - Si `estado: "ACEPTADA"` y `tipo === "SOBRE_HALLAZGO"`: llama `anularHallazgoPorApelacion(hallazgoId)` y `recalcularResultadoFinal(inspeccionId)` (funciones de dominio del módulo `certificacion`, inyectadas por puerto — ver T-463).
  - Si `estado: "ACEPTADA"` y `tipo === "SOBRE_RESULTADO"`: no hay hallazgo que anular; solo se registra `estado: "ACEPTADA"` con su comentario — la consecuencia operativa queda a criterio del auditor en una revisión manual posterior (fuera de alcance recalcular automáticamente, ver `impl.md`).
  - Persiste `resueltoPorId`, `resueltoEn = now()`.
- [ ] **T-460** Crear caso de uso `application/casos-uso/listar-apelaciones.usecase.ts`:
  - `listarAbiertas(empresaId)` — para la pantalla de resolución (auditor/administrador).
  - `listarPorInspeccion(inspeccionId, empresaId)` — para mostrar el historial de apelaciones dentro de la certificación.
- [ ] **T-461** Crear `infrastructure/apelacion.prisma-repository.ts`: implementa el puerto, siempre filtra por `empresaId`; `listarAbiertas` hace `orderBy: { solicitadoEn: "asc" }`.
- [ ] **T-462** Crear `infrastructure/apelacion.controller.ts` y `infrastructure/apelaciones.router.ts`, y `index.ts` con `crearModuloApelaciones(prisma, autenticar, autorizar)`:
  - `POST   /apelaciones` — presentar apelación (cualquier usuario autenticado con acceso a la certificación).
  - `GET    /apelaciones` — lista abiertas (`?estado=ABIERTA,EN_REVISION`), requiere permiso `apelaciones.resolver`.
  - `GET    /apelaciones/:id` — detalle (certificación + hallazgo si aplica).
  - `POST   /apelaciones/:id/resolver` — requiere permiso `apelaciones.resolver`; body `{ estado, resolucionComentario }`.
  - Montar en `apps/api/src/index.ts` bajo `/apelaciones`.
- [ ] **T-463** Extender el módulo `inspeccion` existente (de [[001-crud-formulario]] — **no** un módulo `certificacion` aparte, nombre real confirmado en `005-certificacion-plan-cumplimiento/impl.md`):
  - `application/casos-uso/aceptar-certificacion.usecase.ts` (archivo de [[005-certificacion-plan-cumplimiento]]): valida `inspeccion.estado === "FIRMADA"` (si no, `CertificacionNoFirmadaError`), valida `aceptadoEn === null` (si no, `CertificacionYaAceptadaError`), persiste `aceptadoPorClienteId` (usuario autenticado) y `aceptadoEn = now()`. No cambia `estado` de la inspección — es informativo, no bloquea el certificado (regla de negocio 5 de la spec).
  - `domain/hallazgo.entity.ts` (archivo de [[013-hallazgos-plan-cumplimiento]]): agregar `anularHallazgoPorApelacion(hallazgo): Hallazgo` (retorna copia con `estado: "ANULADO_POR_APELACION"`) y `recalcularResultadoFinal(hallazgosActivos): "APROBADA" | "APROBADA_CON_OBSERVACIONES" | "RECHAZADA"` (reutiliza la misma regla de severidad de [[013-hallazgos-plan-cumplimiento]] regla 1.1, pero excluyendo del cálculo los hallazgos con `estado: "ANULADO_POR_APELACION"`).
  - `infrastructure/certificacion.controller.ts` / `inspeccion.router.ts`: nuevo endpoint `POST /inspeccion/certificaciones/:id/aceptar`.
  - Exponer las funciones de dominio y el repositorio de `Hallazgo`/`Inspeccion` a través de un puerto que el módulo `apelaciones` pueda inyectar (evita que `apelaciones` importe `@prisma/client` directamente para tocar `Hallazgo`/`Inspeccion`).
- [ ] **T-464** Crear Route Handlers proxy Next.js:
  - `apps/web/src/app/api/apelaciones/route.ts` (GET lista + POST crear)
  - `apps/web/src/app/api/apelaciones/[id]/route.ts` (GET detalle)
  - `apps/web/src/app/api/apelaciones/[id]/resolver/route.ts` (POST)
  - `apps/web/src/app/api/inspeccion/certificaciones/[id]/aceptar/route.ts` (POST, dentro del árbol de proxy ya existente de 005)
  - `apps/web/src/app/api/inspeccion/certificaciones/[id]/apelaciones/route.ts` (GET, lista por certificación)

---

## Agente: `agente-frontend`

- [ ] **T-465** Agregar tipos en `packages/shared/src/types/apelacion.ts` (`Apelacion`, `TipoApelacion`, `EstadoApelacion`) y constante `PLAZO_APELACION_DIAS = 15` en `packages/shared/src/constants/apelaciones.ts`; re-exportar ambos desde `packages/shared/src/index.ts`.
- [ ] **T-466** Crear `apps/web/src/app/(dashboard)/apelaciones/_servicios/apelacion.servicio.ts`: `listarApelacionesAbiertas()`, `obtenerApelacion(id)`, `presentarApelacion(datos)`, `resolverApelacion(id, datos)`, `listarApelacionesDeInspeccion(inspeccionId)`. Extender `apps/web/.../certificaciones/[id]/_servicios/certificacion.servicio.ts` con `aceptarCertificacion(id)`.
- [ ] **T-467** Crear hook `apps/web/src/app/(dashboard)/apelaciones/_hooks/usar-apelaciones.ts`: estado `apelaciones`, `cargando`, `error`; acción `recargar()`. Crear `_hooks/usar-resolver-apelacion.ts`: estado `guardando`, `error`; acción `resolver(id, { estado, resolucionComentario })` que llama al servicio y navega/actualiza la lista.
- [ ] **T-468** Crear hook `apps/web/src/app/(dashboard)/certificaciones/[id]/_hooks/usar-presentar-apelacion.ts`: estado `guardando`, `error`; acción `enviar({ tipo, hallazgoId?, motivo })`. Extender `usar-certificacion.ts` (existente de 005) con acción `aceptar()` y estado derivado `pendienteDeAceptacion` (`estado === "FIRMADA" && aceptadoEn === null`).
- [ ] **T-469** Crear componente `_components/tarjeta-aceptacion-certificacion.tsx` dentro de `certificaciones/[id]/_components/`: tarjeta "Certificación pendiente de tu confirmación" con botón "Aceptar" y enlace "Presentar apelación en su lugar"; se integra en `certificaciones/[id]/page.tsx` cuando `pendienteDeAceptacion === true`.
- [ ] **T-470** Crear página `apps/web/src/app/(dashboard)/certificaciones/[id]/apelacion/nueva/page.tsx` + componente `_components/formulario-apelacion.tsx`: selector "Sobre un hallazgo específico" (lista de hallazgos de la certificación) / "Sobre el resultado general", textarea de motivo, validación mínima de 10 caracteres, muestra el plazo restante calculado con `estaDentroDePlazo`.
- [ ] **T-471** Crear componentes `apps/web/src/app/(dashboard)/apelaciones/_components/tabla-apelaciones.tsx` (columnas: Certificación/Sucursal, Tipo, Motivo, Solicitado por, Antigüedad, Estado) y `_components/badge-estado-apelacion.tsx` (ABIERTA/EN_REVISION en amarillo, ACEPTADA en verde, RECHAZADA en rojo).
- [ ] **T-472** Crear página lista `apps/web/src/app/(dashboard)/apelaciones/page.tsx` (usa `usar-apelaciones` + `TablaApelaciones`, ordenada por antigüedad) y página detalle `apps/web/src/app/(dashboard)/apelaciones/[id]/page.tsx` con componente `_components/panel-resolucion-apelacion.tsx` (detalle de certificación/hallazgo, motivo, botones Aceptar/Rechazar con `textarea` de justificación obligatoria).
- [ ] **T-473** Agregar entrada "Apelaciones" al sidebar (`apps/web/src/app/(dashboard)/_components/sidebar.tsx`), visible solo si el usuario tiene el permiso `apelaciones.resolver` (mismo mecanismo de permisos de [[007-gobernanza-permisos-aprobacion]]); si el usuario no tiene el permiso y navega directo a `/apelaciones`, la página muestra estado "No tienes permiso para resolver apelaciones" en vez de la lista.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Vitest. Dominio puro sin mocks; casos de uso con mock de los puertos.

- [ ] **T-474** `apelacion.entity.test.ts`:
  - `estaDentroDePlazo` con `firmadoEn` hace 5 días y plazo 15 → `true`
  - `estaDentroDePlazo` con `firmadoEn` hace 20 días y plazo 15 → `false`
  - `estaDentroDePlazo` justo en el límite (día 15) → `true`
  - `puedeResolver` con `resolutorId !== firmadoPorId` → `true`
  - `puedeResolver` con `resolutorId === firmadoPorId` → `false` (separación de funciones)
  - `puedeApelar` con inspección `FIRMADA`, dentro de plazo, sin vencer → `true`
  - `puedeApelar` con inspección `EN_PROGRESO` → `false`
  - `puedeApelar` con `fechaVencimiento` pasada → `false`
  - `puedeApelar` fuera de plazo → `false`
- [ ] **T-475** `presentar-apelacion.usecase.test.ts`:
  - Lanza `CertificacionNoFirmadaError` si la inspección no está `FIRMADA`
  - Lanza `PlazoApelacionVencidoError` si `firmadoEn` supera `PLAZO_APELACION_DIAS`
  - Lanza `CertificacionVencidaError` si `fechaVencimiento` ya pasó
  - Con `tipo: "SOBRE_HALLAZGO"` y `hallazgoId` válido → llama `repo.crear()` con `estado: "ABIERTA"`
  - Con `tipo: "SOBRE_RESULTADO"` → `hallazgoId` queda `null` en los datos persistidos
- [ ] **T-476** `resolver-apelacion.usecase.test.ts`:
  - Lanza `ApelacionNoEncontradaError` si el repo retorna `null`
  - Lanza `ApelacionYaResueltaError` si `apelacion.estado` ya es `ACEPTADA`/`RECHAZADA`
  - Lanza `ApelacionSeparacionFuncionesError` si `resolutorId === inspeccion.firmadoPorId`
  - `estado: "ACEPTADA"` + `tipo: "SOBRE_HALLAZGO"` → llama `anularHallazgoPorApelacion()` y `recalcularResultadoFinal()`
  - `estado: "ACEPTADA"` + `tipo: "SOBRE_RESULTADO"` → NO llama `anularHallazgoPorApelacion()`
  - `estado: "RECHAZADA"` → no toca el hallazgo, solo persiste `resueltoPorId`/`resueltoEn`/`resolucionComentario`
  - `recalcularResultadoFinal` excluye del cálculo los hallazgos `ANULADO_POR_APELACION`: con un único hallazgo `CRITICA` anulado y el resto `MENOR` → `APROBADA_CON_OBSERVACIONES` (no `RECHAZADA`)
- [ ] **T-477** `aceptar-certificacion.usecase.test.ts` + test de integración ligera:
  - Lanza `CertificacionNoFirmadaError` si `estado !== "FIRMADA"`
  - Lanza `CertificacionYaAceptadaError` si `aceptadoEn` ya tiene valor
  - Caso feliz: persiste `aceptadoPorClienteId` y `aceptadoEn`, no cambia `estado`
  - Integración: `POST /apelaciones` → `GET /apelaciones/:id` retorna la apelación creada con `estado: "ABIERTA"` (contra BD de pruebas local)

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Vitest + React Testing Library. Servicios mockeados, sin llamadas de red reales.

- [ ] **T-478** `tarjeta-aceptacion-certificacion.test.tsx`:
  - No renderiza nada si `pendienteDeAceptacion = false`
  - Renderiza el texto "Certificación pendiente de tu confirmación" cuando `pendienteDeAceptacion = true`
  - El botón "Aceptar" llama `onAceptar`
  - El enlace "Presentar apelación en su lugar" navega a `/certificaciones/[id]/apelacion/nueva`
- [ ] **T-479** `formulario-apelacion.test.tsx`:
  - Renderiza el selector de tipo (hallazgo específico / resultado general) y el textarea de motivo
  - Al elegir "Sobre un hallazgo específico" aparece el selector de hallazgos; al elegir "Sobre el resultado general" se oculta
  - Intento de enviar con `motivo` de menos de 10 caracteres no llama `onEnviar`
  - Con datos válidos, clic en "Enviar apelación" llama `onEnviar` con `{ tipo, hallazgoId?, motivo }`
  - `guardando = true` deshabilita el botón y muestra spinner
- [ ] **T-480** `tabla-apelaciones.test.tsx` y `badge-estado-apelacion.test.tsx`:
  - Con `apelaciones = []` muestra estado vacío "No hay apelaciones abiertas"
  - Renderiza filas ordenadas por antigüedad (la más antigua primero)
  - `BadgeEstadoApelacion` con `ABIERTA`/`EN_REVISION` → clase amarilla; `ACEPTADA` → verde; `RECHAZADA` → roja
- [ ] **T-481** `panel-resolucion-apelacion.test.tsx` y `usar-apelaciones.test.ts` (hook):
  - El botón "Rechazar" con el textarea de justificación vacío no llama `onResolver`
  - Con justificación escrita, "Aceptar" llama `onResolver(id, { estado: "ACEPTADA", resolucionComentario })`
  - `usar-apelaciones`: `recargar()` actualiza `apelaciones` y limpia `error` en éxito; setea `error` si el servicio falla

---

## Dependencias entre tareas

```
T-450 → T-451 → T-452 → T-453
T-451 → T-454, T-455, T-456
T-455, T-456 → T-457 → T-458, T-459, T-460
T-458, T-459, T-460 → T-461 → T-462 → T-464
T-452 → T-462                    ← permiso apelaciones.resolver debe existir antes de proteger las rutas
T-462 → T-463                    ← aceptar-certificacion y anular-hallazgo se exponen vía puerto que apelaciones consume
T-463 → T-464
T-464 → T-465 → T-466 → T-467, T-468
T-468 → T-469
T-465 → T-470
T-467 → T-471, T-472
T-462 → T-473                    ← el sidebar depende de que el permiso exista y el endpoint responda
T-454 → T-474
T-458 → T-475
T-459 → T-476
T-463 → T-477
T-469 → T-478
T-470 → T-479
T-471 → T-480
T-472 → T-481
```
