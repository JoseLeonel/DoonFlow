import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import type { VerificarCertificadoUseCase } from "../application/casos-uso/verificar-certificado.usecase";

export class VerificacionController {
  constructor(private readonly usecase: VerificarCertificadoUseCase) {}

  verificar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = await this.usecase.ejecutar(req.params["codigo"]!);
      if (!resultado) {
        throw new ErrorHttp(404, "certificado_no_encontrado", "No se encontró ninguna certificación con ese código.");
      }
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(e); }
  };
}
