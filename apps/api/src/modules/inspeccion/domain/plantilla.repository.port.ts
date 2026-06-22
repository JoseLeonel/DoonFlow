import type { Plantilla, PlantillaCompleta, NodoArbol } from "./plantilla.entity";

export interface FiltrosPlantilla {
  empresaId: string; activa?: boolean; tipo?: string; pagina?: number; porPagina?: number;
}
export interface ResultadoPaginado<T> {
  items: T[]; total: number; pagina: number; porPagina: number;
}

export interface DatosCrearNodo {
  plantillaId: string; empresaId: string; padreId?: string;
  tipo: "PANEL" | "PREGUNTA"; codigo: string; titulo: string; criterio?: string;
  orden: number; nivel: number;
  tipoRespuesta?: string; modalidadPuntaje?: string;
  puntajeMaximo?: number; reglaComentario?: string;
  evidenciaObligatoria?: boolean; evidenciaMinima?: number; evidenciaMaxima?: number;
}

export interface PlantillaRepositoryPort {
  listar(f: FiltrosPlantilla): Promise<ResultadoPaginado<Plantilla>>;
  obtenerCompleta(id: string, empresaId: string): Promise<PlantillaCompleta | null>;
  crear(datos: Omit<Plantilla, "id"|"version"|"creadoEn"|"actualizadoEn"> & { creadoPorId?: string }): Promise<Plantilla>;
  actualizar(id: string, empresaId: string, datos: Partial<Omit<Plantilla,"id"|"empresaId"|"version"|"creadoEn"|"actualizadoEn">>): Promise<Plantilla>;
  cambiarEstado(id: string, empresaId: string, activa: boolean, usuarioId: string): Promise<Plantilla>;
  eliminar(id: string, empresaId: string): Promise<void>;
  clonar(id: string, empresaId: string, nuevoNombre: string, usuarioId: string): Promise<PlantillaCompleta>;
  // Nodos genéricos
  crearNodo(datos: DatosCrearNodo): Promise<NodoArbol>;
  actualizarNodo(nodoId: string, empresaId: string, datos: Partial<Omit<DatosCrearNodo,"plantillaId"|"empresaId">>): Promise<NodoArbol>;
  eliminarNodo(nodoId: string, empresaId: string): Promise<void>;
  reordenarNodos(nodos: { id: string; orden: number }[]): Promise<void>;
}
