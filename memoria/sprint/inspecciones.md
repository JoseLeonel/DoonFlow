# Integraciones solicitadas a — Inspecciones

Módulo nuevo: RF-01 a RF-14. Plantillas dinámicas de inspección, ejecución, reinspecciones, reportes.
Dueños: `agente-frontend` (UI interactiva) + `agente-backend` (API hexagonal) + `agente-basededatos` (schema).

## Solicitudes pendientes de otros módulos

### [2026-06-16] Listado de usuarios/inspectores para asignar a una inspección
- Solicitado por: módulo inspecciones interno
- Necesita: endpoint `GET /auth/usuarios?rol=inspector` — listado de usuarios activos de la empresa con roles operario/auditor/productor
- Para qué: selector de inspector responsable en RF-08 (ejecución)
- Prioridad: alta
- Estado: pendiente → escalar a `agente-auth`

## Pendientes (interno del módulo)

- [ ] RF-01 Plantillas — CRUD + activar/desactivar
- [ ] RF-02 Apartados — CRUD inline + drag & drop orden
- [ ] RF-03 Subapartados — CRUD inline + drag & drop
- [ ] RF-04 Preguntas — CRUD inline, tipos de respuesta
- [ ] RF-05 Puntajes — configuración por modalidad
- [ ] RF-06 Reglas de comentario
- [ ] RF-07 Configuración de evidencias
- [ ] RF-08 Ejecución de inspección
- [ ] RF-09 Cálculo automático de puntajes
- [ ] RF-10 Rangos de resultado configurables
- [ ] RF-11 Reinspecciones
- [ ] RF-12 Historial/auditoría de cambios
- [ ] RF-13 Reportes (individual + consolidado)
- [ ] UI: árbol jerárquico con drag & drop + edición inline + vista previa + autoguardado

## En progreso

- [ ] Schema Prisma: 14+ tablas de inspección

## Resueltas

_Ninguna todavía._
