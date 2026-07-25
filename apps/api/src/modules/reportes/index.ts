import type { PrismaClient } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";
import { GenerarReporteUseCase } from "./application/casos-uso/generar-reporte.usecase";
import { ListarHistorialReportesUseCase } from "./application/casos-uso/listar-historial-reportes.usecase";
import { ObtenerPanelEjecutivoUseCase } from "./application/casos-uso/obtener-panel-ejecutivo.usecase";
import { ReporteController } from "./infrastructure/reporte.controller";
import { ReportePrismaRepository } from "./infrastructure/reporte.prisma-repository";
import { ReporteExcelAdapter } from "./infrastructure/reporte-excel.adapter";
import { ReportePdfAdapter } from "./infrastructure/reporte-pdf.adapter";
import { ReporteStorageLocalAdapter } from "./infrastructure/reporte-storage-local.adapter";
import { ReporteStorageSupabaseAdapter } from "./infrastructure/reporte-storage-supabase.adapter";
import { crearReportesRouter } from "./infrastructure/reportes.router";

export function crearModuloReportes(
  prisma: PrismaClient,
  autenticar: RequestHandler,
  resolverAlcance: RequestHandler,
  supabase: SupabaseClient | null,
) {
  const repo = new ReportePrismaRepository(prisma);
  const generadorExcel = new ReporteExcelAdapter();
  const generadorPdf = new ReportePdfAdapter();
  const storage = supabase ? new ReporteStorageSupabaseAdapter(supabase) : new ReporteStorageLocalAdapter();

  const generarUseCase = new GenerarReporteUseCase(repo, generadorExcel, generadorPdf, storage);
  const historialUseCase = new ListarHistorialReportesUseCase(repo);
  const panelEjecutivoUseCase = new ObtenerPanelEjecutivoUseCase(repo);
  const controller = new ReporteController(generarUseCase, historialUseCase, panelEjecutivoUseCase);

  return {
    router: crearReportesRouter(controller, autenticar, resolverAlcance),
  };
}
