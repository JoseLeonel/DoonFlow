# Política de backup y recuperación — DoonFlow

> 010-seguridad-privacidad-continuidad, HU-4. Documento operativo de `agente-produccion` — no es una pantalla de la aplicación.
> **Estado: provisional.** El proveedor de hosting de `apps/api` sigue sin definir (ver `CLAUDE.md` → "Despliegue": "proveedor pendiente: Railway/Render/Fly.io"). Esta política asume Supabase como base de datos de producción (ya es la decisión de `CLAUDE.md` → "Base de datos") y se revisa en cuanto se elija el hosting de `apps/api`, si ese proveedor agrega su propio mecanismo de backup de infraestructura (no de BD).

---

## Decisión: backup nativo de Supabase (sin mecanismo adicional por ahora)

**Contexto:** el spec de este sprint dejaba como "Decisión pendiente" elegir entre el backup nativo de Supabase y un mecanismo adicional (ej. `pg_dump` programado a almacenamiento externo).

**Decisión:** usar el backup automático de Supabase (Point-in-Time Recovery en planes Pro+, backups diarios en plan Free/Pro) como mecanismo primario, sin duplicar infraestructura de backup propia en este sprint. Razón: DoonFlow todavía no tiene ambiente de producción real (`CLAUDE.md` confirma que el hosting de `apps/api` sigue sin decidir) — construir un pipeline de backup adicional antes de tener producción sería trabajo especulativo. Se revisita esta decisión cuando exista tráfico real y se conozca el plan de Supabase contratado.

**Consecuencias:** el RPO/RTO declarados abajo dependen directamente del plan de Supabase que se contrate en producción — deben confirmarse contra la documentación de Supabase vigente al momento de contratar, no asumirse fijos indefinidamente.

---

## Frecuencia y retención de respaldos

| Plan Supabase | Frecuencia de backup | Retención | Point-in-Time Recovery |
|---|---|---|---|
| Free | Diario | 7 días | No disponible |
| Pro (mínimo recomendado para producción) | Diario | 7 días (configurable hasta 30 en add-on) | Disponible como add-on (recuperación a cualquier punto en una ventana configurable) |

**Recomendación para producción de DoonFlow:** plan Pro + add-on de PITR. Confirmar con negocio antes de contratar (costo recurrente, fuera del alcance técnico de este documento).

---

## RPO y RTO objetivo

| Métrica | Objetivo | Justificación |
|---|---|---|
| **RPO** (Recovery Point Objective — cuánta pérdida de datos es aceptable) | **24 horas** sin PITR contratado / **5 minutos** con PITR contratado | DoonFlow certifica cumplimiento BPM — perder un día de trabajo de certificación es tolerable operativamente (se puede re-certificar) pero no deseable; con PITR el objetivo baja a minutos porque Supabase lo soporta sin costo operativo adicional de DoonFlow. |
| **RTO** (Recovery Time Objective — cuánto tiempo tolerable para restaurar) | **4 horas** hábiles | No es una plataforma de tiempo real (a diferencia de un sistema de pagos); una ventana de 4 horas para restaurar desde el backup de Supabase (proceso mayormente manual vía dashboard/CLI) es razonable para el perfil de uso actual (certificación programada, no transaccional en vivo). |

Estos valores son la primera declaración formal (no existían antes de este sprint) — quedan sujetos a ajuste cuando negocio defina un SLA formal con clientes del sector agroalimentario.

---

## Prueba de restauración periódica

- **Periodicidad:** trimestral (cada 3 meses), a partir de que exista un ambiente de producción real. No aplica todavía porque no hay producción (ver estado provisional arriba) — la primera prueba se agenda para el trimestre siguiente al primer despliegue a producción.
- **Ambiente:** nunca se restaura sobre producción. Se restaura un backup reciente en un proyecto Supabase de staging/pruebas, aislado del proyecto de producción.
- **Pasos:**
  1. Tomar el backup automático más reciente disponible en el dashboard de Supabase (producción).
  2. Restaurarlo en un proyecto Supabase nuevo o de staging dedicado (nunca en el proyecto de producción).
  3. Correr `pnpm --filter db exec prisma migrate status` contra la BD restaurada para confirmar que el historial de migraciones coincide con lo esperado.
  4. Verificar manualmente 3-5 registros críticos conocidos (ej. una certificación firmada reciente, un usuario administrador) para confirmar integridad de datos, no solo que la restauración "corrió sin error".
  5. Medir el tiempo total del proceso (pasos 1-4) y compararlo contra el RTO objetivo (4 horas).
- **Responsable:** `agente-produccion` (o la persona que ocupe ese rol operativo una vez haya equipo real).
- **Constancia del resultado:** se agrega una entrada nueva más abajo en este mismo documento (sección "Historial de pruebas de restauración"), con fecha, resultado (éxito/falla), tiempo medido, y hallazgos. Nunca se borra una entrada — el historial completo queda como evidencia de que la política se ejecuta, no solo se documenta.

---

## Historial de pruebas de restauración

_Sin pruebas realizadas todavía — no existe ambiente de producción (ver estado provisional al inicio de este documento). Primera entrada pendiente de agregar cuando se ejecute la primera prueba trimestral post-despliegue._

<!-- Agregar entradas nuevas arriba de esta línea, formato:
## [fecha] Prueba de restauración trimestral
- Resultado: éxito | falla
- Tiempo medido: Xh Ym (objetivo: 4h)
- Hallazgos: ...
-->

---

## Variables de entorno relacionadas

Ver `.env.example` (raíz del monorepo) para las variables nuevas de este sprint:
- `JWT_EXPIRES_IN` — expiración de sesión (documentado también en `memoria/decisiones.md`, entrada 2026-07-21).
- `RETENCION_JOB_CRON` — cron del job de purgado por política de retención (`apps/api/src/modules/retencion/infrastructure/job-purgar-retencion.job.ts`).

Estas variables se gestionan en GitHub Actions Secrets / variables del proveedor de hosting una vez que exista un ambiente de producción real — nunca con valores reales en este repositorio (ver `CLAUDE.md` → "Variables de entorno").
