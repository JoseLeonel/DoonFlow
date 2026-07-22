import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import type { ListarAuditoriaUseCase } from "../application/casos-uso/listar-auditoria.usecase";

export class AuditoriaController {
  constructor(private readonly uc: ListarAuditoriaUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagina = Number(req.query["pagina"] ?? 1);
      const porPagina = Number(req.query["porPagina"] ?? 20);
      const { items, total } = await this.uc.listar(
        req.usuario!.empresaId,
        {
          usuarioId: req.query["usuarioId"] as string | undefined,
          accion: req.query["accion"] as string | undefined,
          desde: req.query["desde"] ? new Date(req.query["desde"] as string) : undefined,
          hasta: req.query["hasta"] ? new Date(req.query["hasta"] as string) : undefined,
        },
        { pagina, porPagina },
      );
      res.json(respuestaExitosa(items, { pagina, porPagina, total }));
    } catch (e) { next(e); }
  };
}
