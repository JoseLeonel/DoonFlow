export class ClienteNoEncontradoParaImportacionError extends Error {
  constructor(identificacion: string) {
    super(`No existe un cliente con identificación "${identificacion}" en esta empresa.`);
  }
}

export class ArchivoImportacionInvalidoError extends Error {
  constructor(mensaje = "El archivo está vacío o no tiene el formato esperado.") {
    super(mensaje);
  }
}

export class ImportacionLoteNoEncontradoError extends Error {
  constructor() {
    super("El lote de importación no existe o no pertenece a esta empresa.");
  }
}

export class ApiKeyNoEncontradaError extends Error {
  constructor() {
    super("La clave de API no existe o no pertenece a esta empresa.");
  }
}

export class ApiKeyRevocadaError extends Error {
  constructor() {
    super("Esta clave de API fue revocada y ya no es válida.");
  }
}
