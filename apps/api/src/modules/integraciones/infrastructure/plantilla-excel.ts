import * as XLSX from "xlsx";
import type { FilaCruda } from "../application/casos-uso/importar-clientes.usecase";

const ENCABEZADOS_CLIENTE = ["Nombre Responsable", "Empresa", "Identificación Empresa", "Correo 1", "Correo 2", "Correo 3", "Dirección", "Móvil"];
const CAMPOS_CLIENTE = ["nombreResponsable", "empresa", "identificacionEmpresa", "correo1", "correo2", "correo3", "direccion", "movil"];

const ENCABEZADOS_SUCURSAL = ["Identificación Cliente", "Nombre Sucursal", "Dirección", "Correo", "Móvil"];
const CAMPOS_SUCURSAL = ["identificacionCliente", "nombre", "direccion", "correo", "movil"];

function generarPlantilla(encabezados: string[], nombreHoja: string): Buffer {
  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.aoa_to_sheet([encabezados]);
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function generarPlantillaClientes(): Buffer {
  return generarPlantilla(ENCABEZADOS_CLIENTE, "Clientes");
}

export function generarPlantillaSucursales(): Buffer {
  return generarPlantilla(ENCABEZADOS_SUCURSAL, "Sucursales");
}

/**
 * Lee siempre la primera hoja, descarta la fila 1 (encabezado, sin importar su texto — el mapeo
 * es posicional por columna) e ignora filas completamente vacías. El número de `fila` reportado
 * es el número real de fila de Excel (la primera fila de datos es la fila 2).
 */
function parsearArchivo(buffer: Buffer, campos: string[]): FilaCruda[] {
  const libro = XLSX.read(buffer, { type: "buffer" });
  const nombreHoja = libro.SheetNames[0];
  if (!nombreHoja) return [];
  const hoja = libro.Sheets[nombreHoja]!;
  const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: false });

  const resultado: FilaCruda[] = [];
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i]!;
    if (fila.every((celda) => celda === undefined || celda === null || String(celda).trim() === "")) continue;

    const datos: Record<string, unknown> = {};
    campos.forEach((campo, indice) => {
      const valor = fila[indice];
      datos[campo] = valor === undefined || valor === null || String(valor).trim() === "" ? undefined : String(valor).trim();
    });
    resultado.push({ fila: i + 1, datos });
  }
  return resultado;
}

export function parsearArchivoClientes(buffer: Buffer): FilaCruda[] {
  return parsearArchivo(buffer, CAMPOS_CLIENTE);
}

export function parsearArchivoSucursales(buffer: Buffer): FilaCruda[] {
  return parsearArchivo(buffer, CAMPOS_SUCURSAL);
}
