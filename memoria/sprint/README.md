# Sprint — Solicitudes de integración entre módulos

Esta carpeta sirve para que un agente de dominio **solicite formalmente** algo que necesita de otro módulo (datos, un endpoint, un evento, un componente transversal) antes de poder avanzar — en vez de implementarlo él mismo fuera de su alcance.

## Cómo usarla

1. El agente que necesita la integración abre el archivo del módulo **proveedor** (ej. si `agente-trazabilidad` necesita algo de inventario, edita `inventario.md`) y agrega una entrada con la plantilla de abajo.
2. El agente dueño del módulo proveedor (o `agente-arquitecto` si cruza más de dos módulos) revisa, prioriza y la mueve a "En progreso" / "Resuelta" según el formato de cada archivo.
3. Cuando la integración queda implementada y verificada, se mueve a "Resuelta" con fecha y referencia (PR, commit o caso de uso creado) — no se borra, queda como historial de qué se integró y cuándo.

## Plantilla de solicitud

```
### [fecha] Título corto de la solicitud
- Solicitado por: agente-x
- Necesita: qué dato/endpoint/evento/componente específico
- Para qué: caso de uso que lo requiere
- Prioridad: alta | media | baja
- Estado: pendiente | en progreso | resuelta (fecha + referencia)
```

## Archivos por módulo

- `fincas.md`
- `trazabilidad.md`
- `inventario.md`
- `analisis.md`
- `auth.md`

Cada uno lista las solicitudes donde ese módulo es el **proveedor** (el que recibe la solicitud), no el que la hace.
