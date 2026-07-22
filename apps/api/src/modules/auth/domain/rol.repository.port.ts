import type { RolSistema } from "@doonflow/shared";

/** Puerto de solo lectura — permite resolver el nombre de un rol a partir de su id sin salir del dominio. */
export interface RolRepositoryPort {
  obtenerPorId(id: string): Promise<{ id: string; nombre: RolSistema } | null>;

  /** Catálogo completo de roles — usado por el frontend para mapear nombre de rol → rolId. */
  listar(): Promise<{ id: string; nombre: RolSistema }[]>;
}
