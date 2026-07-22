-- Políticas RLS multiempresa para las tablas del módulo Usuarios y Roles.
-- Aplicar después de `prisma migrate dev` (Prisma no gestiona RLS).
-- Ver CLAUDE.md → "Base de datos" → "Aislamiento multiempresa".

alter table usuario enable row level security;

create policy usuario_aislamiento_empresa on usuario
  using (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- rol y permiso son catálogos globales (no llevan empresa_id): lectura abierta a usuarios autenticados.
alter table rol enable row level security;
create policy rol_lectura_autenticados on rol
  for select using (auth.role() = 'authenticated');

alter table permiso enable row level security;
create policy permiso_lectura_autenticados on permiso
  for select using (auth.role() = 'authenticated');

-- TODO (sprint 004-usuarios-roles-alcance, 2026-07-17): el alcance por clienteId/sucursalId
-- (roles administrador_cliente / usuario_sucursal) hoy solo se valida en apps/api/src/modules/auth
-- ("application/", vía resolverAlcance + filtros en los repositorios de clientes/sucursales).
-- Estas policies de aquí cubren únicamente el aislamiento por empresa_id, no por cliente/sucursal.
-- Llevar ese alcance a RLS (policies sobre `cliente`/`sucursal` cruzando con `usuario.cliente_id`/
-- `usuario.sucursal_id`/`usuario_sucursal_acceso`) es una decisión futura de agente-basededatos,
-- no de este sprint.
