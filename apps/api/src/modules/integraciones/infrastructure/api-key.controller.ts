import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { ApiKeyNoEncontradaError } from "../domain/integraciones.errors";
import { crearApiKeySchema } from "../application/integraciones.schema";
import type { GestionarApiKeyUseCase } from "../application/casos-uso/gestionar-api-key.usecase";
import type { ApiKey } from "../domain/api-key.entity";

/** Nunca serializa `claveHash` hacia el frontend — no hay razón para exponer ni siquiera el hash. */
function serializar(apiKey: ApiKey) {
  const { claveHash: _claveHash, ...resto } = apiKey;
  return resto;
}

export class ApiKeyController {
  constructor(private readonly usecase: GestionarApiKeyUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKeys = await this.usecase.listar(req.usuario!.empresaId);
      res.json(respuestaExitosa(apiKeys.map(serializar)));
    } catch (e) { next(e); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearApiKeySchema.parse(req.body);
      const { apiKey, claveTextoPlano } = await this.usecase.crear(req.usuario!.empresaId, req.usuario!.id, input);
      res.status(201).json(respuestaExitosa({ ...serializar(apiKey), clave: claveTextoPlano }));
    } catch (e) { next(e); }
  };

  revocar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = await this.usecase.revocar(req.params["id"]!, req.usuario!.empresaId);
      res.json(respuestaExitosa(serializar(apiKey)));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof ApiKeyNoEncontradaError) return new ErrorHttp(404, "api_key_no_encontrada", e.message);
    return e;
  }
}
