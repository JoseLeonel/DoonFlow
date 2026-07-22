import bcrypt from "bcryptjs";
import type { RolSistema } from "@doonflow/shared";
import { requiereSucursalId, validarAlcancePorRol } from "../../domain/usuario.entity";
import { validarPoliticaPassword } from "../../domain/politica-password.entity";
import {
  AlcanceInvalidoError,
  EmailDuplicadoError,
  PasswordActualIncorrectaError,
  PasswordDebilError,
  SucursalRequeridaError,
  UsuarioNoEncontradoError,
} from "../../domain/auth.errors";
import type { RolRepositoryPort } from "../../domain/rol.repository.port";
import type { UsuarioRepositoryPort } from "../../domain/usuario.repository.port";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "../usuario.schema";
import type { RegistradorEventoAuditoria } from "../../../../shared/auditoria/registrar-evento-auditoria";

export class GestionarUsuarioUseCase {
  constructor(
    private readonly repo: UsuarioRepositoryPort,
    private readonly rolRepo: RolRepositoryPort,
    private readonly registrarEventoAuditoria?: RegistradorEventoAuditoria,
  ) {}

  listar(empresaId: string) {
    return this.repo.listar(empresaId);
  }

  listarRoles() {
    return this.rolRepo.listar();
  }

  async obtenerPorId(id: string, empresaId: string) {
    const usuario = await this.repo.obtenerPorId(id, empresaId);
    if (!usuario) throw new UsuarioNoEncontradoError(id);
    return usuario;
  }

  async crear(empresaId: string, input: CrearUsuarioInput) {
    const rol = await this.rolRepo.obtenerPorId(input.rolId);
    if (!rol) throw new AlcanceInvalidoError("El rol seleccionado no existe.");

    const clienteId = input.clienteId ?? null;
    const sucursalId = input.sucursalId ?? null;
    const sucursalesAdicionalesIds = input.sucursalesAdicionalesIds ?? [];

    this.validarAlcanceOLanzar(rol.nombre, clienteId, sucursalId, sucursalesAdicionalesIds);

    const duplicado = await this.repo.buscarPorEmail(input.email, empresaId);
    if (duplicado) throw new EmailDuplicadoError();

    if (input.password) {
      const mensaje = validarPoliticaPassword(input.password);
      if (mensaje) throw new PasswordDebilError(mensaje);
    }
    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;

    return this.repo.crear(
      { empresaId, nombre: input.nombre, email: input.email, passwordHash, rolId: input.rolId, clienteId, sucursalId },
      sucursalesAdicionalesIds,
    );
  }

  async actualizar(id: string, empresaId: string, input: ActualizarUsuarioInput) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new UsuarioNoEncontradoError(id);

    const rolId = input.rolId ?? existente.rolId;
    const rol = rolId === existente.rolId
      ? { id: existente.rolId, nombre: existente.rolNombre }
      : await this.rolRepo.obtenerPorId(rolId);
    if (!rol) throw new AlcanceInvalidoError("El rol seleccionado no existe.");

    const clienteId = input.clienteId !== undefined ? input.clienteId : existente.clienteId;
    const sucursalId = input.sucursalId !== undefined ? input.sucursalId : existente.sucursalId;
    const sucursalesAdicionalesIds = input.sucursalesAdicionalesIds !== undefined
      ? input.sucursalesAdicionalesIds
      : await this.repo.obtenerSucursalesAdicionales(id);

    this.validarAlcanceOLanzar(rol.nombre, clienteId, sucursalId, sucursalesAdicionalesIds);

    if (input.email && input.email !== existente.email) {
      const duplicado = await this.repo.buscarPorEmail(input.email, empresaId);
      if (duplicado) throw new EmailDuplicadoError();
    }

    return this.repo.actualizar(
      id,
      empresaId,
      { nombre: input.nombre, email: input.email, rolId: input.rolId, clienteId: input.clienteId, sucursalId: input.sucursalId },
      input.sucursalesAdicionalesIds,
    );
  }

  async activar(id: string, empresaId: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new UsuarioNoEncontradoError(id);
    return this.repo.cambiarEstado(id, empresaId, true);
  }

  async desactivar(id: string, empresaId: string, actorId?: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new UsuarioNoEncontradoError(id);
    const resultado = await this.repo.cambiarEstado(id, empresaId, false);

    if (this.registrarEventoAuditoria && actorId) {
      await this.registrarEventoAuditoria({
        empresaId, usuarioId: actorId, accion: "USUARIO_DESACTIVADO", entidadTipo: "usuario", entidadId: id,
      });
    }
    return resultado;
  }

  /** `passwordActual` se valida siempre en el backend (regla de negocio 3, 010-seguridad-privacidad-continuidad). */
  async cambiarPassword(id: string, empresaId: string, passwordActual: string, passwordNueva: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new UsuarioNoEncontradoError(id);

    const hashActual = await this.repo.obtenerPasswordHash(id, empresaId);
    if (!hashActual || !(await bcrypt.compare(passwordActual, hashActual))) {
      throw new PasswordActualIncorrectaError();
    }

    const mensaje = validarPoliticaPassword(passwordNueva);
    if (mensaje) throw new PasswordDebilError(mensaje);

    const nuevoHash = await bcrypt.hash(passwordNueva, 12);
    await this.repo.actualizarPasswordHash(id, empresaId, nuevoHash);
  }

  private validarAlcanceOLanzar(
    rolNombre: RolSistema,
    clienteId: string | null,
    sucursalId: string | null,
    sucursalesAdicionalesIds: string[],
  ) {
    const mensaje = validarAlcancePorRol({ rol: rolNombre, clienteId, sucursalId });
    if (mensaje) throw new AlcanceInvalidoError(mensaje);

    if (requiereSucursalId(rolNombre) && !sucursalId && sucursalesAdicionalesIds.length === 0) {
      throw new SucursalRequeridaError();
    }
  }
}
