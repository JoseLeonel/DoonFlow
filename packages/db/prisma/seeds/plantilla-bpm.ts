/**
 * Seed: Ficha de Evaluación BPM — Ministerio de Salud Costa Rica
 *
 * Genera la plantilla oficial de 100 puntos con su árbol de nodos completo.
 * Basada en el Reglamento de Buenas Prácticas de Manufactura (Decreto N° 26012-S).
 * Usada por el módulo de Inspecciones de DoonFlow para evaluaciones MINISTERIO_SALUD.
 *
 * Totales por sección:
 *   1. Instalaciones Físicas        → 62 pts
 *   2. Equipos y Utensilios         →  3 pts
 *   3. Personal                     → 15 pts
 *   4. Control en Proceso           → 15 pts
 *   5. Almacenamiento y Distribución →  5 pts
 *   TOTAL                           → 100 pts
 */

import type { PrismaClient } from "@prisma/client";

const ID_PLANTILLA = "00000000-0000-0000-0001-000000000001";
const EMPRESA_DEMO_ID = "00000000-0000-0000-0000-000000000001";

// ── Árbol de definición de la ficha BPM ────────────────────────────────────────

interface DefNodo {
  codigo: string;
  titulo: string;
  tipo: "PANEL" | "PREGUNTA";
  puntajeMaximo?: number;
  hijos?: DefNodo[];
}

const ARBOL_BPM: DefNodo[] = [
  {
    codigo: "1",
    titulo: "Instalaciones Físicas",
    tipo: "PANEL",
    hijos: [
      {
        codigo: "1.1",
        titulo: "Alrededores y Ubicación",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.1.1",
            titulo: "Alrededores",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.1.1.a", titulo: "Alrededores limpios",               tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.1.1.b", titulo: "Ausencia de focos de contaminación", tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.1.2",
            titulo: "Ubicación",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.1.2.a", titulo: "Ubicación adecuada", tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
        ],
      },
      {
        codigo: "1.2",
        titulo: "Instalaciones Físicas",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.2.1",
            titulo: "Diseño",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.1.a", titulo: "Tamaño y construcción del edificio",      tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.1.b", titulo: "Protección contra el ambiente exterior",   tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.2.1.c", titulo: "Área para vestidores y comedor",           tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.1.d", titulo: "Distribución",                             tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.1.e", titulo: "Materiales de construcción",               tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.2.2",
            titulo: "Pisos",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.2.a", titulo: "Pisos impermeables",    tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.2.b", titulo: "Pisos sin grietas",     tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.2.c", titulo: "Uniones redondeadas",   tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.2.d", titulo: "Desagües suficientes",  tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.2.3",
            titulo: "Paredes",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.3.a", titulo: "Paredes exteriores adecuadas",  tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.3.b", titulo: "Paredes de proceso revestidas", tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.2.4",
            titulo: "Techos",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.4.a", titulo: "Techos sin acumulación de basura", tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.2.5",
            titulo: "Ventanas y Puertas",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.5.a", titulo: "Ventanas fáciles de limpiar",      tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.5.b", titulo: "Quicios de ventanas con pendiente", tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.5.c", titulo: "Puertas de superficie lisa",        tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.2.6",
            titulo: "Iluminación",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.6.a", titulo: "Intensidad de iluminación adecuada", tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.6.b", titulo: "Lámparas y accesorios adecuados",    tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.2.6.c", titulo: "Sin cables colgantes",               tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.2.7",
            titulo: "Ventilación",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.2.7.a", titulo: "Ventilación adecuada",                              tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.2.7.b", titulo: "Corriente de aire de zona limpia a contaminada",    tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
        ],
      },
      {
        codigo: "1.3",
        titulo: "Instalaciones Sanitarias",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.3.1",
            titulo: "Abastecimiento de Agua",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.3.1.a", titulo: "Abastecimiento de agua",                   tipo: "PREGUNTA", puntajeMaximo: 6 },
              { codigo: "1.3.1.b", titulo: "Sistema de agua no potable independiente", tipo: "PREGUNTA", puntajeMaximo: 2 },
            ],
          },
          {
            codigo: "1.3.2",
            titulo: "Tuberías",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.3.2.a", titulo: "Tuberías de tamaño y diseño adecuado",      tipo: "PREGUNTA", puntajeMaximo: 1 },
              { codigo: "1.3.2.b", titulo: "Tuberías diferenciadas por color o código", tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
        ],
      },
      {
        codigo: "1.4",
        titulo: "Manejo y Disposición de Desechos Líquidos",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.4.1",
            titulo: "Drenajes",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.4.1.a", titulo: "Drenajes e instalaciones de desagüe", tipo: "PREGUNTA", puntajeMaximo: 2 },
            ],
          },
          {
            codigo: "1.4.2",
            titulo: "Instalaciones Sanitarias",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.4.2.a", titulo: "Servicios sanitarios limpios y en buen estado",         tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.4.2.b", titulo: "Puertas sanitarias no abren hacia el área de proceso",  tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.4.2.c", titulo: "Vestidores y espejos adecuados",                        tipo: "PREGUNTA", puntajeMaximo: 1 },
            ],
          },
          {
            codigo: "1.4.3",
            titulo: "Instalaciones para Lavarse las Manos",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.4.3.a", titulo: "Lavamanos con agua caliente y fría",           tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.4.3.b", titulo: "Jabón, toallas desechables o secadores en lavamanos", tipo: "PREGUNTA", puntajeMaximo: 2 },
            ],
          },
        ],
      },
      {
        codigo: "1.5",
        titulo: "Manejo y Disposición de Desechos Sólidos",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.5.1",
            titulo: "Desechos Sólidos",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.5.1.a", titulo: "Manejo adecuado de desechos sólidos", tipo: "PREGUNTA", puntajeMaximo: 4 },
            ],
          },
        ],
      },
      {
        codigo: "1.6",
        titulo: "Limpieza y Desinfección",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.6.1",
            titulo: "Programa de Limpieza y Desinfección",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.6.1.a", titulo: "Programa escrito de limpieza y desinfección", tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.6.1.b", titulo: "Productos de limpieza aprobados",              tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.6.1.c", titulo: "Instalaciones adecuadas para limpieza",        tipo: "PREGUNTA", puntajeMaximo: 2 },
            ],
          },
        ],
      },
      {
        codigo: "1.7",
        titulo: "Control de Plagas",
        tipo: "PANEL",
        hijos: [
          {
            codigo: "1.7.1",
            titulo: "Programa de Control de Plagas",
            tipo: "PANEL",
            hijos: [
              { codigo: "1.7.1.a", titulo: "Programa escrito de control de plagas",           tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.7.1.b", titulo: "Productos químicos autorizados",                  tipo: "PREGUNTA", puntajeMaximo: 2 },
              { codigo: "1.7.1.c", titulo: "Almacenamiento de plaguicidas fuera del área",    tipo: "PREGUNTA", puntajeMaximo: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    codigo: "2",
    titulo: "Condiciones de los Equipos y Utensilios",
    tipo: "PANEL",
    hijos: [
      {
        codigo: "2.1",
        titulo: "Equipos y Utensilios",
        tipo: "PANEL",
        hijos: [
          { codigo: "2.1.a", titulo: "Equipo adecuado para el proceso",       tipo: "PREGUNTA", puntajeMaximo: 2 },
          { codigo: "2.1.b", titulo: "Programa de mantenimiento preventivo",   tipo: "PREGUNTA", puntajeMaximo: 1 },
        ],
      },
    ],
  },
  {
    codigo: "3",
    titulo: "Personal",
    tipo: "PANEL",
    hijos: [
      {
        codigo: "3.1",
        titulo: "Capacitación",
        tipo: "PANEL",
        hijos: [
          { codigo: "3.1.a", titulo: "Programa escrito de capacitación en BPM", tipo: "PREGUNTA", puntajeMaximo: 3 },
        ],
      },
      {
        codigo: "3.2",
        titulo: "Prácticas Higiénicas",
        tipo: "PANEL",
        hijos: [
          { codigo: "3.2.a", titulo: "Prácticas higiénicas adecuadas", tipo: "PREGUNTA", puntajeMaximo: 6 },
        ],
      },
      {
        codigo: "3.3",
        titulo: "Control de Salud",
        tipo: "PANEL",
        hijos: [
          { codigo: "3.3.a", titulo: "Control de salud adecuado", tipo: "PREGUNTA", puntajeMaximo: 6 },
        ],
      },
    ],
  },
  {
    codigo: "4",
    titulo: "Control en el Proceso y en la Producción",
    tipo: "PANEL",
    hijos: [
      {
        codigo: "4.1",
        titulo: "Materias Primas",
        tipo: "PANEL",
        hijos: [
          { codigo: "4.1.a", titulo: "Control y registro de potabilidad del agua", tipo: "PREGUNTA", puntajeMaximo: 3 },
          { codigo: "4.1.b", titulo: "Registro de control de materia prima",       tipo: "PREGUNTA", puntajeMaximo: 1 },
        ],
      },
      {
        codigo: "4.2",
        titulo: "Operaciones de Manufactura",
        tipo: "PANEL",
        hijos: [
          { codigo: "4.2.a", titulo: "Procedimientos de operación documentados", tipo: "PREGUNTA", puntajeMaximo: 5 },
        ],
      },
      {
        codigo: "4.3",
        titulo: "Envasado",
        tipo: "PANEL",
        hijos: [
          { codigo: "4.3.a", titulo: "Material de envasado en condiciones adecuadas", tipo: "PREGUNTA", puntajeMaximo: 4 },
        ],
      },
      {
        codigo: "4.4",
        titulo: "Documentación y Registro",
        tipo: "PANEL",
        hijos: [
          { codigo: "4.4.a", titulo: "Registros de elaboración y producción", tipo: "PREGUNTA", puntajeMaximo: 2 },
        ],
      },
    ],
  },
  {
    codigo: "5",
    titulo: "Almacenamiento y Distribución",
    tipo: "PANEL",
    hijos: [
      {
        codigo: "5.1",
        titulo: "Almacenamiento y Distribución",
        tipo: "PANEL",
        hijos: [
          { codigo: "5.1.a", titulo: "Materias primas y productos almacenados correctamente",    tipo: "PREGUNTA", puntajeMaximo: 1 },
          { codigo: "5.1.b", titulo: "Inspección periódica de materia prima y productos",        tipo: "PREGUNTA", puntajeMaximo: 1 },
          { codigo: "5.1.c", titulo: "Vehículos autorizados por autoridad competente",           tipo: "PREGUNTA", puntajeMaximo: 1 },
          { codigo: "5.1.d", titulo: "Carga y descarga fuera de los lugares de producción",     tipo: "PREGUNTA", puntajeMaximo: 1 },
          { codigo: "5.1.e", titulo: "Vehículos refrigerados autorizados",                      tipo: "PREGUNTA", puntajeMaximo: 1 },
        ],
      },
    ],
  },
];

// ── Función recursiva de creación de nodos ─────────────────────────────────────

async function crearNodos(
  prisma: PrismaClient,
  plantillaId: string,
  empresaId: string,
  nodos: DefNodo[],
  padreId: string | null,
  nivel: number,
): Promise<void> {
  for (let orden = 0; orden < nodos.length; orden++) {
    const def = nodos[orden]!;

    const esPregunta = def.tipo === "PREGUNTA";

    const nodo = await prisma.inspeccionNodo.create({
      data: {
        plantillaId,
        empresaId,
        padreId,
        tipo: def.tipo,
        codigo: def.codigo,
        titulo: def.titulo,
        orden,
        nivel,
        ...(esPregunta && {
          tipoRespuesta: "PUNTAJE_MANUAL",
          modalidadPuntaje: "MANUAL",
          puntajeMaximo: def.puntajeMaximo ?? 0,
          reglaComentario: "CUANDO_PUNTAJE_MENOR_MAXIMO",
        }),
      },
    });

    if (def.hijos && def.hijos.length > 0) {
      await crearNodos(prisma, plantillaId, empresaId, def.hijos, nodo.id, nivel + 1);
    }
  }
}

// ── Función principal exportada ────────────────────────────────────────────────

export async function sembrarPlantillaBPM(prisma: PrismaClient): Promise<void> {
  // Plantilla base (upsert para idempotencia)
  const plantilla = await prisma.inspeccionPlantilla.upsert({
    where:  { id: ID_PLANTILLA },
    // 007-gobernanza-permisos-aprobacion: puedeIniciarInspeccion() ahora exige estadoAprobacion="APROBADA"
    // además de activa/vigente — se fuerza también en `update` para aprobar retroactivamente la fila demo
    // ya creada por sesiones anteriores a este sprint (si no, el wizard de 015 dejaría de poder certificar).
    update: { estadoAprobacion: "APROBADA", resueltoEn: new Date() },
    create: {
      id:           ID_PLANTILLA,
      empresaId:    EMPRESA_DEMO_ID,
      nombre:       "Ficha BPM — Ministerio de Salud Costa Rica",
      tipo:         "MINISTERIO_SALUD",
      activa:       true,
      puntajeMaximo: 100,
      descripcion:  "Evaluación de Buenas Prácticas de Manufactura según el Decreto N° 26012-S del Ministerio de Salud de Costa Rica. Total: 100 puntos.",
      observaciones: "Aplicar en establecimientos de producción de alimentos. La calificación final determina el nivel de cumplimiento.",
      estadoAprobacion: "APROBADA",
      resueltoEn: new Date(),
    },
  });

  // Rangos de clasificación BPM
  const rangoExistente = await prisma.inspeccionRangoResultado.count({
    where: { plantillaId: plantilla.id },
  });

  if (rangoExistente === 0) {
    await prisma.inspeccionRangoResultado.createMany({
      data: [
        { plantillaId: plantilla.id, desde: 0,   hasta: 70.99, clasificacion: "No aprobado", color: "red",        orden: 0 },
        { plantillaId: plantilla.id, desde: 71,  hasta: 84.99, clasificacion: "Regular",     color: "naranja",    orden: 1 },
        { plantillaId: plantilla.id, desde: 85,  hasta: 100,   clasificacion: "Aprobado",    color: "green",      orden: 2 },
      ],
    });
  }

  // Nodos: solo crear si la plantilla no tiene nodos aún (idempotente)
  const nodoExistente = await prisma.inspeccionNodo.count({
    where: { plantillaId: plantilla.id },
  });

  if (nodoExistente === 0) {
    await crearNodos(prisma, plantilla.id, EMPRESA_DEMO_ID, ARBOL_BPM, null, 0);
  }

  const totalNodos = await prisma.inspeccionNodo.count({ where: { plantillaId: plantilla.id } });
  console.log(`✓ Plantilla BPM creada: "${plantilla.nombre}" (${totalNodos} nodos)`);
}
