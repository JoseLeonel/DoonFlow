export interface RegistroAuditoria {
  id: string;
  empresaId: string;
  usuarioId: string;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  valorAntes: unknown | null;
  valorDespues: unknown | null;
  ip: string | null;
  creadoEn: string;
}

export interface FiltrosAuditoria {
  usuarioId?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
}

export async function listarAuditoria(filtros: FiltrosAuditoria): Promise<{ items: RegistroAuditoria[]; total: number }> {
  const qs = new URLSearchParams();
  if (filtros.usuarioId) qs.set("usuarioId", filtros.usuarioId);
  if (filtros.accion) qs.set("accion", filtros.accion);
  if (filtros.desde) qs.set("desde", filtros.desde);
  if (filtros.hasta) qs.set("hasta", filtros.hasta);
  qs.set("pagina", String(filtros.pagina ?? 1));
  qs.set("porPagina", String(filtros.porPagina ?? 20));

  const res = await fetch(`/api/auditoria?${qs.toString()}`, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return { items: json.data as RegistroAuditoria[], total: json.meta?.total ?? 0 };
}
