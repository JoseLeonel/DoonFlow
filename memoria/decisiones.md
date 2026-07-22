# Decisiones — DoonFlow

Registro de decisiones de arquitectura/negocio no triviales, en orden cronológico (más reciente arriba). Formato corto tipo ADR: contexto, decisión, consecuencias. Cualquier agente puede agregar una entrada; `agente-arquitecto` resuelve si hay contradicción entre dos decisiones registradas.

---

## 2026-07-22 — 012-captura-offline-campo: implementado casi completo; limitación conocida en detección de conflictos de sincronización

- **Contexto:** el sprint 012 amplía el wizard de certificación (015) para tolerar pérdida de conexión — guardado local en IndexedDB + sincronización en segundo plano. Dos tareas puntuales (T-490: bloquear firma sin sincronizar; T-501: deshabilitar el botón "Firmar y certificar") dependen de 005 (firma digital), que sigue pausado y nunca agregó ese botón — quedaron bloqueadas exactamente como el propio `task.md` del sprint ya anticipaba desde su escritura (2026-07-16). El resto del sprint (sincronización de respuestas/evidencias, banner de estado de conexión, resolución de conflictos, badge administrativo) se implementó completo.
- **Decisión de diseño no especificada por el spec**: el puntaje de cada respuesta se recalcula siempre server-side (`calcularPuntajeRespuesta()`), nunca se confía el valor que manda el cliente en el lote de sincronización — mismo principio que ya aplicaba el guardado en línea de 015.
- **Limitación real encontrada durante la verificación E2E (no un bug de código — inherente al diseño de conflictos tal como lo especificó el spec)**: la resolución de conflictos compara `capturadoEnCliente` (timestamp del cliente) contra `InspeccionDetalle.actualizadoEn` (hora del servidor). Un reintento legítimo del mismo cliente con el mismo payload — por ejemplo, tras perder la respuesta HTTP de un sync que en realidad sí se aplicó — se clasifica como "conflicto" (falso positivo) en vez de un no-op idempotente limpio, porque `actualizadoEn` siempre queda en el momento del primer sync exitoso (hora del servidor), posterior al `capturadoEnCliente` original. **No hay pérdida ni corrupción de datos** (la fila no se sobrescribe con nada distinto), pero sí generaría una entrada de auditoría de `SINCRONIZACION_CONFLICTO` innecesaria en ese escenario. Corregirlo de raíz requeriría una columna nueva (guardar el último `capturadoEnCliente` aplicado junto a la fila) — fuera del alcance de la migración ya aplicada este sprint. Se documenta como limitación conocida, no se corrige ahora.
- **Consecuencias:** si en el futuro se observa ruido real en `RegistroAuditoria` por conflictos falsos-positivos de este tipo, la solución es agregar esa columna en una migración nueva — no es una extensión silenciosa de esta decisión, requiere su propia entrada aquí cuando se haga.

## 2026-07-21 — 009-integraciones-datos-masivos: HU-1/HU-2 implementadas, HU-3 (API keys + verificación pública) pospuesta

- **Contexto:** el spec del sprint 009 tenía tres historias de usuario: HU-1 (importación masiva de Clientes desde Excel), HU-2 (importación masiva de Sucursales) y HU-3 (API keys + endpoint público `GET /api/v1/certificaciones/verificar/:codigo` para que sistemas externos verifiquen certificaciones). Al revisar el código real antes de escribir nada, se confirmó que el portal `/verificar/[codigo]` de 006 nunca se implementó (sin código en el repo) y que `Inspeccion.codigoVerificacion`/`fechaVencimiento` no existen porque son campos de 005, que sigue pausado. HU-3 depende de ambas cosas.
- **Decisión:** consultado el usuario vía `AskUserQuestion`, eligió "Implementar HU-1 y HU-2 ahora, posponer HU-3" en vez de bloquear el sprint completo o construir la infraestructura de API keys/verificación pública sin nada real que verificar. Se implementó completo el flujo de importación masiva (entidad `ImportacionLote`, casos de uso `ImportarClientesUseCase`/`ImportarSucursalesUseCase` con modo previsualización dry-run, plantillas `.xlsx` generadas con `xlsx`, subida vía `multer`, historial y descarga de detalle de errores). No se creó el modelo `ApiKey`, ni sus casos de uso, controladores, middlewares (`autenticacion-api-key.middleware.ts`, `limitador-tasa.middleware.ts`), la pantalla `/configuracion/integraciones`, ni se instaló `express-rate-limit`.
- **Consecuencias:** cuando 005 (certificación firmada, incluye `codigoVerificacion`/`fechaVencimiento`) y el portal `/verificar/[codigo]` de 006 se retomen, HU-3 completa queda pendiente de implementar como trabajo nuevo (no hay código parcial de HU-3 que extender, ver desviaciones documentadas en `memoria/sprint/009-integraciones-datos-masivos/impl.md`). Tests finales: 167 backend / 174 frontend (mismas 6 fallas preexistentes no relacionadas). Verificación E2E hecha con `curl` contra `apps/api` y a través del proxy real de Next.js, sin clics reales en navegador (mismo límite que sprints anteriores).

## 2026-07-21 — 008-reportes-analytics: librerías de generación Excel/PDF + alcance reducido por dependencias bloqueadas

- **Contexto (T-371):** el sprint necesitaba generar reportes en Excel y PDF. El spec pedía revisar primero qué motor de PDF había quedado decidido en 005 (certificación firmada) — 005 sigue **pausado**, no existe ninguna decisión previa de PDF en este archivo.
- **Decisión Excel:** `exceljs` — soporta hojas múltiples, estilos de celda, es la librería estándar de Node para este caso y no requiere runtime adicional (a diferencia de motores basados en navegador).
- **Decisión PDF:** `pdfkit` (no Puppeteer/motor basado en Chromium). Puppeteer arrastra un binario de Chromium de cientos de MB, lo cual complica el despliegue mientras el proveedor de hosting de `apps/api` sigue sin decidir (`CLAUDE.md` → Despliegue). `pdfkit` es una librería pura de Node, suficiente para el formato tabular de este sprint (no requiere el layout complejo tipo ficha con QR que sí necesitaría 006/portal público). Si en el futuro el PDF de certificación firmada (005) o el portal público con QR (006) requieren un layout más rico, esa es una decisión aparte — no se fuerza aquí un motor compartido.
- **Alcance reducido de los reportes (consecuencia de 005/013 bloqueados, decisión del usuario 2026-07-21):** el spec original de 008 pedía columnas de `hallazgosAbiertos`/`estadoPlanCumplimiento` (dependen de 013, bloqueado por 005) y de `certificacionVigente`/`certificacionVencida` (dependen de `fechaVencimiento`, campo que 005 agregaría a `Inspeccion` y todavía no existe). Se decidió **adaptar el alcance a los datos reales que existen hoy** (puntaje/porcentaje/clasificación de `Inspeccion` del wizard de 015) en vez de bloquear todo el sprint o construir solo infraestructura sin datos. Los reportes de este sprint no incluyen hallazgos, plan de cumplimiento, ni vigencia/vencimiento — se documenta explícitamente en la UI y en `impl.md` del sprint como limitación conocida, a completar cuando 005/013 se retomen.
- **Hallazgo adicional durante la implementación:** el campo `Inspeccion.estado` nunca sale de `"EN_PROGRESO"` en el código actual — el wizard de 015 ("Guardar y finalizar") nunca actualiza `estado` ni `fechaFin`, solo acumula respuestas/puntaje sección por sección. Los reportes de 008 no pueden distinguir "certificación completa" de "en progreso" a nivel de datos por esta razón — cuentan cualquier `Inspeccion` iniciada dentro del período seleccionado, usando el puntaje acumulado al momento de generar el reporte. No es un bug de 008 — es una limitación preexistente de 015 que 008 hereda y documenta, no corrige (corregirla es alcance de 015/005, no de este sprint).

## 2026-07-21 — Expiración de sesión: reutilizar JWT_EXPIRES_IN, sin refresh token

- **Contexto:** 010-seguridad-privacidad-continuidad (HU-1) pedía una variable `JWT_EXPIRATION_MINUTES` nueva con default 30 min. Al revisar el código real, `LocalAuthAdapter` ya lee `JWT_EXPIRES_IN` desde el entorno (formato `ms`, ej. `"8h"`) y ya lo usaba con default `"8h"` desde el sprint 004 — la expiración configurable ya existía, solo no estaba documentada en `.env.example` ni en `memoria/decisiones.md`.
- **Decisión:** no introducir una segunda variable redundante (`JWT_EXPIRATION_MINUTES`). Se documenta `JWT_EXPIRES_IN` en `.env.example` y se mantiene el default `"8h"` (no se baja a 30 min) — es el valor ya usado desde 004, bajarlo ahora invalidaría sesiones activas de usuarios reales sin aviso y no hay evidencia de que 8h sea inseguro para el perfil de uso actual (jornada de oficina/campo). Sin renovación silenciosa: al expirar, `autenticacion.middleware.ts` devuelve `401 { codigo: "sesion_expirada" }` (distinto de `token_invalido`) y el usuario debe reautenticarse — no hay refresh token en este sprint (queda en "Decisiones pendientes" del spec, requiere diseño propio).
- **Consecuencias:** si en el futuro se decide bajar la expiración o agregar refresh token, es una decisión nueva a registrar aquí, no una extensión silenciosa de esta.

## 2026-06-16 — Responsive: tablet y desktop, no teléfono

- **Contexto:** se pidió que `agente-frontend` desarrolle explícitamente para tablet y desktop.
- **Decisión:** breakpoints objetivo `md:`/`lg:`/`xl:` (≥768px tablet, ≥1280px desktop). No se optimiza para teléfono (<768px); degradación ahí no es bug bloqueante.
- **Consecuencias:** el panel de marca del login (y patrones similares de dos columnas) se muestra desde `md:` en vez de `xl:` como en la plantilla original. Si se requiere soporte real de teléfono más adelante, es una decisión nueva, no una extensión silenciosa de esta.

## 2026-06-16 — Arquitectura por capas en el FrontEnd (no monolítica)

- **Contexto:** la arquitectura hexagonal solo estaba definida para `apps/api`; el frontend no tenía una separación formal y corría riesgo de volverse monolítico (componentes llamando `fetch`/Supabase directamente).
- **Decisión:** cada módulo de `apps/web` se separa en `_servicios/` (acceso a datos), `_hooks/` (estado/orquestación) y `_components/` (presentación pura), con `page.tsx` como composición. Regla de dependencia: `page` → `_hooks` → `_servicios`; los componentes no llaman servicios directamente.
- **Consecuencias:** mismo espíritu que la arquitectura hexagonal del backend pero adaptada a Next.js/React (no son los mismos nombres de capa porque el frontend no tiene "dominio" propio, solo presentación + acceso a datos + estado). `agente-qa` vigila esta separación igual que vigila la hexagonal.

## 2026-06-16 — Stored procedures para lógica de BD crítica + carpeta de producción

- **Contexto:** se necesitaba definir si el agente de base de datos trabaja solo vía Prisma o también con SQL nativo, y cómo se rastrean los cambios de BD camino a producción.
- **Decisión:** la lógica de BD crítica/transaccional (cálculos agregados, validaciones atómicas, reportes pesados) se construye como **stored procedures de PostgreSQL** (`packages/db/sql/procedimientos/`), invocados solo desde `infrastructure/`. Los cambios validados se registran en `packages/db/produccion/CHANGELOG.md` antes de aplicarse a producción.
- **Consecuencias:** el CRUD simple sigue siendo Prisma ORM normal; los SP son la excepción para lo que requiere atomicidad o performance. `agente-basededatos` prepara el changelog, `agente-produccion` lo aplica y lo marca.

## 2026-06-16 — Organización de agentes en dos niveles (técnico + dominio)

- **Contexto:** se pidieron agentes por capa técnica (FrontEnd, BackEnd, Base de Datos, Análisis, Producción, QA) además de los ya existentes por dominio (fincas, trazabilidad, inventario, analytics, auth).
- **Decisión:** mantener ambos niveles. Los agentes técnicos son dueños de la infraestructura transversal de su capa (UI compartida, base de la API, esquema global de BD, CI/CD, suite de tests); los de dominio implementan features dentro de esas convenciones, sin redefinirlas.
- **Consecuencias:** más agentes que coordinar, pero separación de responsabilidades más clara. Regla de prioridad: `agente-arquitecto` > `agente-qa` (puede bloquear merge) > agente técnico dueño de la capa > agente de dominio.

## 2026-06-16 — Sistema de diseño basado en plantilla externa

- **Contexto:** se necesitaba una base de estilos/tablas/dashboard/login en vez de diseñar desde cero.
- **Decisión:** usar `nextjs-admin-dashboard-main` (local, fuera del monorepo) como referencia de patrones — tokens de Tailwind, primitivas de tabla, layout de dashboard y de login. Se porta el patrón, no el contenido/datos demo de la plantilla.
- **Consecuencias:** `agente-frontend` es responsable de portar y mantener estos patrones en `packages/ui`; ningún otro agente debe reimplementar estilos en paralelo.

## 2026-06-16 — Arquitectura hexagonal en el backend

- **Contexto:** se pidió evitar código espagueti explícitamente.
- **Decisión:** `apps/api` sigue arquitectura hexagonal (`domain/application/infrastructure` por módulo). Regla de dependencia: siempre hacia el dominio. Prohibido importar `express`/`@prisma/client` fuera de `infrastructure/`.
- **Consecuencias:** estructura de archivos por módulo cambia de flat (`router/controller/service/schema/types/test`) a las 3 carpetas por capa. `agente-qa` vigila el cumplimiento.

## 2026-06-16 — Aislamiento multiempresa: RLS + filtro de aplicación

- **Contexto:** `empresa_id` está en todas las tablas de dominio, pero no estaba definido el mecanismo de aislamiento.
- **Decisión:** defensa en profundidad — RLS de Supabase como primera línea, filtro explícito por `empresaId` en cada repositorio Prisma como segunda línea. No depender solo de RLS.
- **Consecuencias:** cada método de repositorio recibe `empresaId` obligatoriamente.

## 2026-06-16 — Backend fijado en Express (no Fastify)

- **Contexto:** el borrador inicial dejaba la elección abierta ("Express o Fastify").
- **Decisión:** Express, para consistencia con la estructura de adaptadores HTTP documentada.
- **Consecuencias:** ninguna ambigüedad futura sobre qué framework usar en `apps/api`.
