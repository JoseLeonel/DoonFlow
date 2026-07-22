import type { DatosImportacionLote, ImportacionLote, TipoImportacion } from "./importacion-lote.entity";

export interface ImportacionLoteRepositoryPort {
  crear(empresaId: string, creadoPorId: string, datos: DatosImportacionLote): Promise<ImportacionLote>;
  listar(empresaId: string, tipo?: TipoImportacion): Promise<ImportacionLote[]>;
  obtenerPorId(id: string, empresaId: string): Promise<ImportacionLote | null>;
}
