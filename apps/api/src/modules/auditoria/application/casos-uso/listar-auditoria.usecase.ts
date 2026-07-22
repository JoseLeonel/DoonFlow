import type { FiltrosAuditoria } from "../../domain/registro-auditoria.entity";
import type { RegistroAuditoriaRepositoryPort } from "../../domain/registro-auditoria.repository.port";

export class ListarAuditoriaUseCase {
  constructor(private readonly repo: RegistroAuditoriaRepositoryPort) {}

  listar(empresaId: string, filtros: FiltrosAuditoria, paginacion?: { pagina?: number; porPagina?: number }) {
    const pagina = paginacion?.pagina ?? 1;
    const porPagina = paginacion?.porPagina ?? 20;
    return this.repo.listar(empresaId, filtros, { pagina, porPagina });
  }
}
