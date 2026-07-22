import "dotenv/config";
import path from "node:path";
import cors from "cors";
import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { crearModuloAuth } from "./modules/auth";
import { crearModuloInspeccion } from "./modules/inspeccion";
import { crearModuloClientes } from "./modules/clientes";
import { crearModuloSucursales } from "./modules/sucursales";
import { crearModuloPermisos } from "./modules/permisos";
import { crearModuloAuditoria } from "./modules/auditoria";
import { crearModuloRetencion } from "./modules/retencion";
import { crearModuloPrivacidad } from "./modules/privacidad";
import { crearModuloReportes } from "./modules/reportes";
import { crearModuloIntegraciones } from "./modules/integraciones";
import { iniciarJobPurgarRetencion } from "./modules/retencion/infrastructure/job-purgar-retencion.job";
import { crearMiddlewareAutenticacion } from "./middleware/autenticacion.middleware";
import { crearMiddlewareAlcance } from "./middleware/alcance.middleware";
import { requierePermiso } from "./middleware/permiso.middleware";
import { middlewareErrores } from "./shared/middleware-errores";
import { crearRegistradorEventoAuditoria } from "./shared/auditoria/registrar-evento-auditoria";

const prisma = new PrismaClient();

// En modo local (sin Supabase real) el cliente puede ser null;
// LocalAuthAdapter no lo necesita.
const esLocal =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

const supabase = esLocal
  ? null
  : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    );

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());
// Evidencias subidas en modo local (sin Supabase Storage) — ver LocalEvidenciasAdapter.
app.use("/archivos", express.static(path.join(process.cwd(), "uploads")));

const autenticar = crearMiddlewareAutenticacion(prisma);
const resolverAlcance = crearMiddlewareAlcance(prisma);
const requiereEnviarRevision = requierePermiso("plantillas.enviar_revision", prisma);
const requiereAprobarPlantilla = requierePermiso("plantillas.aprobar", prisma);

// El módulo de auditoría se crea primero — otros módulos reciben `registrarEventoAuditoria`
// para escribir en RegistroAuditoria sin instanciar su propio repositorio (010-seguridad-privacidad-continuidad).
const moduloAuditoria = crearModuloAuditoria(prisma, autenticar);
app.use("/auditoria", moduloAuditoria.router);
const registrarEventoAuditoria = crearRegistradorEventoAuditoria(moduloAuditoria.registrarUseCase);

const moduloAuth = crearModuloAuth(prisma, supabase, autenticar, registrarEventoAuditoria);
app.use("/auth", moduloAuth.router);
app.use("/usuarios", moduloAuth.routerUsuarios);

const moduloInspeccion = crearModuloInspeccion(prisma, autenticar, resolverAlcance, supabase, requiereEnviarRevision, requiereAprobarPlantilla, registrarEventoAuditoria);
app.use("/inspeccion", moduloInspeccion.router);

const moduloClientes = crearModuloClientes(prisma, autenticar, resolverAlcance);
app.use("/clientes", moduloClientes.router);

const moduloSucursales = crearModuloSucursales(prisma, autenticar, resolverAlcance);
app.use("/sucursales", moduloSucursales.router);

const moduloPermisos = crearModuloPermisos(prisma, autenticar, registrarEventoAuditoria);
app.use("/permisos", moduloPermisos.router);

const moduloRetencion = crearModuloRetencion(prisma, autenticar);
app.use("/retencion", moduloRetencion.router);

const moduloPrivacidad = crearModuloPrivacidad(prisma, autenticar);
app.use("/privacidad", moduloPrivacidad.router);

const moduloReportes = crearModuloReportes(prisma, autenticar, resolverAlcance, supabase);
app.use("/reportes", moduloReportes.router);

// 009-integraciones-datos-masivos — alcance reducido a HU-1/HU-2 (importación masiva);
// HU-3 (API keys + verificación pública) pospuesta, ver memoria/decisiones.md.
const subidaArchivo = multer({ storage: multer.memoryStorage() });
const moduloIntegraciones = crearModuloIntegraciones(prisma, autenticar, subidaArchivo);
app.use("/integraciones", moduloIntegraciones.router);

iniciarJobPurgarRetencion(prisma, registrarEventoAuditoria);

app.get("/salud", (_req, res) => {
  res.json({ data: { estado: "ok", modo: esLocal ? "local" : "supabase" } });
});

app.use(middlewareErrores);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`DoonFlow API → http://localhost:${PORT}`);
  console.log(`Modo: ${esLocal ? "LOCAL (PostgreSQL directo)" : "SUPABASE"}`);
});
