# Especificación — 011-aceptacion-apelaciones-certificacion

> **⏸️ Sprint completo bloqueado (2026-07-16):** las 3 HU de este sprint dependen de que exista una certificación **firmada** (`estado = FIRMADA`, `resultadoFinal`) — HU-1 ocurre "después de que el auditor firma", HU-2/HU-3 apelan sobre `RECHAZADA`/`Hallazgo`. La firma digital quedó **pausada** en [[005-certificacion-plan-cumplimiento]] a pedido del usuario, y [[013-hallazgos-plan-cumplimiento]] (de donde viene `Hallazgo`) depende a su vez de que 005 se retome. Este sprint queda documentado para no perder el diseño, pero no se puede implementar hasta que esa cadena de dependencias se resuelva. El wizard de captura de respuestas (sin firma) ya es funcional en [[015-wizard-certificacion]], independiente de este bloqueo.

## Historias de usuario

> **HU-1.** Como **administrador de cliente o usuario de sucursal**, quiero revisar y aceptar formalmente el resultado de una certificación después de que el auditor la firma, para que quede constancia de que fui notificado y estoy de acuerdo (o no) antes de considerarla definitiva.

> **HU-2.** Como **administrador de cliente o usuario de sucursal**, quiero presentar una apelación sobre un hallazgo puntual o sobre el resultado `RECHAZADA` de una certificación, para pedir una revisión antes de aceptarlo como definitivo.

> **HU-3.** Como **auditor o administrador general**, quiero resolver una apelación (aceptándola total o parcialmente, o rechazándola) con una justificación registrada, para dejar un cierre formal del proceso de disputa.

---

## Contexto

- [[005-certificacion-plan-cumplimiento]] modela la firma del **auditor/usuario que ejecuta** la certificación (`firmadoPorId`), pero no un paso donde el **cliente** reconozca el resultado, ni un mecanismo para objetarlo.
- En esquemas de certificación reales (ISO, HACCP, Ministerio de Salud) el organismo certificador debe ofrecer un canal de apelación — sin esto, un resultado `RECHAZADA` ([[005-certificacion-plan-cumplimiento]]) es una decisión unilateral sin contrapeso, lo cual es un riesgo tanto operativo como de credibilidad del sistema.
- Depende de [[007-gobernanza-permisos-aprobacion]] para definir quién tiene el permiso de "resolver apelaciones" (no cualquier auditor).

---

## Alcance de este sprint

1. **Aceptación del cliente**: tras firmar una certificación, se notifica ([[006-vigencia-notificaciones-portal]]) al alcance correspondiente para que la reconozca. Es informativo — no bloquea el uso del certificado (ver Reglas de negocio).
2. **Apelación sobre un hallazgo o sobre el resultado final**: el cliente registra el motivo de la disputa dentro de un plazo desde la firma.
3. **Resolución de apelación**: aceptar (ajusta el hallazgo/resultado afectado) o rechazar (mantiene lo original), siempre con justificación escrita.

---

## Entidad Certificación — campos nuevos (sobre `Inspeccion` de [[005-certificacion-plan-cumplimiento]])

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `aceptadoPorClienteId` | UUID FK → `usuario(id)` | No | Quién de la parte cliente reconoció el resultado. |
| `aceptadoEn` | Timestamp | No | Null mientras no se acepta. |

## Entidad Apelacion (nueva)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID | — | |
| `inspeccionId` | UUID FK → `inspeccion(id)` | Sí | |
| `hallazgoId` | UUID FK → `hallazgo(id)` | No | Null si la apelación es sobre el resultado final completo, no sobre un hallazgo puntual. |
| `tipo` | Texto | Sí | `SOBRE_HALLAZGO` / `SOBRE_RESULTADO` |
| `motivo` | Texto | Sí | |
| `solicitadoPorId` | UUID FK → `usuario(id)` | Sí | |
| `solicitadoEn` | Timestamp | Auto | |
| `estado` | Texto | Sí | `ABIERTA` / `EN_REVISION` / `ACEPTADA` / `RECHAZADA` |
| `resueltoPorId` | UUID FK → `usuario(id)` | No | |
| `resueltoEn` | Timestamp | No | |
| `resolucionComentario` | Texto | No | Obligatorio al resolver (aceptar o rechazar). |
| `empresaId` | UUID | Sí | |

Un `Hallazgo` cuya apelación queda `ACEPTADA` no se borra — pasa a un estado `ANULADO_POR_APELACION` (campo `severidad`/estado del hallazgo, ajuste menor sobre [[005-certificacion-plan-cumplimiento]]), y si corresponde recalcula `resultadoFinal` de la certificación.

---

## Pantallas (alto nivel — a detallar por `agente-frontend` antes de implementar)

### 1. Aceptar certificación (vista del cliente)
- Tras la firma, aparece en su panel una tarjeta "Certificación pendiente de tu confirmación" con botón "Aceptar" y enlace a "Presentar apelación" en su lugar.

### 2. Presentar apelación
- Formulario simple: elegir si es sobre un hallazgo específico (selector) o sobre el resultado general, motivo (texto).
- Estado visible mientras está `ABIERTA`/`EN_REVISION`.

### 3. Resolver apelaciones (vista del auditor/administrador con permiso)
- Lista de apelaciones abiertas, ordenadas por antigüedad.
- Detalle: certificación, hallazgo (si aplica), motivo, botones Aceptar/Rechazar con campo de justificación obligatorio.

---

## Reglas de negocio

1. Solo se puede apelar dentro de un plazo desde `firmadoEn` (valor por defecto propuesto: 15 días, configurable) — pasado ese plazo, el resultado queda firme.
2. Una apelación `ACEPTADA` sobre un hallazgo lo marca `ANULADO_POR_APELACION` (no se borra) y recalcula `resultadoFinal` si corresponde, siguiendo la misma regla de severidad de [[005-certificacion-plan-cumplimiento]].
3. Una apelación no bloquea el plan de cumplimiento de los demás hallazgos no apelados — cada hallazgo es independiente.
4. Quien resuelve una apelación debe tener el permiso correspondiente y **no puede ser** quien firmó la certificación original (separación de funciones, misma lógica que [[007-gobernanza-permisos-aprobacion]]).
5. La falta de aceptación del cliente dentro del plazo **no bloquea** el uso del certificado — es un registro informativo, salvo que negocio decida lo contrario (ver Decisiones pendientes).
6. No se elimina físicamente ninguna apelación — es parte del historial de la certificación.

---

## Decisiones pendientes

- Plazo exacto para apelar (propuesto 15 días) — a validar con negocio.
- Si la falta de aceptación del cliente debe tener alguna consecuencia operativa (ej. bloquear el portal público de verificación) o queda puramente informativa.

---

## Fuera de alcance (este sprint)

- Mediación o arbitraje externo (tercero ajeno a DoonFlow).
- Apelaciones sobre certificaciones ya vencidas (`fechaVencimiento` pasada).
- Múltiples rondas de apelación sobre el mismo hallazgo (una apelación resuelta es definitiva).
