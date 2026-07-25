export class PlanAuditoriaNoEncontradoError extends Error {
  constructor(id: string) { super(`Plan de auditoría ${id} no encontrado.`); }
}
export class PlanAuditoriaNoReprogramableError extends Error {
  constructor() { super("Este plan ya se ejecutó y no puede reprogramarse."); }
}
