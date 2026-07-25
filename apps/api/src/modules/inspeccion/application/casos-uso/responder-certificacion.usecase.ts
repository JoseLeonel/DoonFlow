import {
  calcularPuntajeRespuesta,
  calcularResumen,
  calcularResumenPorSeccion,
  indexarNodosConRuta,
  puedeEditarRespuestas,
} from "../../domain/certificacion.entity";
import {
  ArchivoNoPermitidoError,
  CertificacionNoEditableError,
  InspeccionNoEncontradaError,
} from "../../domain/inspeccion.errors";
import { construirRutaAlmacenamiento, tamanoArchivoValido, tipoArchivoPermitido } from "../../domain/evidencia.entity";
import type { AlmacenamientoEvidenciasPort } from "../../domain/almacenamiento-evidencias.port";
import type { AlcanceConsulta, CertificacionRepositoryPort, FiltroCertificacion } from "../../domain/certificacion.repository.port";
import type { GuardarRespuestasSeccionInput } from "../certificacion.schema";

export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export class ResponderCertificacionUseCase {
  constructor(
    private readonly repo: CertificacionRepositoryPort,
    private readonly almacenamiento: AlmacenamientoEvidenciasPort,
  ) {}

  async guardarRespuestasSeccion(
    id: string,
    empresaId: string,
    input: GuardarRespuestasSeccionInput,
    alcance?: AlcanceConsulta,
  ) {
    const certificacion = await this.obtenerEditable(id, empresaId, alcance);
    const mapaNodos = indexarNodosConRuta(certificacion.plantilla.nodos);

    const datos = input.respuestas
      .map((r) => {
        const info = mapaNodos.get(r.nodoId);
        if (!info) return null;
        return {
          nodoId: r.nodoId,
          rutaCodigos: info.rutaCodigos,
          rutaTitulos: info.rutaTitulos,
          preguntaTitulo: info.nodo.titulo,
          criterioSnapshot: info.nodo.criterio ?? null,
          tipoRespuesta: info.nodo.tipoRespuesta ?? "TEXTO_LIBRE",
          valor: r.valor ?? null,
          valores: r.valores ?? [],
          comentarioReconocimiento: r.comentarioReconocimiento ?? null,
          comentarioObservacion: r.comentarioObservacion ?? null,
          comentarioOportunidadMejora: r.comentarioOportunidadMejora ?? null,
          puntajeObtenido: calcularPuntajeRespuesta(info.nodo, r.valor ?? undefined, r.valores),
          puntajeMaximo: info.nodo.puntajeMaximo,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return this.repo.guardarRespuestasSeccion(id, datos);
  }

  async adjuntarEvidenciaRespuesta(
    id: string,
    empresaId: string,
    detalleId: string,
    archivo: ArchivoSubido,
    alcance?: AlcanceConsulta,
  ) {
    await this.obtenerEditable(id, empresaId, alcance);

    if (!tipoArchivoPermitido(archivo.mimetype) || !tamanoArchivoValido(archivo.size)) {
      throw new ArchivoNoPermitidoError();
    }

    const ruta = construirRutaAlmacenamiento(empresaId, id, detalleId, archivo.originalname);
    const url = await this.almacenamiento.subirArchivo(ruta, archivo.buffer, archivo.mimetype);

    return this.repo.guardarEvidencia(id, detalleId, {
      tipo: archivo.mimetype,
      url,
      nombre: archivo.originalname,
      tamanoBytes: archivo.size,
    });
  }

  listar(filtro: FiltroCertificacion) {
    return this.repo.listar(filtro);
  }

  obtenerCompleta(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    return this.obtener(id, empresaId, alcance);
  }

  async obtenerResumen(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.obtener(id, empresaId, alcance);
    const resumen = calcularResumen(certificacion.detalles, certificacion.plantilla.puntajeMaximo, certificacion.plantilla.rangosResultado);
    const porSeccion = calcularResumenPorSeccion(certificacion.plantilla.nodos, certificacion.detalles);
    return { ...resumen, porSeccion };
  }

  private async obtener(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.repo.obtenerCompleta(id, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(id);
    return certificacion;
  }

  private async obtenerEditable(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.obtener(id, empresaId, alcance);
    if (!puedeEditarRespuestas(certificacion)) throw new CertificacionNoEditableError();
    return certificacion;
  }
}
