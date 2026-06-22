import { Router } from "express";
import type { AuthController } from "./auth.controller";

export function crearAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post("/login", controller.iniciarSesion);

  return router;
}
