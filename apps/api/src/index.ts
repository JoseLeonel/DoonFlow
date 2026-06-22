import "dotenv/config";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { crearModuloAuth } from "./modules/auth";
import { crearModuloInspeccion } from "./modules/inspeccion";
import { crearMiddlewareAutenticacion } from "./middleware/autenticacion.middleware";
import { middlewareErrores } from "./shared/middleware-errores";

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

const autenticar = crearMiddlewareAutenticacion(prisma);

const moduloAuth = crearModuloAuth(prisma, supabase);
app.use("/auth", moduloAuth.router);

const moduloInspeccion = crearModuloInspeccion(prisma, autenticar);
app.use("/inspeccion", moduloInspeccion.router);

app.get("/salud", (_req, res) => {
  res.json({ data: { estado: "ok", modo: esLocal ? "local" : "supabase" } });
});

app.use(middlewareErrores);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`DoonFlow API → http://localhost:${PORT}`);
  console.log(`Modo: ${esLocal ? "LOCAL (PostgreSQL directo)" : "SUPABASE"}`);
});
