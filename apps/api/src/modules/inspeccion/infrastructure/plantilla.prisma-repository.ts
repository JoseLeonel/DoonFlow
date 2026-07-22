import type { PrismaClient } from "@prisma/client";
import type { PlantillaRepositoryPort, FiltrosPlantilla, ResultadoPaginado, DatosCrearNodo, DatosCambiarEstadoAprobacion } from "../domain/plantilla.repository.port";
import type { Plantilla, PlantillaCompleta, NodoArbol } from "../domain/plantilla.entity";

/** Construye el árbol recursivo a partir de una lista plana de nodos — reutilizado por `certificacion.prisma-repository.ts`. */
export function construirArbolNodos(nodos: any[]): NodoArbol[] {
  const mapa = new Map<string, NodoArbol>();
  const raices: NodoArbol[] = [];

  for (const n of nodos) {
    mapa.set(n.id, {
      id: n.id, padreId: n.padreId ?? null, tipo: n.tipo, codigo: n.codigo,
      titulo: n.titulo, criterio: n.criterio ?? undefined, orden: n.orden, nivel: n.nivel,
      activo: n.activo, puntajeMaximo: Number(n.puntajeMaximo),
      tipoRespuesta: n.tipoRespuesta ?? undefined,
      modalidadPuntaje: n.modalidadPuntaje ?? undefined,
      reglaComentario: n.reglaComentario,
      evidenciaObligatoria: n.evidenciaObligatoria,
      evidenciaMinima: n.evidenciaMinima, evidenciaMaxima: n.evidenciaMaxima,
      opciones: (n.opciones ?? []).map((o: any) => ({
        id: o.id, etiqueta: o.etiqueta, criterio: o.criterio ?? undefined,
        puntaje: Number(o.puntaje), orden: o.orden,
      })),
      hijos: [],
    });
  }

  for (const nodo of mapa.values()) {
    if (!nodo.padreId) {
      raices.push(nodo);
    } else {
      const padre = mapa.get(nodo.padreId);
      if (padre) padre.hijos.push(nodo);
      else raices.push(nodo); // padre eliminado, promover a raíz
    }
  }

  const ordenar = (lista: NodoArbol[]) => {
    lista.sort((a, b) => a.orden - b.orden);
    lista.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);
  return raices;
}

export class PlantillaPrismaRepository implements PlantillaRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Utilidades privadas ──────────────────────────────────────────────────

  private mp(p: any): Plantilla {
    return {
      id: p.id, empresaId: p.empresaId, nombre: p.nombre, descripcion: p.descripcion ?? undefined,
      tipo: p.tipo, activa: p.activa, puntajeMaximo: Number(p.puntajeMaximo),
      fechaVigencia: p.fechaVigencia ?? undefined, observaciones: p.observaciones ?? undefined,
      version: p.version, creadoEn: p.creadoEn, actualizadoEn: p.actualizadoEn,
      estadoAprobacion: p.estadoAprobacion,
      solicitadoPorId: p.solicitadoPorId ?? null,
      solicitadoEn: p.solicitadoEn ?? null,
      aprobadorId: p.aprobadorId ?? null,
      resueltoEn: p.resueltoEn ?? null,
      comentarioResolucion: p.comentarioResolucion ?? null,
    };
  }

  /** Construye el árbol recursivo a partir de una lista plana de nodos. */
  private construirArbol(nodos: any[]): NodoArbol[] {
    const mapa = new Map<string, NodoArbol>();
    const raices: NodoArbol[] = [];

    for (const n of nodos) {
      mapa.set(n.id, {
        id: n.id, padreId: n.padreId ?? null, tipo: n.tipo, codigo: n.codigo,
        titulo: n.titulo, criterio: n.criterio ?? undefined, orden: n.orden, nivel: n.nivel,
        activo: n.activo, puntajeMaximo: Number(n.puntajeMaximo),
        tipoRespuesta: n.tipoRespuesta ?? undefined,
        modalidadPuntaje: n.modalidadPuntaje ?? undefined,
        reglaComentario: n.reglaComentario,
        evidenciaObligatoria: n.evidenciaObligatoria,
        evidenciaMinima: n.evidenciaMinima, evidenciaMaxima: n.evidenciaMaxima,
        opciones: (n.opciones ?? []).map((o: any) => ({
          id: o.id, etiqueta: o.etiqueta, criterio: o.criterio ?? undefined,
          puntaje: Number(o.puntaje), orden: o.orden,
        })),
        hijos: [],
      });
    }

    for (const nodo of mapa.values()) {
      if (!nodo.padreId) {
        raices.push(nodo);
      } else {
        const padre = mapa.get(nodo.padreId);
        if (padre) padre.hijos.push(nodo);
        else raices.push(nodo); // padre eliminado, promover a raíz
      }
    }

    const ordenar = (lista: NodoArbol[]) => {
      lista.sort((a, b) => a.orden - b.orden);
      lista.forEach((n) => ordenar(n.hijos));
    };
    ordenar(raices);
    return raices;
  }

  // ── Plantillas ───────────────────────────────────────────────────────────

  async listar(f: FiltrosPlantilla): Promise<ResultadoPaginado<Plantilla>> {
    const { empresaId, activa, tipo, pagina = 1, porPagina = 20 } = f;
    const where = { empresaId, ...(activa !== undefined && { activa }), ...(tipo && { tipo: tipo as any }) };
    const [items, total] = await Promise.all([
      this.prisma.inspeccionPlantilla.findMany({ where, orderBy: { creadoEn: "desc" }, skip: (pagina-1)*porPagina, take: porPagina }),
      this.prisma.inspeccionPlantilla.count({ where }),
    ]);
    return { items: items.map(this.mp), total, pagina, porPagina };
  }

  async obtenerCompleta(id: string, empresaId: string): Promise<PlantillaCompleta | null> {
    const [p, nodosFlat] = await Promise.all([
      this.prisma.inspeccionPlantilla.findFirst({ where: { id, empresaId }, include: { rangosResultado: { orderBy: { orden: "asc" } } } }),
      this.prisma.inspeccionNodo.findMany({ where: { plantillaId: id, empresaId, activo: true }, include: { opciones: { orderBy: { orden: "asc" } } }, orderBy: [{ nivel: "asc" }, { orden: "asc" }] }),
    ]);
    if (!p) return null;
    return {
      ...this.mp(p),
      nodos: this.construirArbol(nodosFlat),
      rangosResultado: p.rangosResultado.map((r: any) => ({ id: r.id, desde: Number(r.desde), hasta: Number(r.hasta), clasificacion: r.clasificacion, color: r.color, orden: r.orden })),
    };
  }

  async crear(datos: any): Promise<Plantilla> {
    return this.mp(await this.prisma.inspeccionPlantilla.create({ data: datos }));
  }

  async actualizar(id: string, _e: string, datos: any): Promise<Plantilla> {
    return this.mp(await this.prisma.inspeccionPlantilla.update({ where: { id }, data: datos }));
  }

  async cambiarEstado(id: string, _e: string, activa: boolean, usuarioId: string): Promise<Plantilla> {
    const p = await this.prisma.inspeccionPlantilla.update({ where: { id }, data: { activa } });
    await this.prisma.inspeccionAuditoria.create({ data: { plantillaId: id, usuarioId, tabla: "inspeccion_plantilla", registroId: id, accion: activa ? "ACTIVAR" : "DESACTIVAR", valorAntes: { activa: !activa }, valorDespues: { activa } } });
    return this.mp(p);
  }

  async eliminar(id: string, _e: string): Promise<void> {
    await this.prisma.inspeccionPlantilla.delete({ where: { id } });
  }

  async clonar(id: string, empresaId: string, nuevoNombre: string, usuarioId: string): Promise<PlantillaCompleta> {
    const original = await this.obtenerCompleta(id, empresaId);
    if (!original) throw new Error("Plantilla no encontrada");

    return this.prisma.$transaction(async (tx) => {
      const nueva = await tx.inspeccionPlantilla.create({
        data: { empresaId, nombre: nuevoNombre, descripcion: original.descripcion, tipo: original.tipo as any, activa: false, puntajeMaximo: original.puntajeMaximo, observaciones: original.observaciones, creadoPorId: usuarioId },
      });

      const clonarNodos = async (nodos: NodoArbol[], nuevoPadreId: string | null) => {
        for (const n of nodos) {
          const nuevo = await tx.inspeccionNodo.create({
            data: { empresaId, plantillaId: nueva.id, padreId: nuevoPadreId, tipo: n.tipo as any, codigo: n.codigo, titulo: n.titulo, criterio: n.criterio, orden: n.orden, nivel: n.nivel, tipoRespuesta: n.tipoRespuesta as any, modalidadPuntaje: n.modalidadPuntaje as any, puntajeMaximo: n.puntajeMaximo, reglaComentario: n.reglaComentario as any, evidenciaObligatoria: n.evidenciaObligatoria, evidenciaMinima: n.evidenciaMinima, evidenciaMaxima: n.evidenciaMaxima },
          });
          for (const o of n.opciones) {
            await tx.inspeccionNodoOpcion.create({ data: { nodoId: nuevo.id, etiqueta: o.etiqueta, criterio: o.criterio, puntaje: o.puntaje, orden: o.orden } });
          }
          await clonarNodos(n.hijos, nuevo.id);
        }
      };
      await clonarNodos(original.nodos, null);
      await tx.inspeccionAuditoria.create({ data: { plantillaId: nueva.id, usuarioId, tabla: "inspeccion_plantilla", registroId: nueva.id, accion: "CREAR", valorDespues: { clonDe: id } } });

      return (await this.obtenerCompleta(nueva.id, empresaId))!;
    });
  }

  // ── Nodos ────────────────────────────────────────────────────────────────

  async crearNodo(datos: DatosCrearNodo): Promise<NodoArbol> {
    const n = await this.prisma.inspeccionNodo.create({
      data: {
        empresaId: datos.empresaId, plantillaId: datos.plantillaId,
        padreId: datos.padreId ?? null, tipo: datos.tipo as any,
        codigo: datos.codigo, titulo: datos.titulo, criterio: datos.criterio,
        orden: datos.orden, nivel: datos.nivel,
        tipoRespuesta: (datos.tipoRespuesta ?? null) as any,
        modalidadPuntaje: (datos.modalidadPuntaje ?? null) as any,
        puntajeMaximo: datos.puntajeMaximo ?? 0,
        reglaComentario: (datos.reglaComentario ?? "NUNCA") as any,
        evidenciaObligatoria: datos.evidenciaObligatoria ?? false,
        evidenciaMinima: datos.evidenciaMinima ?? 0,
        evidenciaMaxima: datos.evidenciaMaxima ?? 5,
      },
      include: { opciones: true },
    });
    return this.construirArbol([n])[0]!;
  }

  async actualizarNodo(nodoId: string, _empresaId: string, datos: any): Promise<NodoArbol> {
    const n = await this.prisma.inspeccionNodo.update({
      where: { id: nodoId },
      data: { ...datos, tipo: datos.tipo as any, tipoRespuesta: datos.tipoRespuesta as any, modalidadPuntaje: datos.modalidadPuntaje as any, reglaComentario: datos.reglaComentario as any },
      include: { opciones: true },
    });
    return this.construirArbol([n])[0]!;
  }

  async contarHijosNodo(nodoId: string, _empresaId: string): Promise<number> {
    return this.prisma.inspeccionNodo.count({ where: { padreId: nodoId } });
  }

  async eliminarNodo(nodoId: string, _empresaId: string): Promise<void> {
    // La cascada en BD elimina todos los hijos recursivamente
    await this.prisma.inspeccionNodo.delete({ where: { id: nodoId } });
  }

  async reordenarNodos(items: { id: string; orden: number }[]): Promise<void> {
    await this.prisma.$transaction(
      items.map(({ id, orden }) => this.prisma.inspeccionNodo.update({ where: { id }, data: { orden } })),
    );
  }

  async guardarRangos(plantillaId: string, _empresaId: string, rangos: any[]): Promise<any[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.inspeccionRangoResultado.deleteMany({ where: { plantillaId } });
      if (rangos.length === 0) return [];
      await tx.inspeccionRangoResultado.createMany({
        data: rangos.map((r) => ({
          plantillaId,
          desde: r.desde,
          hasta: r.hasta,
          clasificacion: r.clasificacion,
          color: r.color,
          orden: r.orden,
        })),
      });
      const guardados = await tx.inspeccionRangoResultado.findMany({
        where: { plantillaId }, orderBy: { orden: "asc" },
      });
      return guardados.map((r: any) => ({
        id: r.id, desde: Number(r.desde), hasta: Number(r.hasta),
        clasificacion: r.clasificacion, color: r.color, orden: r.orden,
      }));
    });
  }

  // ── Aprobación (007-gobernanza-permisos-aprobacion) ────────────────────────

  async cambiarEstadoAprobacion(id: string, _empresaId: string, datos: DatosCambiarEstadoAprobacion): Promise<Plantilla> {
    const p = await this.prisma.inspeccionPlantilla.update({
      where: { id },
      data: {
        estadoAprobacion: datos.estadoAprobacion,
        solicitadoPorId: datos.solicitadoPorId,
        solicitadoEn: datos.solicitadoEn,
        aprobadorId: datos.aprobadorId,
        resueltoEn: datos.resueltoEn,
        comentarioResolucion: datos.comentarioResolucion,
      },
    });
    return this.mp(p);
  }

  async listarPendientesAprobacion(empresaId: string, pagina: number, porPagina: number): Promise<ResultadoPaginado<Plantilla>> {
    const where = { empresaId, estadoAprobacion: "EN_REVISION" as const };
    const [items, total] = await Promise.all([
      this.prisma.inspeccionPlantilla.findMany({ where, orderBy: { solicitadoEn: "asc" }, skip: (pagina - 1) * porPagina, take: porPagina }),
      this.prisma.inspeccionPlantilla.count({ where }),
    ]);
    return { items: items.map((p) => this.mp(p)), total, pagina, porPagina };
  }
}
