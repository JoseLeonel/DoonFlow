import type { PrismaClient } from "@prisma/client";
import type { AuditoriaRepositoryPort, EntradaAuditoria } from "../domain/auditoria.repository.port";

/** RF-12 — historial de auditoría, poblado por primera vez en 007 para el flujo de aprobación. */
export class AuditoriaPrismaRepository implements AuditoriaRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(entrada: EntradaAuditoria): Promise<void> {
    await this.prisma.inspeccionAuditoria.create({
      data: {
        plantillaId: entrada.plantillaId,
        usuarioId: entrada.usuarioId,
        tabla: entrada.tabla,
        registroId: entrada.registroId,
        accion: entrada.accion,
        valorAntes: entrada.valorAntes as any,
        valorDespues: entrada.valorDespues as any,
      },
    });
  }
}
