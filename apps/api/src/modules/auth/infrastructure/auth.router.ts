import { Router } from "express";
import type { RequestHandler } from "express";
import type { AuthController } from "./auth.controller";

export function crearAuthRouter(controller: AuthController, autenticar: RequestHandler): Router {
  const router = Router();

  router.post("/login", controller.iniciarSesion);
  router.get("/me", autenticar, controller.miInfo);

  return router;
}
