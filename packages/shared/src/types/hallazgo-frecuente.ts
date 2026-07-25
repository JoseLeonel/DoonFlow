export type SeveridadSugerida = "CRITICA" | "MAYOR" | "MENOR";

export interface HallazgoFrecuente {
  id: string;
  descripcionHallazgo: string;
  severidadSugerida: SeveridadSugerida;
  descripcionAccionSugerida: string | null;
  activo: boolean;
  empresaId: string;
  creadoEn: string;
  actualizadoEn: string;
}
