import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { ClientePrismaRepository } from "../clientes/infrastructure/cliente.prisma-repository";
import { GestionarClienteUseCase } from "../clientes/application/casos-uso/gestionar-cliente.usecase";
import { SucursalPrismaRepository } from "../sucursales/infrastructure/sucursal.prisma-repository";
import { GestionarSucursalUseCase } from "../sucursales/application/casos-uso/gestionar-sucursal.usecase";
import { ImportacionLotePrismaRepository } from "./infrastructure/importacion-lote.prisma-repository";
import { ImportarClientesUseCase } from "./application/casos-uso/importar-clientes.usecase";
import { ImportarSucursalesUseCase } from "./application/casos-uso/importar-sucursales.usecase";
import { IntegracionesController } from "./infrastructure/integraciones.controller";
import { crearIntegracionesRouter } from "./infrastructure/integraciones.router";

/**
 * Alcance reducido de este sprint (009): solo HU-1/HU-2 (importación masiva de Cliente/Sucursal).
 * HU-3 (API keys + verificación pública) queda pospuesta — ver memoria/decisiones.md 2026-07-21.
 *
 * No se modifica `crearModuloClientes`/`crearModuloSucursales` para exponer sus instancias
 * (el único cambio permitido sobre `clientes` en este sprint es `buscarPorIdentificacion`,
 * ver T-396) — se instancian aquí repos/usecases propios de esos módulos. Son clases sin
 * estado compartido (solo envuelven Prisma), instanciarlas de nuevo no duplica lógica de
 * negocio ni introduce inconsistencia.
 */
export function crearModuloIntegraciones(prisma: PrismaClient, autenticar: RequestHandler, subidaArchivo: Multer) {
  const clienteRepo = new ClientePrismaRepository(prisma);
  const clienteUseCase = new GestionarClienteUseCase(clienteRepo);

  const sucursalRepo = new SucursalPrismaRepository(prisma);
  const sucursalUseCase = new GestionarSucursalUseCase(sucursalRepo, clienteRepo);

  const loteRepo = new ImportacionLotePrismaRepository(prisma);
  const importarClientesUc = new ImportarClientesUseCase(loteRepo, clienteUseCase, clienteRepo);
  const importarSucursalesUc = new ImportarSucursalesUseCase(loteRepo, sucursalUseCase, clienteRepo);

  const controller = new IntegracionesController(importarClientesUc, importarSucursalesUc, loteRepo);

  return {
    router: crearIntegracionesRouter(controller, autenticar, subidaArchivo),
  };
}
