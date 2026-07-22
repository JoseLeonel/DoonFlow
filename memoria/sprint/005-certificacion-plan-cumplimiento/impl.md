# Guía de implementación — 005-certificacion-plan-cumplimiento (⏸️ PAUSADO)

> No implementar sin decisión explícita del usuario (pausado 2026-07-16). Queda como referencia técnica de diseño para cuando se retome la firma digital.

---

## Decisiones tomadas (referencia)

1. **Generación del PDF**: renderizado server-side con **Puppeteer** (HTML → PDF) en `infrastructure/pdf-certificacion.adapter.ts`, ejecutado de forma síncrona dentro de `firmar-certificacion.usecase.ts` inmediatamente después de que el SP confirma la firma. Se sube a Supabase Storage con la convención de ruta `certificaciones/{empresaId}/{inspeccionId}/certificado.pdf`. Se elige Puppeteer (no un servicio externo) para no introducir una dependencia de infraestructura nueva; si el volumen de firmas concurrentes lo justifica más adelante, mover la generación a un job asíncrono es una decisión de `agente-produccion`.
2. **`resultadoFinal` en la primera versión**: como no existiría todavía el concepto de `Hallazgo` (013 depende de este sprint), `sp_inspeccion_firmar` fijaría `resultado_final = 'APROBADA'` de forma incondicional al firmar. [[013-hallazgos-plan-cumplimiento]] reemplazaría el SP para calcular el valor real según severidad (regla 1.1).

---

## Stored procedure (referencia funcional, no el SQL final)

**`sp_inspeccion_firmar(p_inspeccion_id UUID, p_usuario_id UUID)`**
1. Bloquea la fila de `inspeccion` (`FOR UPDATE`).
2. Verifica `estado = 'EN_PROGRESO'`; si no, `RAISE EXCEPTION 'certificacion_no_editable'`.
3. Suma `puntaje_obtenido`/`puntaje_maximo` desde `inspeccion_detalle`, calcula `porcentaje_cumplimiento` (misma lógica que `calcularResumen()` de [[015-wizard-certificacion]], ahora en SQL para que sea atómico con la firma).
4. Busca en `inspeccion_rango_resultado` el rango que contiene el porcentaje → `clasificacion`.
5. Fija `resultado_final = 'APROBADA'` (valor único posible hasta que 013 lo reemplace).
6. Genera `codigo_verificacion` aleatorio (10 caracteres alfanuméricos mayúsculas), reintenta hasta 5 veces si colisiona.
7. Calcula `fecha_vencimiento = firmado_en + N meses` (N configurable, default 12).
8. `UPDATE inspeccion SET estado='FIRMADA', firmado_por_id=p_usuario_id, firmado_en=now(), ...`.
9. Retorna la fila actualizada.

> **013 reemplazaría los pasos 2 y 5**: entre el 2 y el 3 agrega la verificación de que no exista un `hallazgo` `CRITICA` sin `accion_correctiva` `CUMPLIDO`; el paso 5 calcula `resultado_final` según la regla 1.1 en vez de fijar un valor constante.

---

## Archivos a crear/ampliar (referencia)

```
packages/db/sql/procedimientos/sp_inspeccion_firmar.sql   ← CREAR

apps/api/src/modules/inspeccion/
├── domain/
│   ├── certificacion.entity.ts          ← AMPLIAR (archivo de 015): puedeFirmarse, generarCodigoVerificacion, calcularFechaVencimiento
│   ├── certificacion.repository.port.ts ← AMPLIAR (de 015): firmar, obtenerPorCodigoVerificacion
│   └── inspeccion.errors.ts             ← AMPLIAR (de 015): CodigoVerificacionEnColisionError
├── application/
│   ├── certificacion.schema.ts          ← AMPLIAR (de 015): firmarCertificacionSchema
│   └── casos-uso/
│       └── firmar-certificacion.usecase.ts ← CREAR
└── infrastructure/
    ├── certificacion.prisma-repository.ts  ← AMPLIAR (de 015): firmar()
    ├── certificacion.controller.ts         ← AMPLIAR (de 015): handlers firmar/pdf
    ├── inspeccion.router.ts                ← AMPLIAR (de 015): POST .../firmar, GET .../pdf
    └── pdf-certificacion.adapter.ts         ← CREAR

apps/web/src/app/api/inspeccion/certificaciones/[id]/
├── firmar/route.ts   ← CREAR
└── pdf/route.ts       ← CREAR

apps/web/.../certificaciones/
├── _hooks/usar-revision-certificacion.ts   ← AMPLIAR (de 015): acción firmar()
└── [id]/revision/page.tsx                  ← AMPLIAR (de 015): botón Firmar, código de verificación, descarga PDF
```

---

## Contrato de API (referencia)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/inspeccion/certificaciones/:id/firmar` | Firmar/certificar `{ comentarioFirma? }` → `{ codigoVerificacion, pdfUrl, resultadoFinal, estado }` |
| GET | `/inspeccion/certificaciones/:id/pdf` | Descarga/redirect al PDF |

**Response — firmar exitoso:**
```json
{
  "data": {
    "id": "uuid",
    "estado": "FIRMADA",
    "codigoVerificacion": "A1B2C3D4E5",
    "pdfUrl": "https://.../certificaciones/{empresaId}/{inspeccionId}/certificado.pdf",
    "resultadoFinal": "APROBADA",
    "fechaVencimiento": "2027-07-16",
    "firmadoPorId": "uuid",
    "firmadoEn": "2026-07-16T15:04:00.000Z"
  }
}
```

---

## Notas importantes

- **No implementar sin retomar esta decisión con el usuario primero.**
- Cuando se retome, revisar si [[015-wizard-certificacion]] cambió de forma incompatible con este diseño (nombres de archivo, contrato de API) antes de asumir que sigue vigente tal cual está aquí.
- [[013-hallazgos-plan-cumplimiento]] no puede empezar a implementarse hasta que este sprint se retome y se complete.
