import type { PlantillaRepositoryPort } from "../../domain/plantilla.repository.port";
import type { AuditoriaRepositoryPort } from "../../domain/auditoria.repository.port";
import {
  ComentarioResolucionRequeridoError,
  EstadoAprobacionInvalidoError,
  PlantillaNoEncontradaError,
  PlantillaSinPreguntasError,
  RangosInvalidosError,
} from "../../domain/inspeccion.errors";
import {
  debeRevertirABorrador,
  puedeAprobarse,
  puedeEnviarseARevision,
  validarRangos,
  contarPreguntas,
  type EstadoAprobacionPlantilla,
  type RangoResultado,
} from "../../domain/plantilla.entity";
import type { CrearPlantillaInput, ActualizarPlantillaInput, CrearNodoInput, ActualizarNodoInput } from "../plantilla.schema";

export class GestionarPlantillaUseCase {
  constructor(
    private readonly repo: PlantillaRepositoryPort,
    private readonly auditoria: AuditoriaRepositoryPort,
  ) {}

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

  async actualizar(id: string, empresaId: string, usuarioId: string, input: ActualizarPlantillaInput) {
    const existe = await this.repo.obtenerCompleta(id, empresaId);
    if (!existe) throw new PlantillaNoEncontradaError(id);
    const actualizada = await this.repo.actualizar(id, empresaId, {
      ...input,
      fechaVigencia: input.fechaVigencia ? new Date(input.fechaVigencia) : undefined,
    });
    if (!debeRevertirABorrador(existe.estadoAprobacion)) return actualizada;

    const revertida = await this.revertirABorrador(id, empresaId, usuarioId, existe.estadoAprobacion);
    return { ...actualizada, ...revertida };
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

  async actualizarNodo(plantillaId: string, nodoId: string, empresaId: string, usuarioId: string, input: ActualizarNodoInput) {
    // Si se intenta cambiar a PREGUNTA, el nodo no puede tener hijos
    if (input.tipo === "PREGUNTA") {
      const tieneHijos = await this.repo.contarHijosNodo(nodoId, empresaId);
      if (tieneHijos > 0)
        throw new Error("No se puede cambiar a Pregunta: el nodo tiene subsecciones.");
    }
    const plantilla = await this.repo.obtenerCompleta(plantillaId, empresaId);
    if (!plantilla) throw new PlantillaNoEncontradaError(plantillaId);

    const resultado = await this.repo.actualizarNodo(nodoId, empresaId, input);
    if (debeRevertirABorrador(plantilla.estadoAprobacion)) {
      await this.revertirABorrador(plantillaId, empresaId, usuarioId, plantilla.estadoAprobacion);
    }
    return resultado;
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

  async guardarRangos(plantillaId: string, empresaId: string, rangos: Omit<RangoResultado, "id">[]) {
    const existe = await this.repo.obtenerCompleta(plantillaId, empresaId);
    if (!existe) throw new PlantillaNoEncontradaError(plantillaId);
    const err = validarRangos(rangos.map((r, i) => ({ ...r, id: String(i) })));
    if (err) throw new RangosInvalidosError(err);
    return this.repo.guardarRangos(plantillaId, empresaId, rangos);
  }

  // ── Aprobación (007-gobernanza-permisos-aprobacion) ────────────────────────

  async enviarARevision(id: string, empresaId: string, usuarioId: string) {
    const plantilla = await this.repo.obtenerCompleta(id, empresaId);
    if (!plantilla) throw new PlantillaNoEncontradaError(id);

    const totalPreguntas = contarPreguntas(plantilla.nodos);
    if (totalPreguntas === 0) throw new PlantillaSinPreguntasError();
    if (!puedeEnviarseARevision(plantilla, totalPreguntas)) throw new EstadoAprobacionInvalidoError();

    const actualizada = await this.repo.cambiarEstadoAprobacion(id, empresaId, {
      estadoAprobacion: "EN_REVISION", solicitadoPorId: usuarioId, solicitadoEn: new Date(),
    });
    await this.registrarAuditoria(id, usuarioId, "ENVIAR_REVISION", plantilla.estadoAprobacion, "EN_REVISION");
    return actualizada;
  }

  async aprobar(id: string, empresaId: string, usuarioId: string) {
    const plantilla = await this.repo.obtenerCompleta(id, empresaId);
    if (!plantilla) throw new PlantillaNoEncontradaError(id);
    if (!puedeAprobarse(plantilla)) throw new EstadoAprobacionInvalidoError();

    const actualizada = await this.repo.cambiarEstadoAprobacion(id, empresaId, {
      estadoAprobacion: "APROBADA", aprobadorId: usuarioId, resueltoEn: new Date(),
    });
    await this.registrarAuditoria(id, usuarioId, "APROBAR", plantilla.estadoAprobacion, "APROBADA");
    return actualizada;
  }

  async rechazar(id: string, empresaId: string, usuarioId: string, comentario: string) {
    const plantilla = await this.repo.obtenerCompleta(id, empresaId);
    if (!plantilla) throw new PlantillaNoEncontradaError(id);
    if (plantilla.estadoAprobacion !== "EN_REVISION") throw new EstadoAprobacionInvalidoError();
    if (!comentario?.trim()) throw new ComentarioResolucionRequeridoError();

    const actualizada = await this.repo.cambiarEstadoAprobacion(id, empresaId, {
      estadoAprobacion: "RECHAZADA", aprobadorId: usuarioId, resueltoEn: new Date(), comentarioResolucion: comentario,
    });
    await this.registrarAuditoria(id, usuarioId, "RECHAZAR", plantilla.estadoAprobacion, "RECHAZADA", { comentarioResolucion: comentario });
    return actualizada;
  }

  async listarPendientesAprobacion(empresaId: string, pagina = 1, porPagina = 20) {
    return this.repo.listarPendientesAprobacion(empresaId, pagina, porPagina);
  }

  private async revertirABorrador(id: string, empresaId: string, usuarioId: string, estadoAntes: EstadoAprobacionPlantilla) {
    const revertida = await this.repo.cambiarEstadoAprobacion(id, empresaId, {
      estadoAprobacion: "BORRADOR",
      solicitadoPorId: null, solicitadoEn: null, aprobadorId: null, resueltoEn: null, comentarioResolucion: null,
    });
    await this.registrarAuditoria(id, usuarioId, "EDITAR_REVIERTE_BORRADOR", estadoAntes, "BORRADOR");
    return revertida;
  }

  private async registrarAuditoria(
    plantillaId: string,
    usuarioId: string,
    accion: string,
    estadoAntes: EstadoAprobacionPlantilla,
    estadoDespues: EstadoAprobacionPlantilla,
    extraDespues?: Record<string, unknown>,
  ) {
    await this.auditoria.registrar({
      plantillaId, usuarioId, tabla: "inspeccion_plantilla", registroId: plantillaId, accion,
      valorAntes: { estadoAprobacion: estadoAntes },
      valorDespues: { estadoAprobacion: estadoDespues, ...extraDespues },
    });
  }
}
