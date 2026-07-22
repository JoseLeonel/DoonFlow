import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import type { ImportarClientesUseCase } from "../application/casos-uso/importar-clientes.usecase";
import type { ImportarSucursalesUseCase } from "../application/casos-uso/importar-sucursales.usecase";
import type { ImportacionLoteRepositoryPort } from "../domain/importacion-lote.repository.port";
import {
  generarPlantillaClientes,
  generarPlantillaSucursales,
  parsearArchivoClientes,
  parsearArchivoSucursales,
} from "./plantilla-excel";
import type { TipoImportacion } from "../domain/importacion-lote.entity";

type RequestConArchivo = Request;

export class IntegracionesController {
  constructor(
    private readonly importarClientesUc: ImportarClientesUseCase,
    private readonly importarSucursalesUc: ImportarSucursalesUseCase,
    private readonly loteRepo: ImportacionLoteRepositoryPort,
  ) {}

  descargarPlantilla = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tipo = String(req.query["tipo"] ?? "").toUpperCase();
      const buffer = tipo === "SUCURSAL" ? generarPlantillaSucursales() : generarPlantillaClientes();
      const nombre = tipo === "SUCURSAL" ? "plantilla-sucursales.xlsx" : "plantilla-clientes.xlsx";
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
      res.send(buffer);
    } catch (e) { next(e); }
  };

  previsualizarClientes = async (req: RequestConArchivo, res: Response, next: NextFunction) => {
    try {
      const archivo = this.requerirArchivo(req);
      const filas = parsearArchivoClientes(archivo.buffer);
      res.json(respuestaExitosa(await this.importarClientesUc.previsualizar(req.usuario!.empresaId, filas)));
    } catch (e) { next(this.m(e)); }
  };

  importarClientes = async (req: RequestConArchivo, res: Response, next: NextFunction) => {
    try {
      const archivo = this.requerirArchivo(req);
      const filas = parsearArchivoClientes(archivo.buffer);
      const lote = await this.importarClientesUc.importar(req.usuario!.empresaId, req.usuario!.id, archivo.originalname, filas);
      res.status(201).json(respuestaExitosa(lote));
    } catch (e) { next(this.m(e)); }
  };

  previsualizarSucursales = async (req: RequestConArchivo, res: Response, next: NextFunction) => {
    try {
      const archivo = this.requerirArchivo(req);
      const filas = parsearArchivoSucursales(archivo.buffer);
      res.json(respuestaExitosa(await this.importarSucursalesUc.previsualizar(req.usuario!.empresaId, filas)));
    } catch (e) { next(this.m(e)); }
  };

  importarSucursales = async (req: RequestConArchivo, res: Response, next: NextFunction) => {
    try {
      const archivo = this.requerirArchivo(req);
      const filas = parsearArchivoSucursales(archivo.buffer);
      const lote = await this.importarSucursalesUc.importar(req.usuario!.empresaId, req.usuario!.id, archivo.originalname, filas);
      res.status(201).json(respuestaExitosa(lote));
    } catch (e) { next(this.m(e)); }
  };

  listarHistorial = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tipo = req.query["tipo"] as TipoImportacion | undefined;
      res.json(respuestaExitosa(await this.loteRepo.listar(req.usuario!.empresaId, tipo)));
    } catch (e) { next(e); }
  };

  descargarErrores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lote = await this.loteRepo.obtenerPorId(req.params["id"]!, req.usuario!.empresaId);
      if (!lote) throw new ErrorHttp(404, "lote_no_encontrado", "El lote de importación no existe o no pertenece a esta empresa.");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="errores-${lote.id}.json"`);
      res.send(JSON.stringify(lote.detalleErrores ?? [], null, 2));
    } catch (e) { next(e); }
  };

  private requerirArchivo(req: RequestConArchivo) {
    if (!req.file) throw new ErrorHttp(400, "archivo_importacion_invalido", "El archivo está vacío o no tiene el formato esperado.");
    return req.file;
  }

  private m(e: unknown) {
    return e;
  }
}
