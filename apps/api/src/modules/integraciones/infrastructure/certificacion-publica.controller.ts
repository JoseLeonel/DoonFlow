import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import type { VerificarCertificadoUseCase } from "../../verificacion/application/casos-uso/verificar-certificado.usecase";

/**
 * Reutiliza `VerificarCertificadoUseCase` del módulo `verificacion` (006) — la API pública
 * (009, HU-3) devuelve exactamente el mismo subconjunto de datos que el portal humano
 * `/verificar/[codigo]`, regla de negocio 4 de la spec. Solo cambia cómo se autentica la
 * request (API key vía middleware, en vez de ser totalmente anónima).
 */
export class CertificacionPublicaController {
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
