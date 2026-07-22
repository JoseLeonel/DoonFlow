import type { ClienteRepositoryPort } from "../../../clientes/domain/cliente.repository.port";
import { validarCorreo } from "../../domain/sucursal.entity";
import { ClienteNoEncontradoError, CorreoInvalidoError, SucursalNoEncontradaError } from "../../domain/sucursal.errors";
import type { AlcanceConsulta, SucursalRepositoryPort } from "../../domain/sucursal.repository.port";
import type { ActualizarSucursalInput, CrearSucursalInput } from "../sucursal.schema";

export class GestionarSucursalUseCase {
  constructor(
    private readonly repo: SucursalRepositoryPort,
    private readonly clienteRepo: ClienteRepositoryPort,
  ) {}

  async listarPorCliente(clienteId: string, empresaId: string, alcance?: AlcanceConsulta, paginacion?: { pagina?: number; porPagina?: number }) {
    const { items, total } = await this.repo.listarPorCliente(clienteId, empresaId, alcance, {
      pagina: paginacion?.pagina ?? 1,
      porPagina: paginacion?.porPagina ?? 20,
    });
    const sucursalesConPuntaje = await Promise.all(
      items.map(async (sucursal) => {
        const puntajeVigente = await this.repo.obtenerPuntajeVigente(sucursal.id, empresaId);
        return {
          ...sucursal,
          puntajeVigente: puntajeVigente?.puntaje ?? null,
          clasificacionVigente: puntajeVigente?.clasificacion ?? null,
        };
      }),
    );
    return { items: sucursalesConPuntaje, total };
  }

  async obtenerPorId(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const sucursal = await this.repo.obtenerPorId(id, empresaId, alcance);
    if (!sucursal) throw new SucursalNoEncontradaError(id);
    return sucursal;
  }

  async crear(empresaId: string, input: CrearSucursalInput) {
    this.validarCorreoSiViene(input.correo);
    const cliente = await this.clienteRepo.obtenerPorId(input.clienteId, empresaId);
    if (!cliente) throw new ClienteNoEncontradoError(input.clienteId);
    return this.repo.crear({ ...input, empresaId });
  }

  async actualizar(id: string, empresaId: string, input: ActualizarSucursalInput) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new SucursalNoEncontradaError(id);
    this.validarCorreoSiViene(input.correo);
    return this.repo.actualizar(id, empresaId, input);
  }

  async activar(id: string, empresaId: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new SucursalNoEncontradaError(id);
    return this.repo.cambiarEstado(id, empresaId, true);
  }

  async desactivar(id: string, empresaId: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new SucursalNoEncontradaError(id);
    return this.repo.cambiarEstado(id, empresaId, false);
  }

  async obtenerHistorico(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const existente = await this.repo.obtenerPorId(id, empresaId, alcance);
    if (!existente) throw new SucursalNoEncontradaError(id);
    const [registros, puntajeVigente] = await Promise.all([
      this.repo.obtenerHistoricoCertificaciones(id, empresaId),
      this.repo.obtenerPuntajeVigente(id, empresaId),
    ]);
    return { registros, puntajeVigente };
  }

  private validarCorreoSiViene(correo?: string | null) {
    if (correo && !validarCorreo(correo)) throw new CorreoInvalidoError();
  }
}
