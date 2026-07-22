import type { GestionarClienteUseCase } from "../../../clientes/application/casos-uso/gestionar-cliente.usecase";
import type { ClienteRepositoryPort } from "../../../clientes/domain/cliente.repository.port";
import { construirResumenLote } from "../../domain/importacion-lote.entity";
import type { FilaImportacionResultado, ImportacionLote } from "../../domain/importacion-lote.entity";
import type { ImportacionLoteRepositoryPort } from "../../domain/importacion-lote.repository.port";
import { filaImportacionClienteSchema } from "../integraciones.schema";

export interface FilaCruda {
  fila: number;
  datos: Record<string, unknown>;
}

export interface ResultadoPrevisualizacion {
  totalFilas: number;
  filasValidas: Record<string, unknown>[];
  filasConError: FilaImportacionResultado[];
}

/** Compone `GestionarClienteUseCase`/`ClienteRepositoryPort` ya existentes — no reimplementa sus reglas de validación. */
export class ImportarClientesUseCase {
  constructor(
    private readonly loteRepo: ImportacionLoteRepositoryPort,
    private readonly clienteUseCase: GestionarClienteUseCase,
    private readonly clienteRepo: ClienteRepositoryPort,
  ) {}

  async previsualizar(empresaId: string, filas: FilaCruda[]): Promise<ResultadoPrevisualizacion> {
    const resultados = await this.procesarFilas(filas, async (datos) => {
      if (datos.identificacionEmpresa) {
        const duplicado = await this.clienteRepo.existeIdentificacion(empresaId, datos.identificacionEmpresa);
        if (duplicado) return "Ya existe un cliente con esa identificación.";
      }
      return null;
    });

    return {
      totalFilas: filas.length,
      filasValidas: resultados.filter((r) => !r.error).map((r) => r.datos),
      filasConError: resultados.filter((r) => !!r.error),
    };
  }

  async importar(empresaId: string, usuarioId: string, archivoNombre: string, filas: FilaCruda[]): Promise<ImportacionLote> {
    const resultados: FilaImportacionResultado[] = [];

    for (const fila of filas) {
      const parseo = filaImportacionClienteSchema.safeParse(fila.datos);
      if (!parseo.success) {
        resultados.push({ fila: fila.fila, datos: fila.datos, error: parseo.error.errors[0]?.message ?? "Datos inválidos." });
        continue;
      }
      try {
        await this.clienteUseCase.crear(empresaId, parseo.data);
        resultados.push({ fila: fila.fila, datos: parseo.data });
      } catch (e) {
        resultados.push({ fila: fila.fila, datos: parseo.data, error: e instanceof Error ? e.message : "Error desconocido." });
      }
    }

    const resumen = construirResumenLote("CLIENTE", archivoNombre, resultados);
    return this.loteRepo.crear(empresaId, usuarioId, resumen);
  }

  private async procesarFilas(
    filas: FilaCruda[],
    validarDuplicado: (datos: any) => Promise<string | null>,
  ): Promise<FilaImportacionResultado[]> {
    const resultados: FilaImportacionResultado[] = [];
    for (const fila of filas) {
      const parseo = filaImportacionClienteSchema.safeParse(fila.datos);
      if (!parseo.success) {
        resultados.push({ fila: fila.fila, datos: fila.datos, error: parseo.error.errors[0]?.message ?? "Datos inválidos." });
        continue;
      }
      const errorDuplicado = await validarDuplicado(parseo.data);
      resultados.push({ fila: fila.fila, datos: parseo.data, ...(errorDuplicado ? { error: errorDuplicado } : {}) });
    }
    return resultados;
  }
}
