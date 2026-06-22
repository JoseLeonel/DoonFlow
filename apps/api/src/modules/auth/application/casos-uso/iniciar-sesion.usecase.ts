import { puedeIniciarSesion, type UsuarioConRol } from "../../domain/usuario.entity";
import {
  CredencialesInvalidasError,
  UsuarioInactivoError,
  UsuarioSinPerfilError,
} from "../../domain/auth.errors";
import type { ProveedorAuthPort } from "../../domain/proveedor-auth.port";
import type { UsuarioRepositoryPort } from "../../domain/usuario.repository.port";
import type { IniciarSesionInput } from "../auth.schema";

export interface ResultadoIniciarSesion {
  usuario: UsuarioConRol;
  tokenAcceso: string;
}

/**
 * Caso de uso: iniciar sesión.
 * Orquesta el dominio a través de puertos — no conoce Express, Prisma ni Supabase directamente.
 */
export class IniciarSesionUseCase {
  constructor(
    private readonly proveedorAuth: ProveedorAuthPort,
    private readonly usuarioRepository: UsuarioRepositoryPort,
  ) {}

  async ejecutar(input: IniciarSesionInput): Promise<ResultadoIniciarSesion> {
    const credenciales = await this.proveedorAuth.verificarCredenciales(
      input.email,
      input.password,
    );

    if (!credenciales) {
      throw new CredencialesInvalidasError();
    }

    const usuario = await this.usuarioRepository.buscarPorAuthUserId(
      credenciales.authUserId,
    );

    if (!usuario) {
      throw new UsuarioSinPerfilError();
    }

    if (!puedeIniciarSesion(usuario)) {
      throw new UsuarioInactivoError();
    }

    return { usuario, tokenAcceso: credenciales.tokenAcceso };
  }
}
