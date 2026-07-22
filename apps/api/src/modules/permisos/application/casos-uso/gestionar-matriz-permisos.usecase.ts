import { esRolAdministrador, puedeEditarseDesdeMatriz } from "../../domain/rol-permiso.entity";
import { PermisoInvalidoError, RolNoEditableError, RolNoEncontradoError } from "../../domain/rol-permiso.errors";
import type { RolPermisoRepositoryPort } from "../../domain/rol-permiso.repository.port";
import type { RegistradorEventoAuditoria } from "../../../../shared/auditoria/registrar-evento-auditoria";

export interface ActorAuditoria {
  empresaId: string;
  usuarioId: string;
}

export class GestionarMatrizPermisosUseCase {
  constructor(
    private readonly repo: RolPermisoRepositoryPort,
    private readonly registrarEventoAuditoria?: RegistradorEventoAuditoria,
  ) {}

  /** Arma la matriz Rol×Permiso: cada rol lleva `editable` y sus `permisoIds` asignados (todos, si es administrador). */
  async obtenerMatriz() {
    const { roles, permisos, asignaciones } = await this.repo.obtenerMatriz();
    const todosLosIds = permisos.map((p) => p.id);

    return {
      permisos,
      roles: roles.map((rol) => ({
        ...rol,
        editable: puedeEditarseDesdeMatriz(rol),
        permisoIds: esRolAdministrador(rol)
          ? todosLosIds
          : asignaciones.filter((a) => a.rolId === rol.id).map((a) => a.permisoId),
      })),
    };
  }

  async asignarPermisos(rolId: string, permisoIds: string[], actor?: ActorAuditoria) {
    const rol = await this.repo.obtenerRolPorId(rolId);
    if (!rol) throw new RolNoEncontradoError(rolId);
    if (esRolAdministrador(rol)) throw new RolNoEditableError();

    if (permisoIds.length > 0) {
      const permisosEncontrados = await this.repo.listarPermisosPorIds(permisoIds);
      if (permisosEncontrados.length !== new Set(permisoIds).size) throw new PermisoInvalidoError();
    }

    await this.repo.asignarPermisos(rolId, permisoIds);

    if (this.registrarEventoAuditoria && actor) {
      await this.registrarEventoAuditoria({
        empresaId: actor.empresaId,
        usuarioId: actor.usuarioId,
        accion: "PERMISO_MODIFICADO",
        entidadTipo: "rol",
        entidadId: rolId,
        valorDespues: { permisoIds },
      });
    }
  }
}
