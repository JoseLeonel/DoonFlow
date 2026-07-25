import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { ClientePrismaRepository } from "../clientes/infrastructure/cliente.prisma-repository";
import { GestionarClienteUseCase } from "../clientes/application/casos-uso/gestionar-cliente.usecase";
import { SucursalPrismaRepository } from "../sucursales/infrastructure/sucursal.prisma-repository";
import { GestionarSucursalUseCase } from "../sucursales/application/casos-uso/gestionar-sucursal.usecase";
import type { VerificarCertificadoUseCase } from "../verificacion/application/casos-uso/verificar-certificado.usecase";
import { ImportacionLotePrismaRepository } from "./infrastructure/importacion-lote.prisma-repository";
import { ApiKeyPrismaRepository } from "./infrastructure/api-key.prisma-repository";
import { ImportarClientesUseCase } from "./application/casos-uso/importar-clientes.usecase";
import { ImportarSucursalesUseCase } from "./application/casos-uso/importar-sucursales.usecase";
import { GestionarApiKeyUseCase } from "./application/casos-uso/gestionar-api-key.usecase";
import { IntegracionesController } from "./infrastructure/integraciones.controller";
import { ApiKeyController } from "./infrastructure/api-key.controller";
import { CertificacionPublicaController } from "./infrastructure/certificacion-publica.controller";
import { crearIntegracionesRouter } from "./infrastructure/integraciones.router";
import { crearCertificacionPublicaRouter } from "./infrastructure/certificacion-publica.router";

/**
 * HU-1/HU-2 (importación masiva de Cliente/Sucursal) implementadas desde 2026-07-21.
 * HU-3 (API keys + verificación pública), retomada 2026-07-24 una vez que el portal
 * `/verificar/[codigo]` de 006 quedó implementado — ver memoria/decisiones.md.
 *
 * No se modifica `crearModuloClientes`/`crearModuloSucursales` para exponer sus instancias
 * (el único cambio permitido sobre `clientes` en este sprint es `buscarPorIdentificacion`,
 * ver T-396) — se instancian aquí repos/usecases propios de esos módulos. Son clases sin
 * estado compartido (solo envuelven Prisma), instanciarlas de nuevo no duplica lógica de
 * negocio ni introduce inconsistencia.
 *
 * `verificarCertificadoUseCase` se inyecta desde el módulo `verificacion` (mismo patrón de
 * consumo cruzado que `apelaciones` con `inspeccion`) — la API pública reutiliza exactamente
 * la misma lógica que el portal humano en vez de duplicarla.
 */
export function crearModuloIntegraciones(
  prisma: PrismaClient,
  autenticar: RequestHandler,
  autenticacionApiKey: RequestHandler,
  subidaArchivo: Multer,
  verificarCertificadoUseCase: VerificarCertificadoUseCase,
) {
  const clienteRepo = new ClientePrismaRepository(prisma);
  const clienteUseCase = new GestionarClienteUseCase(clienteRepo);

  const sucursalRepo = new SucursalPrismaRepository(prisma);
  const sucursalUseCase = new GestionarSucursalUseCase(sucursalRepo, clienteRepo);

  const loteRepo = new ImportacionLotePrismaRepository(prisma);
  const importarClientesUc = new ImportarClientesUseCase(loteRepo, clienteUseCase, clienteRepo);
  const importarSucursalesUc = new ImportarSucursalesUseCase(loteRepo, sucursalUseCase, clienteRepo);

  const apiKeyRepo = new ApiKeyPrismaRepository(prisma);
  const apiKeyUseCase = new GestionarApiKeyUseCase(apiKeyRepo);

  const controller = new IntegracionesController(importarClientesUc, importarSucursalesUc, loteRepo);
  const apiKeyController = new ApiKeyController(apiKeyUseCase);
  const certificacionPublicaController = new CertificacionPublicaController(verificarCertificadoUseCase);

  return {
    router: crearIntegracionesRouter(controller, apiKeyController, autenticar, subidaArchivo),
    routerPublico: crearCertificacionPublicaRouter(certificacionPublicaController, autenticacionApiKey),
  };
}
