# Especificación — 002-crud-clientes

## Historia de usuario

> Como **administrador**, quiero poder agregar y gestionar clientes en el módulo de Mantenimientos, para registrar los datos de contacto y la empresa de cada cliente y tenerlos disponibles para futuras asociaciones con pedidos y trazabilidad.

---

## Alcance de este sprint

Este sprint cubre el **CRUD de clientes**: listar, agregar y modificar. No se elimina físicamente — solo se activa/desactiva. La asociación de clientes a pedidos o trazabilidad queda fuera de este sprint.

El módulo vive bajo **Mantenimientos** (`/mantenimientos/clientes`).

---

## Entidad Cliente

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `nombreResponsable` | Texto (200) | Sí | Nombre completo de la persona responsable o de contacto |
| `empresa` | Texto (200) | Sí | Nombre de la empresa cliente |
| `identificacionEmpresa` | Texto (50) | No | RUC, cédula jurídica u otro identificador fiscal |
| `correo1` | Email (150) | Sí | Correo electrónico principal |
| `correo2` | Email (150) | No | Correo electrónico secundario |
| `correo3` | Email (150) | No | Correo electrónico terciario |
| `direccion` | Texto (300) | No | Dirección física o postal de la empresa |
| `activo` | Boolean | Sí | `true` por defecto |
| `empresaId` | UUID | Sí | Del JWT — no aparece en el formulario |
| `creadoEn` | Timestamp | Auto | Gestionado por la BD |
| `actualizadoEn` | Timestamp | Auto | Gestionado por la BD |

---

## Pantallas

### 1. Lista de clientes (`/mantenimientos/clientes`)

Pantalla principal del módulo. Muestra todos los clientes registrados.

**Header de la pantalla:**
- Título: "Clientes"
- Subtítulo: "Personas de contacto y empresas registradas"
- Botón **"+ Agregar cliente"** alineado a la derecha → navega a la pantalla de nuevo cliente.

**Tabla de clientes:**
| Columna | Descripción |
|---|---|
| Empresa | Nombre de la empresa cliente |
| Responsable | Nombre completo de la persona de contacto |
| Identificación | Identificación fiscal (si existe) |
| Correo principal | `correo1` |
| Estado | Badge Activo (verde) / Inactivo (gris) |
| Acciones | Botón **Modificar** por fila |

- El botón **Modificar** lleva al formulario de edición del cliente.
- Estado de carga: skeleton de 5 filas con `animate-pulse`.
- Estado vacío: ilustración + "No hay clientes registrados" + botón "Agregar primer cliente".
- Sin paginación en este sprint (se implementa cuando supere 50 registros).

### 2. Agregar cliente (`/mantenimientos/clientes/nuevo`)

- Breadcrumb: `Mantenimientos > Clientes > Nuevo cliente`.
- Formulario con los campos de la entidad (ver sección Formulario más abajo).
- Al guardar correctamente → redirige a la lista.
- Botón "Cancelar" → vuelve a la lista sin guardar.

### 3. Modificar cliente (`/mantenimientos/clientes/[id]/editar`)

- Breadcrumb: `Mantenimientos > Clientes > [nombre de la empresa]`.
- Mismo formulario que pantalla 2, pre-cargado con los datos actuales.
- Badge de estado (Activo / Inactivo) visible en el encabezado.
- Al guardar → muestra mensaje de éxito inline y permanece en la misma pantalla.
- Botón "Cancelar" → vuelve a la lista.

---

## Formulario (compartido entre crear y editar)

```
┌─────────────────────────────────────────────────────┐
│  Nombre completo (persona responsable) *            │
│  [________________________________________________] │
│                                                     │
│  Empresa *                                          │
│  [________________________________________________] │
│                                                     │
│  Identificación empresa                             │
│  [________________________________________________] │
│                                                     │
│  Dirección                                          │
│  [________________________________________________] │
│  [________________________________________________] │
│                                                     │
│  ── Correos electrónicos ─────────────────────────  │
│  Correo 1 *   [____________________________________]│
│  Correo 2     [____________________________________]│
│  Correo 3     [____________________________________]│
│                                                     │
│  [Guardar]                          [Cancelar]      │
└─────────────────────────────────────────────────────┘
```

Los tres correos se muestran siempre (no son dinámicos). Correo 1 es obligatorio. Correo 2 y 3 son opcionales; si se ingresan, deben tener formato de email válido.

---

## Reglas de negocio

1. `nombreResponsable` y `empresa` son obligatorios.
2. `correo1` es obligatorio y debe tener formato de email válido.
3. `correo2` y `correo3`, si se ingresan, deben tener formato de email válido.
4. La `identificacionEmpresa` no es obligatoria, pero si se ingresa debe ser única dentro de la empresa (`empresaId`).
5. No se puede eliminar físicamente un cliente — solo desactivar.
6. Un cliente inactivo puede aparecer en registros históricos, pero no puede seleccionarse en formularios nuevos.
7. El `empresaId` viene siempre del JWT; nunca se incluye en el formulario.

---

## Navegación en el sidebar

- Sección: **CONFIGURACIÓN**
- Ítem: **Mantenimientos** → `/mantenimientos`
  - La página `/mantenimientos` muestra tarjetas de acceso a cada catálogo, incluyendo "Clientes".

---

## Fuera de alcance (este sprint)

- Eliminación física de clientes.
- Asociación de clientes a pedidos u órdenes de venta.
- Historial de compras por cliente.
- Importación masiva (CSV/Excel).
- Teléfono de contacto (se puede agregar en un sprint posterior).
- Paginación (activar cuando supere 50 registros).
