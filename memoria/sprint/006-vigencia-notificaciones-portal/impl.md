# Guía de implementación — 006-vigencia-notificaciones-portal

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Base: sprints 001–005 ya implementados. Este sprint agrega 2 módulos nuevos de backend (`notificaciones`, `verificacion`) y agrega 2 pantallas de frontend.
> **Nota (2026-07-16):** este sprint se dividió en dos por tamaño. Este documento cubre solo notificaciones/vigencia/escalamiento/portal público. El panel ejecutivo, calendario de auditorías y biblioteca de hallazgos frecuentes viven en [[014-panel-calendario-biblioteca]] (que reutiliza el patrón de `Notificacion` documentado aquí donde aplica).

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: agregar Notificacion
└── migrations/
    └── YYYYMMDDHHMMSS_add_notificaciones/

sql/procedimientos/
├── sp_notificacion_generar_vencimientos.sql         ← CREAR
└── sp_accion_correctiva_escalar.sql                 ← CREAR
```

**Modelos Prisma a agregar (siguiendo el patrón camelCase/`@map` de `Cliente`):**

```prisma
enum TipoNotificacion {
  ACCION_ASIGNADA
  ACCION_POR_VENCER
  ACCION_VENCIDA
  ACCION_ESCALADA
  CERTIFICACION_POR_VENCER
  HALLAZGO_CRITICO
}

enum ReferenciaNotificacion {
  accion_correctiva
  inspeccion
  hallazgo
}

model Notificacion {
  id                String                  @id @default(uuid())
  usuarioId         String                  @map("usuario_id")
  tipo              TipoNotificacion
  referenciaTipo    ReferenciaNotificacion  @map("referencia_tipo")
  referenciaId      String                  @map("referencia_id")
  mensaje           String
  leidaEn           DateTime?               @map("leida_en")
  enviadaPorCorreo  Boolean                 @default(false) @map("enviada_por_correo")
  creadoEn          DateTime                @default(now()) @map("creado_en")
  empresaId         String                  @map("empresa_id")

  usuario   Usuario @relation(fields: [usuarioId], references: [id])
  empresaRel Empresa @relation(fields: [empresaId], references: [id])

  @@index([usuarioId, leidaEn])
  @@index([empresaId, creadoEn])
  @@index([referenciaTipo, referenciaId, tipo, creadoEn])
  @@map("notificacion")
}
```

> Los modelos `PlanAuditoria` y `HallazgoFrecuente` se movieron a [[014-panel-calendario-biblioteca]].

**Job de notificaciones — contrato del SP:**

```sql
-- sp_notificacion_generar_vencimientos.sql
-- Sin parámetros de entrada (usa now() internamente).
-- Retorna: cantidad de filas insertadas (INTEGER).
-- Umbrales fijos: 30, 15, 5 y 0 días antes de accion_correctiva.fecha_limite / inspeccion.fecha_vencimiento.
-- Idempotencia: antes de insertar, verifica que no exista ya una fila en `notificacion`
-- con (referencia_tipo, referencia_id, tipo) creada en las últimas 24 horas
-- (usa el índice compuesto de T-274).
```

```sql
-- sp_accion_correctiva_escalar.sql
-- Sin parámetros de entrada.
-- Retorna: cantidad de notificaciones ACCION_ESCALADA insertadas.
-- Selecciona accion_correctiva WHERE estado = 'VENCIDO' AND fecha_limite < now() - interval '7 days'
--   AND NOT EXISTS (SELECT 1 FROM notificacion WHERE referencia_tipo = 'accion_correctiva'
--                    AND referencia_id = accion_correctiva.id AND tipo = 'ACCION_ESCALADA')
-- Resuelve destinatario: administrador_cliente del cliente dueño de la sucursal de la
-- certificación del hallazgo de la acción; si no existe, cae al administrador_general de la empresa.
```

### Backend (`apps/api`)

```
src/modules/notificaciones/
├── domain/
│   ├── notificacion.entity.ts
│   ├── notificacion.repository.port.ts
│   └── notificacion.errors.ts
├── application/
│   ├── notificacion.schema.ts
│   └── casos-uso/
│       ├── gestionar-notificaciones.usecase.ts
│       ├── generar-notificaciones-vencimiento.usecase.ts
│       └── escalar-acciones-vencidas.usecase.ts
├── infrastructure/
│   ├── notificacion.prisma-repository.ts
│   ├── notificacion.controller.ts
│   └── notificaciones.router.ts
├── index.ts
└── __tests__/
    ├── notificacion.entity.test.ts
    ├── gestionar-notificaciones.usecase.test.ts
    ├── generar-notificaciones-vencimiento.usecase.test.ts
    └── escalar-acciones-vencidas.usecase.test.ts

src/modules/verificacion/
├── domain/
│   └── verificacion.repository.port.ts          ← sin entity.ts propio: reutiliza tipos de Inspeccion, solo define el DTO CertificadoPublico
├── application/
│   └── casos-uso/
│       └── verificar-certificado.usecase.ts
├── infrastructure/
│   ├── verificacion.prisma-repository.ts
│   ├── verificacion.controller.ts
│   └── verificacion.router.ts                   ← SIN middleware autenticar
├── index.ts
└── __tests__/
    └── verificar-certificado.usecase.test.ts

src/modules/inspeccion/                             ← MODIFICAR (módulo de 001/005, no se recrea — NO es `modules/certificacion/`)
├── application/casos-uso/
│   ├── gestionar-hallazgos.usecase.ts               ← MODIFICAR: evento síncrono HALLAZGO_CRITICO
│   └── gestionar-accion-correctiva.usecase.ts       ← MODIFICAR: evento síncrono ACCION_ASIGNADA
└── infrastructure/
    └── pdf-certificacion.adapter.ts                 ← MODIFICAR: agregar QR

src/shared/jobs/
└── programador.ts                                   ← CREAR (node-cron, transversal)
```

> Los módulos `planificacion` y `hallazgos-frecuentes`, y la extensión de `reportes` para el panel ejecutivo, se movieron a [[014-panel-calendario-biblioteca]].

Líneas a agregar en `apps/api/src/index.ts`:

```typescript
import { crearModuloNotificaciones } from "./modules/notificaciones";
import { crearModuloVerificacion } from "./modules/verificacion";
import { iniciarProgramador } from "./shared/jobs/programador";

const moduloNotificaciones = crearModuloNotificaciones(prisma, autenticar);
app.use("/notificaciones", moduloNotificaciones.router);

// SIN autenticar — portal público, montar antes de cualquier middleware global de auth si existe
const moduloVerificacion = crearModuloVerificacion(prisma);
app.use("/verificacion", moduloVerificacion.router);

if (process.env.NODE_ENV !== "test") {
  iniciarProgramador({ prisma });
}
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/
├── notificaciones/
│   ├── route.ts                                     ← GET
│   ├── no-leidas/contador/route.ts                  ← GET
│   ├── [id]/leer/route.ts                           ← PATCH
│   └── leer-todas/route.ts                          ← PATCH
└── verificacion/
    └── [codigo]/route.ts                            ← GET, SIN Authorization — reenvía anónimo
```

### Tipos compartidos (`packages/shared`)

```
src/types/
├── notificacion.ts             ← CREAR
└── index.ts                    ← MODIFICAR: re-exportar notificacion.ts
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/notificaciones/
├── _servicios/notificacion.servicio.ts
├── _hooks/usar-notificaciones.ts
└── _components/lista-notificaciones.tsx

src/app/(dashboard)/_components/
└── header.tsx                                       ← MODIFICAR: integrar CampanaNotificaciones

src/app/verificar/                                     ← FUERA de (dashboard), sin auth
├── layout.tsx
├── page.tsx
└── [codigo]/
    ├── page.tsx
    └── _components/sello-verificacion.tsx

packages/ui/src/
└── campana-notificaciones.tsx

packages/ui/src/__tests__/
└── campana-notificaciones.test.tsx
```

---

## Contrato de API (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/notificaciones` | Sí | `?soloNoLeidas=true` — notificaciones del usuario autenticado |
| GET | `/notificaciones/no-leidas/contador` | Sí | `{ data: { total } }` |
| PATCH | `/notificaciones/:id/leer` | Sí | Marca una notificación como leída |
| PATCH | `/notificaciones/leer-todas` | Sí | Marca todas las no leídas del usuario |
| GET | `/verificacion/:codigo` | **No** | Estado público de una certificación por `codigoVerificacion` exacto |

**Respuesta `GET /verificacion/:codigo` (200, certificado vigente):**

```json
{
  "data": {
    "estado": "VIGENTE",
    "cliente": "Distribuidora Sur S.A.",
    "sucursal": "Sucursal Cartago",
    "fechaEmision": "2026-01-15",
    "fechaVencimiento": "2027-01-15",
    "nombrePlantilla": "Inspección Ministerio de Salud 2026"
  }
}
```

**Respuesta `GET /verificacion/:codigo` (404, código inexistente):**

```json
{ "error": { "codigo": "certificado_no_encontrado", "mensaje": "No se encontró ninguna certificación con ese código." } }
```

Todos los errores siguen el envelope estándar: `{ error: { codigo, mensaje, detalles? } }`.

---

## Diseño de pantallas

### 1. Centro de notificaciones (dropdown en el header)

```
┌──────────────────────────────────────────────────────────┐
│  DoonFlow        [Buscar...]        🔔³   👤 Juan Pérez   │  ← header del dashboard
└──────────────────────────────────────────────────────────┘
                                        │
                                        ▼ (click en 🔔)
                          ┌───────────────────────────────────┐
                          │ Notificaciones      [Marcar todas] │
                          │ ─────────────────────────────────  │
                          │ ● Acción vencida: "Sustituir        │
                          │   extintor" — Sucursal Cartago      │
                          │   hace 2 horas                      │
                          │ ─────────────────────────────────  │
                          │ ● Certificación por vencer en 15    │
                          │   días — Sucursal Heredia            │
                          │   hace 1 día                         │
                          │ ─────────────────────────────────  │
                          │   Hallazgo crítico registrado —     │
                          │   Sucursal Alajuela  (leída, gris)  │
                          │ ─────────────────────────────────  │
                          │        Ver todas →                  │
                          └───────────────────────────────────┘
```

- Ícono `🔔` con badge `bg-red text-white` circular arriba a la derecha, solo si `noLeidas > 0`.
- Notificaciones no leídas: punto `●` `bg-primary` a la izquierda, fondo `bg-gray-1 dark:bg-dark-2`. Leídas: sin punto, `text-dark-4 dark:text-dark-6`.
- Click en un ítem: `PATCH /notificaciones/:id/leer` + navega según `referenciaTipo`.
- Contenedor: `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` (mismo token que el resto del sistema), `w-[360px] max-h-[420px] overflow-y-auto`.

### 2. Portal de verificación pública (`/verificar/[codigo]`)

**Fuera del grupo `(dashboard)`** — ruta hermana de `apps/web/src/app/auth/`, con su propio `layout.tsx` sin `<Sidebar>`/`<Header>` y sin guard de sesión (igual patrón que la pantalla de login: layout mínimo con logo).

```
┌─────────────────────────────────────────────────────────┐
│                      🌱 DoonFlow                          │
│                                                           │
│              ┌───────────────────────────┐               │
│              │                            │               │
│              │        ✔  VIGENTE          │  ← sello grande, verde
│              │                            │               │
│              │  Distribuidora Sur S.A.    │               │
│              │  Sucursal Cartago           │               │
│              │                            │               │
│              │  Emitida:    15/01/2026     │               │
│              │  Vence:      15/01/2027     │               │
│              │  Plantilla:  Inspección     │               │
│              │  Ministerio de Salud 2026   │               │
│              │                            │               │
│              └───────────────────────────┘               │
│                                                           │
│         Este documento no requiere sesión para           │
│         validarse. DoonFlow © 2026                        │
└─────────────────────────────────────────────────────────┘
```

- Sello `VIGENTE`: `bg-green-light/[0.08] text-green` con ícono check, borde `border-2 border-green`.
- Sello `VENCIDA`: `bg-gray-3 text-dark-5` con ícono reloj.
- Sello `No encontrada`: `bg-red-light/[0.08] text-red` con ícono alerta, sin datos de cliente/sucursal (solo el mensaje "No se encontró ninguna certificación con ese código.").
- Sin barra de navegación, sin enlaces a `/login` ni a ninguna otra ruta del sistema — pantalla autocontenida.
- `/verificar` (sin código): mismo layout, con un input + botón "Verificar" en lugar del sello.

> Pantallas 3 (panel ejecutivo), 4 (calendario de auditorías) y 5 (biblioteca de hallazgos frecuentes) viven en [[014-panel-calendario-biblioteca]].

---

## Job de notificaciones — decisión técnica

El spec deja explícitamente a `agente-backend` la elección entre cron y trigger de BD. Decisión tomada para este sprint:

- **Cron en la aplicación** (`node-cron`, `apps/api/src/shared/jobs/programador.ts`), no trigger de PostgreSQL, porque:
  1. El escalamiento (HU-7) necesita resolver el destinatario recorriendo `accion_correctiva → hallazgo → inspeccion → sucursal → cliente → usuario`, lógica más cómoda de mantener y testear como caso de uso de aplicación que como trigger SQL.
  2. Mantiene la lógica de negocio visible en el módulo `notificaciones` (`application/casos-uso/`) en vez de escondida en la BD, más fácil de auditar en PR.
  3. El **escaneo pesado** (recorrer todas las `accion_correctiva`/`inspeccion` para calcular umbrales) sí vive en los SP (T-275/T-276), respetando la convención de CLAUDE.md de que cálculos agregados/reportes pesados van en stored procedures — es un híbrido: SP para el escaneo masivo, caso de uso de aplicación para orquestar cuándo correr y qué SP invocar.
- Horario: diario a las `06:00 America/Costa_Rica` — antes del horario laboral típico, para que las notificaciones estén listas cuando el equipo empieza el día.
- El job no corre en `NODE_ENV=test` para no interferir con la suite de integración.
- Los eventos síncronos (`ACCION_ASIGNADA` al asignar, `HALLAZGO_CRITICO` al registrar un hallazgo crítico) **no** pasan por el cron: se disparan inline desde los casos de uso de 005 que ya existen, inyectando `NotificacionRepositoryPort` por constructor (mismo patrón de inyección de dependencias que el resto del proyecto).
- **Envío por correo**: el spec deja pendiente el proveedor (ver "Decisiones pendientes" del spec). Este sprint implementa `enviadaPorCorreo: false` por defecto y dispara el envío únicamente si existe una variable de entorno `EMAIL_PROVIDER_CONFIGURADO=true`, dejando el hook de envío como una función `enviarCorreoNotificacion()` que hoy es un no-op documentado (`// pendiente: proveedor de correo, ver spec.md → Decisiones pendientes`) — así la cola de notificaciones in-app funciona de inmediato sin bloquear el sprint por una decisión de infraestructura externa.

---

## Portal público — decisiones de seguridad

- El router de `verificacion` **no** usa el middleware `autenticar`. Si `apps/api` tiene un middleware de autenticación global (aplicado a nivel de `app.use()` antes de los routers de módulo), este router debe montarse antes de ese middleware o quedar explícitamente excluido — confirmar con `agente-arquitecto` cómo está estructurado el middleware global antes de implementar (T-294).
- Rate limiting específico (`express-rate-limit`, ej. 20 req/min por IP) solo en `/verificacion/:codigo`, para mitigar enumeración de códigos por fuerza bruta, ya que es la única ruta pública sin JWT de toda la API.
- El repositorio de verificación proyecta explícitamente los campos públicos (`estado calculado`, `cliente`, `sucursal`, `fechaEmision`, `fechaVencimiento`, `nombrePlantilla`) — nunca hace `select *` ni retorna el objeto `Inspeccion` completo, para que un cambio futuro en el modelo de `Inspeccion` no filtre datos nuevos al portal público por accidente.
- El Route Handler proxy de Next.js (`apps/web/src/app/api/verificacion/[codigo]/route.ts`) existe para que el navegador nunca necesite conocer la URL interna del backend (`API_URL`), igual razón que el resto de proxies del proyecto — no porque el portal necesite sesión.

---

## Tokens de diseño DoonFlow usados (resumen)

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de tarjetas/paneles | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Badge Vigente / éxito | `bg-green-light/[0.08] text-green` |
| Badge Vencida / Inactivo | `bg-gray-3 text-dark-5` |
| Badge crítico / vencido | `bg-red-light/[0.08] text-red` |
| Badge por vencer | `bg-yellow-light/[0.08] text-yellow-dark` |
| Skeleton | `h-10 animate-pulse rounded bg-gray-2 dark:bg-dark-3` |
| Dropdown / overlay | `bg-dark/40` overlay, contenedor con `shadow-card` |

No se introducen tokens de color nuevos — todos ya existen en el preset de `packages/config/tailwind/` desde sprints anteriores (`primary`, `green`, `red`, `yellow`, `blue`, `gray`).

---

## Arquitectura hexagonal — módulos nuevos

```
domain/        → entidades + reglas puras (debeEscalar) + puertos + errores
application/   → casos de uso + schemas Zod — sin Express ni Prisma
infrastructure/→ *PrismaRepository (incluye el único punto de invocación de los SP vía $executeRaw) + Controller + Router
```

- Mismo patrón factory que `clientes`/`inspeccion`:
  ```typescript
  export function crearModuloNotificaciones(prisma: PrismaClient, autenticar: Middleware) {
    const repo = new NotificacionPrismaRepository(prisma);
    const ucGestionar = new GestionarNotificacionesUseCase(repo);
    const ucGenerar = new GenerarNotificacionesVencimientoUseCase(repo);
    const ucEscalar = new EscalarAccionesVencidasUseCase(repo);
    const ctrl = new NotificacionController(ucGestionar);
    const router = crearNotificacionesRouter(ctrl, autenticar);
    return { router, ucGenerar, ucEscalar }; // ucGenerar/ucEscalar se exponen para que el programador (shared/jobs) los invoke
  }
  ```
- `crearModuloVerificacion(prisma)` **no** recibe `autenticar` — es la única factory de módulo del proyecto sin ese parámetro, documentar el porqué en el propio archivo (`// Portal público sin autenticación, ver spec 006 → regla de negocio 2`).

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita ajustar un contrato de respuesta, lo solicita en `memoria/sprint/` al módulo correspondiente, igual que en sprints anteriores.
- El `empresaId` viene siempre del JWT en las rutas autenticadas; en `/verificacion/:codigo` no hay `empresaId` de sesión porque no hay sesión — el aislamiento ahí lo da el propio `codigoVerificacion`, único a nivel global (regla 3 de 005).
- Ninguna entidad de este sprint se elimina físicamente (`Notificacion` no tiene ni siquiera endpoint de borrado).
- El módulo `certificacion` de 005 se **modifica** (no se recrea) para dos cosas puntuales: disparar eventos síncronos hacia `NotificacionRepositoryPort` y agregar el QR al PDF. Cualquier otro cambio a ese módulo está fuera del alcance de este sprint.
- [[014-panel-calendario-biblioteca]] reutiliza el patrón hexagonal y de factory documentado aquí para sus propios módulos (`planificacion`, `hallazgos-frecuentes`).
