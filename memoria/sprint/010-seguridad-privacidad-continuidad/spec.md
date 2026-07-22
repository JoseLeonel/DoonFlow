# Especificación — 010-seguridad-privacidad-continuidad

## Historias de usuario

> **HU-1.** Como **usuario del sistema**, quiero que mi sesión expire tras un período de inactividad y que se me exija una contraseña segura, para reducir el riesgo de accesos no autorizados si pierdo o dejo desatendido mi dispositivo.

> **HU-2.** Como **administrador general**, quiero definir cuánto tiempo se conservan las evidencias y los datos personales antes de poder eliminarlos o anonimizarlos, para cumplir con la normativa de protección de datos aplicable.

> **HU-3.** Como **administrador general**, quiero que los listados con muchos registros (clientes, sucursales, certificaciones) carguen de forma rápida y paginada, para que el sistema siga siendo usable a medida que crecen los datos.

> **HU-4.** Como **responsable de operación**, quiero que exista una política de respaldo y recuperación documentada y probada, para poder restaurar el sistema ante una falla sin perder información crítica.

> **HU-5.** Como **auditor interno**, quiero un registro histórico de las acciones críticas del sistema (quién firmó, aprobó, cerró o cambió permisos), para poder investigar incidentes o disputas después de que ocurrieron.

> **HU-6.** Como **administrador general**, quiero registrar la base legal/aviso de privacidad bajo el cual se tratan los datos personales de contacto de clientes y sucursales, para cumplir con la normativa de protección de datos aplicable aunque esos datos los ingrese un administrador y no la persona titular directamente.

---

## Contexto

Estos son **requisitos no funcionales** transversales — hoy dispersos o ausentes en `CLAUDE.md` (que define reglas técnicas puntuales como RLS multiempresa, pero no un listado formal de RNF equivalente al RF-01..RF-14 del módulo de inspecciones). Se formalizan aquí como historias de usuario para que tengan dueño y criterio de aceptación, aunque su implementación es mayormente técnica/operativa (`agente-backend`, `agente-basededatos`, `agente-produccion`) y no una pantalla de negocio.

`InspeccionAuditoria` (ya existente) es hoy el único registro de auditoría del sistema, y solo cubre cambios de configuración de plantillas. HU-5 generaliza ese patrón a todo el sistema.

---

## Alcance de este sprint

1. **Sesión y contraseña**: expiración de JWT configurable (con renovación vía re-login o refresh token — a decidir), política mínima de contraseña (longitud, complejidad) validada en el backend al crear/cambiar contraseña.
2. **Retención y borrado**: definir, por tipo de dato (evidencias, PDFs de certificación, datos personales de contacto), cuánto tiempo se conservan y el proceso de purgado/anonimización al vencer ese plazo.
3. **Paginación real (server-side)** en los listados que hoy no la tienen: Clientes ([[002-crud-clientes]]), Sucursales ([[003-sucursales-certificacion]]), Certificaciones ([[015-wizard-certificacion]]) — se activa el umbral que esos sprints ya habían dejado pendiente ("cuando supere 50 registros").
4. **Política de backup**: frecuencia, retención de respaldos, RPO/RTO objetivo, y una prueba periódica de restauración documentada. No es una pantalla — es un documento operativo a cargo de `agente-produccion`.
5. **`RegistroAuditoria`** (nueva entidad transversal): generaliza `InspeccionAuditoria` a acciones críticas de todo el sistema — login, firma de certificación, cierre de plan de cumplimiento, cambios de permisos (ver [[007-gobernanza-permisos-aprobacion]]), eliminación/desactivación lógica.

---

## Entidad RegistroAuditoria (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `empresaId` | UUID | Sí | |
| `usuarioId` | UUID FK → `usuario(id)` | Sí | Quién ejecutó la acción. |
| `accion` | Texto | Sí | Ej. `LOGIN`, `CERTIFICACION_FIRMADA`, `PLAN_CERRADO`, `PERMISO_MODIFICADO`, `USUARIO_DESACTIVADO`. |
| `entidadTipo` | Texto | Sí | Tabla/entidad afectada. |
| `entidadId` | UUID | Sí | |
| `valorAntes` | JSON | No | |
| `valorDespues` | JSON | No | |
| `ip` | Texto | No | |
| `creadoEn` | Timestamp | Auto | |

## Entidad PoliticaRetencion (nueva, configuración)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `tipoDato` | Texto | Sí | `EVIDENCIA` / `PDF_CERTIFICACION` / `DATO_PERSONAL_CONTACTO` |
| `mesesRetencion` | Int | Sí | |
| `accionAlVencer` | Texto | Sí | `ANONIMIZAR` / `ELIMINAR` |
| `empresaId` | UUID | Sí | |
| `actualizadoEn` | Timestamp | Auto | |

## Entidad AvisoPrivacidad (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `entidadTipo` | Texto | Sí | `CLIENTE` / `SUCURSAL` — a qué tipo de registro aplica. |
| `entidadId` | UUID | Sí | |
| `baseLegal` | Texto | Sí | Ej. "Interés legítimo — relación contractual de certificación", "Consentimiento explícito". |
| `registradoPorId` | UUID FK → `usuario(id)` | Sí | Administrador que lo dejó constancia (los datos los ingresa un tercero, no el titular). |
| `creadoEn` | Timestamp | Auto | |
| `empresaId` | UUID | Sí | |

Un registro simple de trazabilidad — no es un formulario de consentimiento firmado por el titular (eso implicaría un flujo de auto-registro fuera de alcance, ver Fuera de alcance), sino la constancia de bajo qué base legal la empresa tenant trata esos datos de contacto.

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Política de retención (Configuración)
- Formulario simple por tipo de dato: meses de retención + acción al vencer.

### 2. Registro de auditoría (Configuración → Auditoría, solo lectura)
- Tabla filtrable por usuario, acción, rango de fechas — sin edición ni eliminación posible desde la UI.

Las mejoras de sesión/contraseña, paginación y backup son principalmente técnicas y no requieren pantalla nueva más allá de los mensajes de validación estándar (ej. "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número").

---

## Reglas de negocio

1. `RegistroAuditoria` es **append-only**: ningún registro se edita ni se borra, ni siquiera por la política de retención.
2. La purga por retención nunca borra `RegistroAuditoria` — solo los datos operativos a los que aplica la política (evidencias, PDFs, datos de contacto).
3. Una contraseña débil se rechaza siempre en el backend, no solo con validación de frontend.
4. La sesión expirada obliga a reautenticar; no hay renovación silenciosa indefinida sin que el usuario vuelva a autenticarse en algún punto (frecuencia exacta a definir).
5. El filtrado de paginación server-side respeta siempre el alcance por cliente/sucursal ([[004-usuarios-roles-alcance]]) — no se pagina primero y se filtra después.

---

## Decisiones pendientes

- **Normativa exacta aplicable** (ej. Ley 8968 de Costa Rica) y plazos de retención concretos — requiere validación legal/negocio, no es una suposición técnica de este sprint.
- **Proveedor de backup**: nativo de Supabase vs. mecanismo adicional — decisión de `agente-produccion`, depende también del proveedor de hosting de `apps/api` (aún pendiente, ver `CLAUDE.md` → Despliegue).
- **Expiración de JWT y estrategia de renovación** (refresh token vs. re-login simple) — decisión de `agente-auth`/`agente-backend`.

---

## Fuera de alcance (este sprint)

- Cifrado a nivel de campo individual (más allá de TLS en tránsito y cifrado en reposo que ya ofrece Supabase).
- Autenticación de dos factores (2FA/MFA) — mejora futura, no incluida aquí.
- Certificación formal de cumplimiento normativo (auditoría externa de terceros).
