import { generarClave, hashClave } from "../../domain/api-key.entity";
import { ApiKeyNoEncontradaError } from "../../domain/integraciones.errors";
import type { ApiKeyRepositoryPort } from "../../domain/api-key.repository.port";
import type { CrearApiKeyInput } from "../integraciones.schema";

/**
 * Gestiona las API keys de una empresa tenant (009-integraciones-datos-masivos, HU-3): crear,
 * listar, revocar. La clave en texto plano solo existe en el resultado de `crear()` — nunca se
 * puede recuperar después (regla de negocio 3 de la spec).
 */
export class GestionarApiKeyUseCase {
  constructor(private readonly repo: ApiKeyRepositoryPort) {}

  listar(empresaId: string) {
    return this.repo.listar(empresaId);
  }

  async crear(empresaId: string, creadoPorId: string, input: CrearApiKeyInput) {
    const claveTextoPlano = generarClave();
    const apiKey = await this.repo.crear({
      empresaId,
      nombre: input.nombre,
      claveHash: hashClave(claveTextoPlano),
      creadoPorId,
    });
    return { apiKey, claveTextoPlano };
  }

  async revocar(id: string, empresaId: string) {
    const apiKey = await this.repo.obtenerPorId(id, empresaId);
    if (!apiKey) throw new ApiKeyNoEncontradaError();
    return this.repo.revocar(id, empresaId);
  }
}
