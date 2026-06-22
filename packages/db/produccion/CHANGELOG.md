# Changelog de cambios de BD aplicados a producción

Historial de migraciones y procedimientos almacenados (SP) validados en desarrollo/staging y aplicados a producción. `agente-basededatos` agrega una entrada cuando un cambio queda validado; `agente-produccion` la marca como aplicada al desplegarla.

Formato de entrada:

```
## [fecha] módulo: nombre-migración-o-sp
- Tipo: migración | SP
- Archivo: ruta relativa al script
- Autor: agente/persona que validó el cambio
- Estado: pendiente | aplicado (fecha + ambiente)
```

---

<!-- Agregar entradas nuevas arriba de esta línea -->
