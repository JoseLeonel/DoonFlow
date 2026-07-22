import type { GestionarSucursalUseCase } from "../../../sucursales/application/casos-uso/gestionar-sucursal.usecase";
import type { ClienteRepositoryPort } from "../../../clientes/domain/cliente.repository.port";
import { construirResumenLote } from "../../domain/importacion-lote.entity";
import type { FilaImportacionResultado, ImportacionLote } from "../../domain/importacion-lote.entity";
import type { ImportacionLoteRepositoryPort } from "../../domain/importacion-lote.repository.port";
import { filaImportacionSucursalSchema } from "../integraciones.schema";
import type { FilaCruda, ResultadoPrevisualizacion } from "./importar-clientes.usecase";

/** Compone `GestionarSucursalUseCase`/`ClienteRepositoryPort` ya existentes — no reimplementa sus reglas de validación. */
export class ImportarSucursalesUseCase {
  constructor(
    private readonly loteRepo: ImportacionLoteRepositoryPort,
    private readonly sucursalUseCase: GestionarSucursalUseCase,
    private readonly clienteRepo: ClienteRepositoryPort,
  ) {}

  async previsualizar(empresaId: string, filas: FilaCruda[]): Promise<ResultadoPrevisualizacion> {
    const resultados: FilaImportacionResultado[] = [];

    for (const fila of filas) {
      const parseo = filaImportacionSucursalSchema.safeParse(fila.datos);
      if (!parseo.success) {
        resultados.push({ fila: fila.fila, datos: fila.datos, error: parseo.error.errors[0]?.message ?? "Datos inválidos." });
        continue;
      }
      const cliente = await this.clienteRepo.buscarPorIdentificacion(parseo.data.identificacionCliente, empresaId);
      if (!cliente) {
        resultados.push({ fila: fila.fila, datos: parseo.data, error: `No existe un cliente con identificación "${parseo.data.identificacionCliente}" en esta empresa.` });
        continue;
      }
      resultados.push({ fila: fila.fila, datos: parseo.data });
    }

    return {
      totalFilas: filas.length,
      filasValidas: resultados.filter((r) => !r.error).map((r) => r.datos),
      filasConError: resultados.filter((r) => !!r.error),
    };
  }

  async importar(empresaId: string, usuarioId: string, archivoNombre: string, filas: FilaCruda[]): Promise<ImportacionLote> {
    const resultados: FilaImportacionResultado[] = [];

    for (const fila of filas) {
      const parseo = filaImportacionSucursalSchema.safeParse(fila.datos);
      if (!parseo.success) {
        resultados.push({ fila: fila.fila, datos: fila.datos, error: parseo.error.errors[0]?.message ?? "Datos inválidos." });
        continue;
      }
      const cliente = await this.clienteRepo.buscarPorIdentificacion(parseo.data.identificacionCliente, empresaId);
      if (!cliente) {
        resultados.push({ fila: fila.fila, datos: parseo.data, error: `No existe un cliente con identificación "${parseo.data.identificacionCliente}" en esta empresa.` });
        continue;
      }
      try {
        await this.sucursalUseCase.crear(empresaId, {
          nombre: parseo.data.nombre,
          clienteId: cliente.id,
          direccion: parseo.data.direccion,
          correo: parseo.data.correo,
          movil: parseo.data.movil,
        });
        resultados.push({ fila: fila.fila, datos: parseo.data });
      } catch (e) {
        resultados.push({ fila: fila.fila, datos: parseo.data, error: e instanceof Error ? e.message : "Error desconocido." });
      }
    }

    const resumen = construirResumenLote("SUCURSAL", archivoNombre, resultados);
    return this.loteRepo.crear(empresaId, usuarioId, resumen);
  }
}
