import { puedeActualizarAvance, puedeVerificar } from "../../domain/accion-correctiva.entity";
import { construirRutaAlmacenamiento, tamanoArchivoValido, tipoArchivoPermitido } from "../../domain/evidencia.entity";
import {
  AccionCorrectivaNoEncontradaError,
  ArchivoNoPermitidoError,
  SinPermisoActualizarAvanceError,
  SinPermisoVerificacionError,
} from "../../domain/inspeccion.errors";
import type { AlcanceConsulta } from "../../domain/certificacion.repository.port";
import type { AccionCorrectivaConOrigen, AccionCorrectivaRepositoryPort } from "../../domain/accion-correctiva.repository.port";
import type { AlmacenamientoEvidenciasPort } from "../../domain/almacenamiento-evidencias.port";
import type { ActualizarAccionInput, ActualizarAvanceInput, VerificarAccionInput } from "../accion-correctiva.schema";
import type { CrearAccionInput } from "../plan-cumplimiento.schema";
import type { ArchivoSubido } from "./responder-certificacion.usecase";
import type { UsuarioAutenticado } from "./gestionar-plan-cumplimiento.usecase";

/**
 * Gestiona las acciones correctivas de un plan de cumplimiento: creación, edición, avance del
 * responsable, envío a revisión, verificación del auditor y evidencias.
 */
export class GestionarAccionCorrectivaUseCase {
  constructor(
    private readonly repo: AccionCorrectivaRepositoryPort,
    private readonly almacenamiento: AlmacenamientoEvidenciasPort,
  ) {}

  crear(planCumplimientoId: string, input: CrearAccionInput) {
    return this.repo.crear({
      planCumplimientoId,
      hallazgoId: input.hallazgoId,
      descripcion: input.descripcion,
      responsableId: input.responsableId,
      fechaLimite: input.fechaLimite,
    });
  }

  async actualizar(id: string, empresaId: string, input: ActualizarAccionInput) {
    await this.obtener(id, empresaId);
    return this.repo.actualizar(id, empresaId, input);
  }

  async actualizarAvance(
    id: string,
    empresaId: string,
    usuario: UsuarioAutenticado,
    alcance: AlcanceConsulta | undefined,
    input: ActualizarAvanceInput,
  ) {
    const accion = await this.obtener(id, empresaId);
    this.validarPermisoResponsable(accion, usuario, alcance);
    return this.repo.actualizarAvance(id, empresaId, input.porcentajeAvance);
  }

  async enviarARevision(id: string, empresaId: string, usuario: UsuarioAutenticado, alcance: AlcanceConsulta | undefined) {
    const accion = await this.obtener(id, empresaId);
    this.validarPermisoResponsable(accion, usuario, alcance);
    return this.repo.enviarARevision(id, empresaId);
  }

  async verificar(id: string, empresaId: string, usuario: UsuarioAutenticado, input: VerificarAccionInput) {
    if (!puedeVerificar(usuario)) throw new SinPermisoVerificacionError();
    await this.obtener(id, empresaId);

    return this.repo.verificar(id, empresaId, {
      resultado: input.resultado,
      comentario: input.comentario,
      verificadoPorId: usuario.id,
      nuevaFechaLimite: input.nuevaFechaLimite,
    });
  }

  async adjuntarEvidencia(
    id: string,
    empresaId: string,
    usuario: UsuarioAutenticado,
    alcance: AlcanceConsulta | undefined,
    archivo: ArchivoSubido,
    comentario?: string,
  ) {
    const accion = await this.obtener(id, empresaId);
    this.validarPermisoResponsable(accion, usuario, alcance);
    if (!tipoArchivoPermitido(archivo.mimetype) || !tamanoArchivoValido(archivo.size)) {
      throw new ArchivoNoPermitidoError();
    }

    const ruta = construirRutaAlmacenamiento(empresaId, accion.inspeccionId, id, archivo.originalname);
    const url = await this.almacenamiento.subirArchivo(ruta, archivo.buffer, archivo.mimetype);

    return this.repo.agregarEvidencia(id, {
      tipo: archivo.mimetype,
      url,
      nombre: archivo.originalname,
      comentario,
    });
  }

  private async obtener(id: string, empresaId: string): Promise<AccionCorrectivaConOrigen> {
    const accion = await this.repo.obtenerPorId(id, empresaId);
    if (!accion) throw new AccionCorrectivaNoEncontradaError(id);
    return accion;
  }

  /**
   * Un administrador general siempre tiene permiso; un `administrador_cliente` solo si su
   * `clienteId` coincide con el de la certificación de origen de la acción — mismo criterio
   * de alcance de 004-usuarios-roles-alcance, resuelto aquí porque requiere conocer el
   * `clienteId` de la acción (solo disponible tras leerla del repositorio).
   */
  private tienePermisoAdministrativo(accion: AccionCorrectivaConOrigen, usuario: UsuarioAutenticado, alcance?: AlcanceConsulta): boolean {
    if (usuario.rol === "administrador") return true;
    if (usuario.rol === "administrador_cliente" && alcance?.tipo === "CLIENTE") {
      return accion.clienteId === alcance.clienteId;
    }
    return false;
  }

  private validarPermisoResponsable(accion: AccionCorrectivaConOrigen, usuario: UsuarioAutenticado, alcance?: AlcanceConsulta): void {
    const esAdminConAlcance = this.tienePermisoAdministrativo(accion, usuario, alcance);
    if (!puedeActualizarAvance(accion, usuario.id, esAdminConAlcance)) {
      throw new SinPermisoActualizarAvanceError();
    }
  }
}
