import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { TipoDatoRetencionInvalidoError } from "../domain/politica-retencion.errors";
import type { GestionarPoliticaRetencionUseCase } from "../application/casos-uso/gestionar-politica-retencion.usecase";

const actualizarSchema = z.object({
  mesesRetencion: z.number().int().positive(),
  accionAlVencer: z.enum(["ANONIMIZAR", "ELIMINAR"]),
});

export class PoliticaRetencionController {
  constructor(private readonly uc: GestionarPoliticaRetencionUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(respuestaExitosa(await this.uc.obtenerPorEmpresa(req.usuario!.empresaId))); }
    catch (e) { next(e); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarSchema.parse(req.body);
      const resultado = await this.uc.actualizar(req.usuario!.empresaId, req.params["tipoDato"]!, input);
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof TipoDatoRetencionInvalidoError) return new ErrorHttp(400, "tipo_dato_invalido", e.message);
    return e;
  }
}
