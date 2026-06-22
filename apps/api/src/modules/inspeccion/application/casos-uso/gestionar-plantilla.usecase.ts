import type { PlantillaRepositoryPort } from "../../domain/plantilla.repository.port";
import { PlantillaNoEncontradaError, RangosInvalidosError } from "../../domain/inspeccion.errors";
import { validarRangos, contarPreguntas, type RangoResultado } from "../../domain/plantilla.entity";
import type { CrearPlantillaInput, ActualizarPlantillaInput, CrearNodoInput, ActualizarNodoInput } from "../plantilla.schema";

export class GestionarPlantillaUseCase {
  constructor(private readonly repo: PlantillaRepositoryPort) {}

  async listar(empresaId: string, activa?: boolean, tipo?: string, pagina = 1, porPagina = 20) {
    return this.repo.listar({ empresaId, activa, tipo, pagina, porPagina });
  }

  async obtenerCompleta(id: string, empresaId: string) {
    const p = await this.repo.obtenerCompleta(id, empresaId);
    if (!p) throw new PlantillaNoEncontradaError(id);
    return p;
  }

  async crear(empresaId: string, usuarioId: string, input: CrearPlantillaInput) {
    return this.repo.crear({
      empresaId, nombre: input.nombre, descripcion: input.descripcion,
      tipo: input.tipo, activa: true, puntajeMaximo: input.puntajeMaximo,
      fechaVigencia: input.fechaVigencia ? new Date(input.fechaVigencia) : undefined,
      observaciones: input.observaciones, creadoPorId: usuarioId,
    });
  }

  async actualizar(id: string, empresaId: string, input: ActualizarPlantillaInput) {
    const existe = await this.repo.obtenerCompleta(id, empresaId);
    if (!existe) throw new PlantillaNoEncontradaError(id);
    return this.repo.actualizar(id, empresaId, {
      ...input,
      fechaVigencia: input.fechaVigencia ? new Date(input.fechaVigencia) : undefined,
    });
  }

  async activar  (id: string, empresaId: string, usuarioId: string) { return this.repo.cambiarEstado(id, empresaId, true,  usuarioId); }
  async desactivar(id: string, empresaId: string, usuarioId: string) { return this.repo.cambiarEstado(id, empresaId, false, usuarioId); }

  async eliminar(id: string, empresaId: string) {
    const existe = await this.repo.obtenerCompleta(id, empresaId);
    if (!existe) throw new PlantillaNoEncontradaError(id);
    return this.repo.eliminar(id, empresaId);
  }

  async clonar(id: string, empresaId: string, nuevoNombre: string, usuarioId: string) {
    const existe = await this.repo.obtenerCompleta(id, empresaId);
    if (!existe) throw new PlantillaNoEncontradaError(id);
    return this.repo.clonar(id, empresaId, nuevoNombre, usuarioId);
  }

  // ── Nodos genéricos (RF-02, RF-03, RF-04) ──────────────────────────────────

  async crearNodo(plantillaId: string, empresaId: string, input: CrearNodoInput) {
    const plantilla = await this.repo.obtenerCompleta(plantillaId, empresaId);
    if (!plantilla) throw new PlantillaNoEncontradaError(plantillaId);
    // Calcular nivel: si tiene padre, nivel = padre.nivel + 1; si no, nivel = 0
    let nivel = 0;
    if (input.padreId) {
      const buscarNivel = (nodos: typeof plantilla.nodos): number => {
        for (const n of nodos) {
          if (n.id === input.padreId) return n.nivel + 1;
          const sub = buscarNivel(n.hijos);
          if (sub >= 0) return sub;
        }
        return -1;
      };
      nivel = buscarNivel(plantilla.nodos);
      if (nivel < 0) nivel = 0;
    }
    return this.repo.crearNodo({ ...input, plantillaId, empresaId, nivel });
  }

  async actualizarNodo(nodoId: string, empresaId: string, input: ActualizarNodoInput) {
    return this.repo.actualizarNodo(nodoId, empresaId, input);
  }

  async eliminarNodo(nodoId: string, empresaId: string) {
    return this.repo.eliminarNodo(nodoId, empresaId);
  }

  async reordenarNodos(items: { id: string; orden: number }[]) {
    return this.repo.reordenarNodos(items);
  }

  async validarRangos(rangos: RangoResultado[]) {
    const err = validarRangos(rangos);
    if (err) throw new RangosInvalidosError(err);
  }
}
