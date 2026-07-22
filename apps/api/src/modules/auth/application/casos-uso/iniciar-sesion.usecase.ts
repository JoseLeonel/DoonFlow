import { puedeIniciarSesion, type UsuarioConRol } from "../../domain/usuario.entity";
import {
  CredencialesInvalidasError,
  UsuarioInactivoError,
  UsuarioSinPerfilError,
} from "../../domain/auth.errors";
import type { ProveedorAuthPort } from "../../domain/proveedor-auth.port";
import type { UsuarioRepositoryPort } from "../../domain/usuario.repository.port";
import type { IniciarSesionInput } from "../auth.schema";
import type { RegistradorEventoAuditoria } from "../../../../shared/auditoria/registrar-evento-auditoria";

export interface ResultadoIniciarSesion {
  usuario: UsuarioConRol;
  tokenAcceso: string;
}

/**
 * Caso de uso: iniciar sesión.
 * Orquesta el dominio a través de puertos — no conoce Express, Prisma ni Supabase directamente.
 * `registrarEventoAuditoria` es opcional para no romper los tests existentes que no lo mockean
 * (010-seguridad-privacidad-continuidad, HU-5) — cuando se pasa, registra `LOGIN`/`LOGIN_FALLIDO`.
 */
export class IniciarSesionUseCase {
  constructor(
    private readonly proveedorAuth: ProveedorAuthPort,
    private readonly usuarioRepository: UsuarioRepositoryPort,
    private readonly registrarEventoAuditoria?: RegistradorEventoAuditoria,
  ) {}

  async ejecutar(input: IniciarSesionInput): Promise<ResultadoIniciarSesion> {
    const credenciales = await this.proveedorAuth.verificarCredenciales(
      input.email,
      input.password,
    );

    if (!credenciales) {
      await this.auditar("LOGIN_FALLIDO", null, input.email);
      throw new CredencialesInvalidasError();
    }

    const usuario = await this.usuarioRepository.buscarPorAuthUserId(
      credenciales.authUserId,
    );

    if (!usuario) {
      throw new UsuarioSinPerfilError();
    }

    if (!puedeIniciarSesion(usuario)) {
      await this.auditar("LOGIN_FALLIDO", usuario, input.email);
      throw new UsuarioInactivoError();
    }

    await this.auditar("LOGIN", usuario, input.email);
    return { usuario, tokenAcceso: credenciales.tokenAcceso };
  }

  private async auditar(accion: "LOGIN" | "LOGIN_FALLIDO", usuario: UsuarioConRol | null, email: string) {
    if (!this.registrarEventoAuditoria) return;
    await this.registrarEventoAuditoria({
      empresaId: usuario?.empresaId ?? "desconocida",
      usuarioId: usuario?.id ?? "desconocido",
      accion,
      entidadTipo: "usuario",
      entidadId: usuario?.id ?? email,
    });
  }
}
