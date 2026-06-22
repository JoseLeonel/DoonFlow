import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ErrorHttp } from "./error-http";
import { respuestaError } from "./sobre-respuesta";

/** Middleware global de manejo de errores — único lugar que traduce errores a HTTP. */
export const middlewareErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  // Error de dominio mapeado a HTTP por el controller.
  if (err instanceof ErrorHttp) {
    res.status(err.status).json(respuestaError(err.codigo, err.message, err.detalles));
    return;
  }

  // Error de validación de Zod (input inválido del cliente) → 400.
  if (err instanceof ZodError) {
    res.status(400).json(
      respuestaError("validacion_fallida", "Los datos enviados son inválidos.", err.flatten().fieldErrors),
    );
    return;
  }

  // Error no esperado → 500.
  console.error("[error_interno]", err);
  res.status(500).json(respuestaError("error_interno", "Ocurrió un error inesperado."));
};
