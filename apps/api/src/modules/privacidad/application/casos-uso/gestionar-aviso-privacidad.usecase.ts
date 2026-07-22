import type { TipoEntidadPrivacidad } from "../../domain/aviso-privacidad.entity";
import type { AvisoPrivacidadRepositoryPort, DatosRegistrarAvisoPrivacidad } from "../../domain/aviso-privacidad.repository.port";
import { EntidadPrivacidadNoEncontradaError } from "../../domain/aviso-privacidad.errors";
import type { ClienteRepositoryPort } from "../../../clientes/domain/cliente.repository.port";
import type { SucursalRepositoryPort } from "../../../sucursales/domain/sucursal.repository.port";

/**
 * `privacidad` es un módulo transversal (no conoce el dominio de `clientes`/`sucursales` en
 * profundidad) pero necesita confirmar que `entidadId` pertenece a la empresa del usuario
 * autenticado antes de registrar o listar — de lo contrario un usuario podría dejar constancia
 * de aviso de privacidad (o leer el historial) de un cliente/sucursal de otra empresa
 * adivinando el UUID. Se valida aquí en vez de en el controller para mantener la regla
 * "los controladores no contienen lógica de negocio".
 */
export class GestionarAvisoPrivacidadUseCase {
  constructor(
    private readonly repo: AvisoPrivacidadRepositoryPort,
    private readonly clienteRepo: ClienteRepositoryPort,
    private readonly sucursalRepo: SucursalRepositoryPort,
  ) {}

  async registrar(datos: DatosRegistrarAvisoPrivacidad) {
    await this.verificarPertenencia(datos.entidadTipo, datos.entidadId, datos.empresaId);
    return this.repo.registrar(datos);
  }

  async listarPorEntidad(entidadTipo: TipoEntidadPrivacidad, entidadId: string, empresaId: string) {
    await this.verificarPertenencia(entidadTipo, entidadId, empresaId);
    return this.repo.listarPorEntidad(entidadTipo, entidadId);
  }

  private async verificarPertenencia(entidadTipo: TipoEntidadPrivacidad, entidadId: string, empresaId: string) {
    const existe = entidadTipo === "CLIENTE"
      ? await this.clienteRepo.obtenerPorId(entidadId, empresaId)
      : await this.sucursalRepo.obtenerPorId(entidadId, empresaId);
    if (!existe) throw new EntidadPrivacidadNoEncontradaError(entidadTipo, entidadId);
  }
}
