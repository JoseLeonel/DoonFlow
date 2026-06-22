import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
import type { ProveedorAuthPort } from "../domain/proveedor-auth.port";

/**
 * Adaptador de autenticación local — bcrypt + JWT propio.
 * Se usa cuando no hay Supabase configurado (desarrollo local con PostgreSQL directo).
 * El puerto ProveedorAuthPort es idéntico al de SupabaseAuthAdapter, lo que permite
 * cambiar entre ambos sin tocar el caso de uso.
 */
export class LocalAuthAdapter implements ProveedorAuthPort {
  private readonly jwtSecret: string;
  private readonly jwtExpira: string;

  constructor(
    private readonly prisma: PrismaClient,
    jwtSecret: string,
    jwtExpira = "8h",
  ) {
    this.jwtSecret = jwtSecret;
    this.jwtExpira = jwtExpira;
  }

  async verificarCredenciales(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });

    if (!usuario?.passwordHash) return null;

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) return null;

    const payload = {
      sub:       usuario.id,
      email:     usuario.email,
      rol:       usuario.rol.nombre,
      empresaId: usuario.empresaId,
    };

    const tokenAcceso = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpira as jwt.SignOptions["expiresIn"],
    });

    return { authUserId: usuario.id, tokenAcceso };
  }
}
