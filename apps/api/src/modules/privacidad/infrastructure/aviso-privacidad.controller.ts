import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import type { TipoEntidadPrivacidad } from "../domain/aviso-privacidad.entity";
import { EntidadPrivacidadNoEncontradaError } from "../domain/aviso-privacidad.errors";
import type { GestionarAvisoPrivacidadUseCase } from "../application/casos-uso/gestionar-aviso-privacidad.usecase";

const TIPOS_VALIDOS: TipoEntidadPrivacidad[] = ["CLIENTE", "SUCURSAL"];
const registrarSchema = z.object({ baseLegal: z.string().min(1, "La base legal es requerida") });

export class AvisoPrivacidadController {
  constructor(private readonly uc: GestionarAvisoPrivacidadUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entidadTipo = this.validarTipo(req.params["entidadTipo"]!);
      const resultado = await this.uc.listarPorEntidad(entidadTipo, req.params["entidadId"]!, req.usuario!.empresaId);
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  registrar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entidadTipo = this.validarTipo(req.params["entidadTipo"]!);
      const { baseLegal } = registrarSchema.parse(req.body);
      const resultado = await this.uc.registrar({
        entidadTipo,
        entidadId: req.params["entidadId"]!,
        baseLegal,
        registradoPorId: req.usuario!.id,
        empresaId: req.usuario!.empresaId,
      });
      res.status(201).json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  private validarTipo(tipo: string): TipoEntidadPrivacidad {
    if (!TIPOS_VALIDOS.includes(tipo as TipoEntidadPrivacidad)) {
      throw new ErrorHttp(400, "entidad_tipo_invalido", `"${tipo}" no es CLIENTE ni SUCURSAL.`);
    }
    return tipo as TipoEntidadPrivacidad;
  }

  private m(e: unknown) {
    if (e instanceof EntidadPrivacidadNoEncontradaError) return new ErrorHttp(404, "entidad_no_encontrada", e.message);
    return e;
  }
}
