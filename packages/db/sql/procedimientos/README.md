# Procedimientos almacenados (SP)

Lógica de base de datos crítica/transaccional de DoonFlow, implementada como stored procedures de PostgreSQL.

- Nombrado: `sp_[entidad]_[accion].sql` (ej. `sp_inventario_registrar_movimiento.sql`), `snake_case`.
- Cada SP se versiona junto a la migración de Prisma que lo crea (`migrate dev --create-only`, editando el SQL generado).
- Se invocan únicamente desde la capa `infrastructure/` de cada módulo (`$queryRaw`/`$executeRaw` de Prisma) — nunca desde `application/` ni `domain/`.
- Dueño: `agente-basededatos`. Ver convenciones completas en `CLAUDE.md` → "Base de datos" → "Procedimientos almacenados (SP)".
