export type TipoDatoRetencion = "EVIDENCIA" | "PDF_CERTIFICACION" | "DATO_PERSONAL_CONTACTO";
export type AccionAlVencer = "ANONIMIZAR" | "ELIMINAR";

export interface PoliticaRetencion {
  id: string;
  empresaId: string;
  tipoDato: TipoDatoRetencion;
  mesesRetencion: number;
  accionAlVencer: AccionAlVencer;
  actualizadoEn: Date;
}

export const TIPOS_DATO_RETENCION: TipoDatoRetencion[] = ["EVIDENCIA", "PDF_CERTIFICACION", "DATO_PERSONAL_CONTACTO"];
