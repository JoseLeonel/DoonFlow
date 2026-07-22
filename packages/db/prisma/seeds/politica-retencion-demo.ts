import type { PrismaClient } from "@prisma/client";

const POLITICAS_DEMO = [
  { tipoDato: "EVIDENCIA", mesesRetencion: 24, accionAlVencer: "ANONIMIZAR" },
  { tipoDato: "PDF_CERTIFICACION", mesesRetencion: 60, accionAlVencer: "ANONIMIZAR" },
  { tipoDato: "DATO_PERSONAL_CONTACTO", mesesRetencion: 36, accionAlVencer: "ANONIMIZAR" },
];

/**
 * Siembra `PoliticaRetencion` de 010-seguridad-privacidad-continuidad para la empresa demo
 * (upsert por `(empresaId, tipoDato)`). Valores de ejemplo para desarrollo — no son la
 * política legal final (requiere validación legal/negocio, ver "Decisiones pendientes" del spec).
 */
export async function sembrarPoliticaRetencionDemo(prisma: PrismaClient, empresaId: string) {
  for (const politica of POLITICAS_DEMO) {
    await prisma.politicaRetencion.upsert({
      where: { empresaId_tipoDato: { empresaId, tipoDato: politica.tipoDato } },
      update: { mesesRetencion: politica.mesesRetencion, accionAlVencer: politica.accionAlVencer },
      create: { empresaId, ...politica },
    });
  }
  console.log("✓ Política de retención demo creada:", POLITICAS_DEMO.map((p) => p.tipoDato).join(", "));
}
