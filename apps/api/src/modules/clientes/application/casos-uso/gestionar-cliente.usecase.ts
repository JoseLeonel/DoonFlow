import { validarEmail } from "../../domain/cliente.entity";
import { ClienteNoEncontradoError, EmailInvalidoError, IdentificacionDuplicadaError } from "../../domain/cliente.errors";
import type { AlcanceConsulta, ClienteRepositoryPort } from "../../domain/cliente.repository.port";
import type { CrearClienteInput, ActualizarClienteInput } from "../cliente.schema";

export class GestionarClienteUseCase {
  constructor(private readonly repo: ClienteRepositoryPort) {}

  listar(empresaId: string, alcance?: AlcanceConsulta, paginacion?: { pagina?: number; porPagina?: number }) {
    return this.repo.listar(empresaId, alcance, {
      pagina: paginacion?.pagina ?? 1,
      porPagina: paginacion?.porPagina ?? 20,
    });
  }

  async obtenerPorId(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const cliente = await this.repo.obtenerPorId(id, empresaId, alcance);
    if (!cliente) throw new ClienteNoEncontradoError(id);
    return cliente;
  }

  async crear(empresaId: string, input: CrearClienteInput) {
    this.validarEmails(input);
    if (input.identificacionEmpresa) {
      const duplicado = await this.repo.existeIdentificacion(empresaId, input.identificacionEmpresa);
      if (duplicado) throw new IdentificacionDuplicadaError();
    }
    return this.repo.crear({ ...input, empresaId });
  }

  async actualizar(id: string, empresaId: string, input: ActualizarClienteInput) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new ClienteNoEncontradoError(id);
    this.validarEmails(input);
    if (input.identificacionEmpresa) {
      const duplicado = await this.repo.existeIdentificacion(empresaId, input.identificacionEmpresa, id);
      if (duplicado) throw new IdentificacionDuplicadaError();
    }
    return this.repo.actualizar(id, empresaId, input);
  }

  async activar(id: string, empresaId: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new ClienteNoEncontradoError(id);
    return this.repo.cambiarEstado(id, empresaId, true);
  }

  async desactivar(id: string, empresaId: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new ClienteNoEncontradoError(id);
    return this.repo.cambiarEstado(id, empresaId, false);
  }

  private validarEmails(input: { correo1?: string | null; correo2?: string | null; correo3?: string | null }) {
    if (input.correo1 !== undefined && input.correo1 && !validarEmail(input.correo1))
      throw new EmailInvalidoError("correo1");
    if (input.correo2 && !validarEmail(input.correo2))
      throw new EmailInvalidoError("correo2");
    if (input.correo3 && !validarEmail(input.correo3))
      throw new EmailInvalidoError("correo3");
  }
}
