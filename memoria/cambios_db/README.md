# Cambios de base de datos — bitácora de `agente-basededatos`

Registro cronológico de **todo** cambio que `agente-basededatos` hace al esquema (tablas, columnas, índices, RLS, SP, seeds), aunque todavía no esté listo para producción. Se actualiza en `registro.md` cada vez que se crea o modifica una migración.

## Diferencia con `packages/db/produccion/`

- **`memoria/cambios_db/registro.md`** (esta carpeta): bitácora de trabajo — *todo* cambio, incluido el que todavía está en desarrollo o en staging sin validar.
- **`packages/db/produccion/CHANGELOG.md`**: solo el subconjunto de cambios ya **validados** y listos/aplicados en producción. Una entrada nace aquí y, cuando queda validada, se agrega también allá (no se mueve, queda registrada en ambos lugares con su propio estado).

## Formato de entrada en `registro.md`

```
## [fecha] Título corto del cambio
- Tipo: tabla nueva | columna | índice | RLS | SP | seed | otro
- Módulo: nombre del módulo de dominio (o "transversal")
- Detalle: qué cambió y por qué
- Migración/archivo: ruta relativa (ej. packages/db/prisma/migrations/2026...)
- Estado: en desarrollo | validado en staging | enviado a producción (ver packages/db/produccion/CHANGELOG.md)
```

Nunca se borra una entrada — si un cambio se revierte, se agrega una entrada nueva indicando la reversión y se referencia la original.
