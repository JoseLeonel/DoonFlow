import { AccionAuditoriaInvalidaError } from "../../domain/registro-auditoria.errors";
import type { DatosRegistrarAuditoria } from "../../domain/registro-auditoria.entity";
import type { RegistroAuditoriaRepositoryPort } from "../../domain/registro-auditoria.repository.port";

export class RegistrarAuditoriaUseCase {
  constructor(private readonly repo: RegistroAuditoriaRepositoryPort) {}

  async registrar(datos: DatosRegistrarAuditoria) {
    if (!datos.accion?.trim() || !datos.entidadTipo?.trim()) {
      throw new AccionAuditoriaInvalidaError();
    }
    return this.repo.registrar(datos);
  }
}
